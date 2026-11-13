import prisma from "@/lib/db";
import { fetchMultipleQuotes, fetchNativeQuote, getEurConversionRate } from "@/lib/quotes";
import { T212Position, Timeframe, ChartPoint } from "@/types/trading212";
import { getRealMarketCandles, getRollingTradingDays, CandleItem } from "@/lib/marketHistory";
import { addPurchase, readLedger, PurchaseInput, PurchaseValidationError, validatePurchase } from "./revolutAccounting";
import { formatEur } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

interface RevolutTradeItem {
  timestamp: number;
  date: string;
  ticker: string;
  totalEur: number;
}

let cachedRevolutTrades: RevolutTradeItem[] | null = null;

function getRevolutTrades(): RevolutTradeItem[] {
  if (cachedRevolutTrades) return cachedRevolutTrades;
  const trades: RevolutTradeItem[] = [];

  try {
    const csvPath = path.resolve(process.cwd(), "trading-account-statement_2026-06-10_2026-11-03_en_129c4e.csv");
    if (fs.existsSync(csvPath)) {
      const text = fs.readFileSync(csvPath, "utf8");
      const lines = text.trim().split(/\r?\n/);
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",");
        const type = parts[2]?.toUpperCase() || "";
        if (type.includes("BUY")) {
          const rawDate = parts[0];
          const ticker = parts[1]?.trim().toUpperCase() || "";
          const totalStr = parts[5]?.replace(/[A-Za-z\s€$£]/g, "") || "0";
          const fx = parseFloat(parts[7]) || 1;
          const totalEur = parseFloat(totalStr) / fx;
          const parsed = new Date(rawDate);
          if (Number.isFinite(parsed.getTime())) {
            trades.push({
              timestamp: parsed.getTime(),
              date: rawDate.slice(0, 10),
              ticker,
              totalEur: Number(totalEur.toFixed(2)),
            });
          }
        }
      }
    }
  } catch {
    // Si no está disponible el archivo CSV se usará la información de la base de datos
  }

  trades.sort((a, b) => a.timestamp - b.timestamp);
  cachedRevolutTrades = trades;
  return trades;
}

function getRevolutInvestedUpTo(trades: RevolutTradeItem[], cutoffMs: number, totalCost: number): number {
  if (trades.length === 0) return totalCost;
  const lastTradeTime = trades[trades.length - 1]?.timestamp || 0;
  // Si la fecha de corte es posterior al último hito de compra del extracto, el capital invertido es el coste real actual
  if (cutoffMs >= lastTradeTime) {
    return totalCost;
  }
  let invested = 0;
  for (const t of trades) {
    if (t.timestamp <= cutoffMs) {
      invested += t.totalEur;
    }
  }
  return Number(Math.min(totalCost, invested).toFixed(2));
}

export async function getRevolutPositions(): Promise<T212Position[]> {
  const positions = await prisma.revolutPosition.findMany({ orderBy: { ticker: "asc" } });
  const quotes = await fetchMultipleQuotes(positions.map(p => p.ticker));
  const result = positions.map(p => {
    const quote = quotes.get(p.ticker.toUpperCase());
    if (!quote) throw new Error(`Cotización no disponible: ${p.ticker}`);
    const totalCost = p.quantity * p.averagePrice;
    const currentValue = p.quantity * quote.price;
    const ledger = readLedger(p);
    const dates = ledger.baseline.quantity === 0 && !ledger.corrections?.length ? ledger.purchases.map(x => x.date).sort() : [];
    return { ticker: p.ticker, name: p.name || quote.name, quantity: p.quantity,
      averagePrice: p.averagePrice, currentPrice: quote.price, nativeCurrentPrice: quote.nativePrice, priceCurrency: quote.nativeCurrency, totalCost, currentValue,
      ppl: currentValue - totalCost, returnPct: totalCost > 0 ? (currentValue / totalCost - 1) * 100 : 0,
      dailyChangePct: quote.changePct, initialFillDate: dates[0], broker: "REVOLUT" as const };
  });
  const total = result.reduce((sum, p) => sum + p.currentValue, 0);
  return result.map(p => ({ ...p, weightPct: total > 0 ? p.currentValue / total * 100 : 0 }));
}

