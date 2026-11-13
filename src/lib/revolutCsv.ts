import { PurchaseValidationError, localToday } from "./revolutAccounting";

export function parseCsv(text: string): string[][] {
  const delimiter = text.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",";
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted;
    } else if (c === delimiter && !quoted) { row.push(field.trim()); field = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (quoted) throw new PurchaseValidationError("CSV con comillas sin cerrar");
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

function amount(text: string): number {
  let clean = text.replace(/[A-Za-z\s€$£]/g, "");
  if (clean.includes(",") && clean.includes(".")) clean = clean.replace(/,/g, "");
  else clean = clean.replace(",", ".");
  if (!/^[+-]?\d*\.?\d+$/.test(clean)) return NaN;
  return Number(clean);
}

export interface ImportedTrade { date: string; executedAt: string; ticker: string; type: "BUY" | "SELL"; quantity: number; totalEur: number; currency: string; fxRate: number }

export function parseTradingStatement(text: string): Map<string, { quantity: number; averagePrice: number; trades: ImportedTrade[] }> {
  const [header, ...rows] = parseCsv(text);
  if (!header || rows.length === 0) throw new PurchaseValidationError("El CSV no contiene operaciones");
  const h = header.map(x => x.replace(/^\uFEFF/, "").toLowerCase());
  const column = (pattern: RegExp) => h.findIndex(x => pattern.test(x));
  const tickerCol = column(/ticker|symbol|símbolo|simbolo/);
  const typeCol = column(/^type$|^tipo$|activity/);
  const qtyCol = column(/quantity|cantidad|^shares$|acciones/);
  const totalCol = column(/total amount|importe|^total$/);
  const currencyCol = column(/currency|divisa/);
  const fxCol = column(/fx|cambio/);
  const dateCol = column(/^date$|fecha/);
  if ([tickerCol, typeCol, qtyCol, totalCol, currencyCol, dateCol].some(x => x < 0)) throw new PurchaseValidationError("Importa el Trading Account Statement con fecha, ticker, tipo, cantidad, importe y divisa");
  const trades: ImportedTrade[] = [];
  for (const [i, row] of rows.entries()) {
    const type = row[typeCol]?.toUpperCase() || "";
    const isBuy = /BUY|COMPRA/.test(type); const isSell = /SELL|VENTA/.test(type);
    if (!isBuy && !isSell) {
      if (row[tickerCol] && /SPLIT|MERGER|SPIN/.test(type)) throw new PurchaseValidationError(`Acción corporativa en fila ${i + 2}: requiere conciliación antes de importar`);
      continue;
    }
    const ticker = row[tickerCol]?.trim().toUpperCase();
    const quantity = amount(row[qtyCol] || "");
    const total = Math.abs(amount(row[totalCol] || ""));
    const currency = row[currencyCol]?.trim().toUpperCase();
    const fxRate = currency === "EUR" ? 1 : amount(row[fxCol] || "");
    const date = row[dateCol]?.slice(0, 10);
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (!/^[A-Z0-9][A-Z0-9.^_-]{0,39}$/.test(ticker || "") || ![quantity, total, fxRate].every(x => Number.isFinite(x) && x > 0)
      || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date || date > localToday() || !/^[A-Z]{3}$/.test(currency || "")) {
      throw new PurchaseValidationError(`Datos inválidos o cambio histórico ausente en fila ${i + 2}`);
    }
    const executed = new Date(row[dateCol]);
    if (!Number.isFinite(executed.getTime())) throw new PurchaseValidationError(`Fecha inválida en fila ${i + 2}`);
    trades.push({ ticker, date, executedAt: executed.toISOString(), type: isSell ? "SELL" : "BUY", quantity, totalEur: total / fxRate, currency, fxRate });
  }
  if (!trades.length) throw new PurchaseValidationError("No se encontraron compras o ventas");
  trades.sort((a, b) => a.executedAt.localeCompare(b.executedAt));
  const positions = new Map<string, { quantity: number; averagePrice: number; trades: ImportedTrade[] }>();
  for (const trade of trades) {
    const p = positions.get(trade.ticker) || { quantity: 0, averagePrice: 0, trades: [] };
    if (trade.type === "SELL") {
      if (trade.quantity > p.quantity + 1e-9) throw new PurchaseValidationError(`El extracto no contiene las compras previas de ${trade.ticker}; importa el historial completo`);
      p.quantity = Math.max(0, p.quantity - trade.quantity);
    } else {
      p.averagePrice = (p.quantity * p.averagePrice + trade.totalEur) / (p.quantity + trade.quantity);
      p.quantity += trade.quantity;
    }
    p.trades.push(trade); positions.set(trade.ticker, p);
  }
  return positions;
}