export async function saveRevolutPosition(raw: PurchaseInput): Promise<{ newQuantity: number; newAveragePrice: number }> {
  const input = validatePurchase({ ...raw });
  const quote = input.isEdit ? null : await fetchNativeQuote(input.ticker);
  if (quote && quote.currency !== input.currency) throw new PurchaseValidationError(`La cotización seleccionada utiliza ${quote.currency}`);
  const rate = input.currency === "EUR" ? 1 : await getEurConversionRate(input.currency, input.fillDate);
  const purchasePrice = input.averagePrice * rate;
  // Serialize the read/modify/write in SQLite; network requests stay outside the
  // transaction. Retry transient conflicts from a fresh database read.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const existing = await tx.revolutPosition.findUnique({ where: { ticker: input.ticker } });
        if (input.isEdit && !existing) throw new PurchaseValidationError("La posición que intentas editar ya no existe");
        const ledger = readLedger(existing || { quantity: 0, averagePrice: 0 });
        if (input.requestId && ledger.purchases.some(p => p.id === input.requestId)) {
          return { newQuantity: existing!.quantity, newAveragePrice: existing!.averagePrice };
        }
        const next = input.isEdit ? { quantity: input.quantity, averagePrice: input.averagePrice }
          : addPurchase(existing?.quantity || 0, existing?.averagePrice || 0, input.quantity, purchasePrice);
        if (input.isEdit) {
          // A position correction cannot invent the dates of its constituent trades.
          ledger.corrections = [...(ledger.corrections || []), { date: new Date().toISOString(), quantity: next.quantity, averagePrice: next.averagePrice }];
        } else {
          ledger.purchases.push({ id: input.requestId || randomUUID(), date: input.fillDate,
            quantity: input.quantity, price: input.averagePrice, currency: input.currency,
            eurPerUnit: rate, costEur: input.quantity * purchasePrice });
        }
        await tx.revolutPosition.upsert({ where: { ticker: input.ticker },
          create: { ticker: input.ticker, ...next, name: input.name || quote?.name || input.ticker, notes: JSON.stringify(ledger) },
          update: { ...next, name: input.name || existing?.name || quote?.name, notes: JSON.stringify(ledger) } });
        return { newQuantity: next.quantity, newAveragePrice: next.averagePrice };
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (attempt === 4 || !["P2034", "P2028", "P1008", "P2002"].includes(code || "")) throw error;
    }
  }
  throw new Error("No se pudo guardar la compra; vuelve a intentarlo");
}

export async function deleteRevolutPosition(ticker: string): Promise<void> {
  await prisma.revolutPosition.delete({ where: { ticker: ticker.trim().toUpperCase() } });
}

export async function getRevolutChartPoints(
  timeframe: Timeframe,
  totalValue: number,
  totalCost: number,
  positions: T212Position[] = []
): Promise<ChartPoint[]> {
  const points: ChartPoint[] = [];
  const now = new Date();

  // 1. Si no hay fondos ni posiciones en Revolut: línea plana en 0.00 €
  if (totalValue === 0 && totalCost === 0) {
    const tradingDays = getRollingTradingDays(timeframe === "W" ? 7 : 30);
    for (const d of tradingDays) {
      points.push({
        timestamp: d.getTime(),
        date: format(d, "d MMM", { locale: es }),
        fullDate: `${format(d, "EEEE, d 'de' MMMM", { locale: es })} (Sin fondos en Revolut)`,
        realProfit: 0.0,
        realProfitPct: 0.0,
        totalValue: 0.0,
        totalInvested: 0.0,
      });
    }
    return points;
  }

  const trades = getRevolutTrades();
  const firstTradeTime = trades.length > 0 ? trades[0].timestamp : 0;

  // Activo representativo de Revolut con alta liquidez (NVDA o primer holding)
  const primaryHolding = positions.find((p) => p.ticker === "NVDA") || positions[0];
  const realCandles = primaryHolding?.ticker
    ? await getRealMarketCandles(primaryHolding.ticker, timeframe)
    : [];
  const lastCandlePrice = realCandles.length > 0 ? realCandles[realCandles.length - 1].close : 0;

  const primaryWeight = totalValue > 0 && primaryHolding?.currentValue
    ? Math.max(0.1, Math.min(1.0, primaryHolding.currentValue / totalValue))
    : 0.2;

  // 1D: Ventana de trading activa en alta definición de la última sesión
  if (timeframe === "D") {
    const latestTs = realCandles[realCandles.length - 1]?.timestamp;
    const latestDate = latestTs ? new Date(latestTs) : now;
    const sessionCandles = realCandles.filter((c) => {
      const d = new Date(c.timestamp);
      return (
        d.getDate() === latestDate.getDate() &&
        d.getMonth() === latestDate.getMonth() &&
        d.getFullYear() === latestDate.getFullYear()
      );
    });

    const candlesToUse = sessionCandles.length > 0 ? sessionCandles : realCandles;
    const sampleCount = Math.min(32, Math.max(16, candlesToUse.length));
    const step = Math.max(1, Math.floor(candlesToUse.length / sampleCount));
    const sampledCandles: CandleItem[] = [];

    for (let i = 0; i < candlesToUse.length; i += step) {
      sampledCandles.push(candlesToUse[i]);
    }
    if (candlesToUse.length > 0 && sampledCandles[sampledCandles.length - 1] !== candlesToUse[candlesToUse.length - 1]) {
      sampledCandles.push(candlesToUse[candlesToUse.length - 1]);
    }

    for (let i = 0; i < sampledCandles.length; i++) {
      const candle = sampledCandles[i];
      const ptDate = new Date(candle.timestamp);
      const hourStr = `${String(ptDate.getHours()).padStart(2, "0")}:${String(ptDate.getMinutes()).padStart(2, "0")}`;
      const isToday = ptDate.getDate() === now.getDate() && ptDate.getMonth() === now.getMonth();
      const fullDate = `${isToday ? "Hoy" : format(ptDate, "d MMM", { locale: es })}, ${hourStr}`;

      const isLast = i === sampledCandles.length - 1;
      let val = totalValue;
      if (!isLast && lastCandlePrice > 0) {
        const singleStockReturn = (candle.close - lastCandlePrice) / lastCandlePrice;
        val = Number((totalValue * (1 + singleStockReturn * primaryWeight)).toFixed(2));
      }

      const prof = isLast ? Number((totalValue - totalCost).toFixed(2)) : Number((val - totalCost).toFixed(2));
      const profPct = totalCost > 0 ? Number(((prof / totalCost) * 100).toFixed(2)) : 0;

      points.push({
        timestamp: candle.timestamp,
        date: hourStr,
        fullDate,
        realProfit: prof,
        realProfitPct: profPct,
        totalValue: isLast ? totalValue : val,
        totalInvested: Number(totalCost.toFixed(2)),
      });
    }

    return points;
  }

  // 1S & 1M: Días de mercado hábiles sin fines de semana
  if (timeframe === "W" || timeframe === "M") {
    const daysCount = timeframe === "W" ? 7 : 30;
    const tradingDays = getRollingTradingDays(daysCount);

    for (let i = 0; i < tradingDays.length; i++) {
      const ptDate = tradingDays[i];
      const isRealToday =
        ptDate.getDate() === now.getDate() &&
        ptDate.getMonth() === now.getMonth() &&
        ptDate.getFullYear() === now.getFullYear();

      const dateLabel = isRealToday ? "Hoy" : format(ptDate, "d MMM", { locale: es });
      const fullDate = format(ptDate, "EEEE, d 'de' MMMM", { locale: es });
      const dayEndMs = new Date(ptDate.getFullYear(), ptDate.getMonth(), ptDate.getDate(), 23, 59, 59).getTime();

      if (firstTradeTime > 0 && dayEndMs < firstTradeTime) {
        points.push({
          timestamp: ptDate.getTime(),
          date: dateLabel,
          fullDate: `${fullDate} (Sin fondos en Revolut)`,
          realProfit: 0.0,
          realProfitPct: 0.0,
          totalValue: 0.0,
          totalInvested: 0.0,
        });
        continue;
      }

      const investedAtDay = getRevolutInvestedUpTo(trades, dayEndMs, totalCost);
      const isLast = i === tradingDays.length - 1 || isRealToday;

      let val = totalValue;
      let prof = totalValue - totalCost;

      if (!isLast && lastCandlePrice > 0) {
        const dayCandles = realCandles.filter((c) => {
          const d = new Date(c.timestamp);
          return d.getDate() === ptDate.getDate() && d.getMonth() === ptDate.getMonth();
        });
        if (dayCandles.length > 0) {
          const closePrice = dayCandles[dayCandles.length - 1].close;
          const returnPct = (closePrice - lastCandlePrice) / lastCandlePrice;
          const baseCap = investedAtDay > 0 ? (investedAtDay / (totalCost || 1)) * totalValue : 0;
          val = Number((baseCap * (1 + returnPct * primaryWeight)).toFixed(2));
          prof = Number((val - investedAtDay).toFixed(2));
        } else {
          val = investedAtDay;
          prof = 0;
        }
      } else if (isLast) {
        val = totalValue;
        prof = totalValue - totalCost;
      }

      // Detectar operaciones en este día concreto
      let tradeEvent: { type: "BUY" | "SELL"; label: string } | undefined = undefined;
      const dayStartMs = new Date(ptDate.getFullYear(), ptDate.getMonth(), ptDate.getDate(), 0, 0, 0).getTime();
      const buysToday = trades.filter((t) => t.timestamp >= dayStartMs && t.timestamp <= dayEndMs);

      if (buysToday.length > 0) {
        const tickers = Array.from(new Set(buysToday.map((t) => t.ticker))).join(", ");
        const sumEur = buysToday.reduce((acc, t) => acc + t.totalEur, 0);
        tradeEvent = { type: "BUY", label: `Compra ${tickers}: +${formatEur(sumEur)}` };
      }

      const finalVal = isLast ? totalValue : val;
      const finalInv = isLast ? totalCost : investedAtDay;
      const finalProf = isLast ? Number((totalValue - totalCost).toFixed(2)) : prof;
      const finalProfPct = finalInv > 0 ? Number(((finalProf / finalInv) * 100).toFixed(2)) : 0;

      points.push({
        timestamp: ptDate.getTime(),
        date: dateLabel,
        fullDate,
        realProfit: finalProf,
        realProfitPct: finalProfPct,
        totalValue: Number(finalVal.toFixed(2)),
        totalInvested: Number(finalInv.toFixed(2)),
        tradeEvent,
      });
    }

    return points;
  }

  // 1A & ALL: Meses calendario
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const monthFullNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const firstDate = firstTradeTime > 0 ? new Date(firstTradeTime) : now;
  const startYear = timeframe === "ALL" ? firstDate.getFullYear() : currentYear;
  const startMonth = timeframe === "ALL" ? Math.max(0, firstDate.getMonth() - 1) : 0;

  for (let y = startYear; y <= currentYear; y++) {
    const endM = y === currentYear ? currentMonth : 11;
    const initialM = y === startYear ? startMonth : 0;

    for (let m = initialM; m <= endM; m++) {
      const monthEndMs = new Date(y, m + 1, 0, 23, 59, 59).getTime();
      const label = timeframe === "ALL" ? `${monthNames[m]} '${String(y).slice(2)}` : monthNames[m];
      const fullLabel = `${monthFullNames[m]} ${y}`;

      if (firstTradeTime > 0 && monthEndMs < firstTradeTime) {
        points.push({
          timestamp: new Date(y, m, 1).getTime(),
          date: label,
          fullDate: `${fullLabel} (Sin fondos en Revolut)`,
          realProfit: 0.0,
          realProfitPct: 0.0,
          totalValue: 0.0,
          totalInvested: 0.0,
        });
        continue;
      }

      const isCurrentMonth = y === currentYear && m === currentMonth;
      const investedAtMonth = isCurrentMonth ? totalCost : getRevolutInvestedUpTo(trades, monthEndMs, totalCost);
      const val = isCurrentMonth ? totalValue : investedAtMonth;
      const prof = isCurrentMonth ? Number((totalValue - totalCost).toFixed(2)) : 0;
      const profPct = investedAtMonth > 0 ? Number(((prof / investedAtMonth) * 100).toFixed(2)) : 0;

      let tradeEvent: { type: "BUY" | "SELL"; label: string } | undefined = undefined;
      const monthStartMs = new Date(y, m, 1, 0, 0, 0).getTime();
      const monthBuys = trades.filter((t) => t.timestamp >= monthStartMs && t.timestamp <= monthEndMs);

      if (monthBuys.length > 0) {
        const tickers = Array.from(new Set(monthBuys.map((t) => t.ticker))).join(", ");
        const sumEur = monthBuys.reduce((acc, t) => acc + t.totalEur, 0);
        tradeEvent = { type: "BUY", label: `Compra ${tickers}: +${formatEur(sumEur)}` };
      }

      points.push({
        timestamp: new Date(y, m, 15).getTime(),
        date: label,
        fullDate: fullLabel,
        realProfit: Number(prof.toFixed(2)),
        realProfitPct: profPct,
        totalValue: Number(val.toFixed(2)),
        totalInvested: Number(investedAtMonth.toFixed(2)),
        tradeEvent,
      });
    }
  }

  return points;
}
