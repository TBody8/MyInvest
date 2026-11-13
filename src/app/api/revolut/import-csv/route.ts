import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { parseTradingStatement } from "@/lib/revolutCsv";
import { PurchaseValidationError, readLedger } from "@/lib/revolutAccounting";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body.csv !== "string" || body.csv.length > 5_000_000) throw new PurchaseValidationError("CSV no válido o demasiado grande");
    const positions = parseTradingStatement(body.csv);
    const hash = createHash("sha256").update(body.csv).digest("hex");
    const importedTickers = await prisma.$transaction(async tx => {
      const key = `revolut-import:${hash}`;
      if (await tx.appSetting.findUnique({ where: { key } })) return [];
      const tickers: string[] = [];
      for (const [ticker, p] of positions) {
        const previous = await tx.revolutPosition.findUnique({ where: { ticker } });
        if (previous && readLedger(previous).purchases.some(buy => buy.date > p.trades[p.trades.length - 1].date)) {
          throw new PurchaseValidationError(`Hay compras de ${ticker} posteriores al extracto; importa uno actualizado`);
        }
        // Keep the previous record and full imported trade details for reconciliation.
        const notes = JSON.stringify({ version: 2, baseline: { quantity: p.quantity, costEur: p.quantity * p.averagePrice },
          purchases: [], importedTrades: p.trades, sourceHash: hash, legacyNotes: previous?.notes || null });
        if (p.quantity > 1e-10) {
          await tx.revolutPosition.upsert({ where: { ticker },
            create: { ticker, quantity: p.quantity, averagePrice: p.averagePrice, notes },
            update: { quantity: p.quantity, averagePrice: p.averagePrice, notes } });
          tickers.push(ticker);
        } else {
          await tx.appSetting.upsert({ where: { key: `revolut-closed:${hash}:${ticker}` },
            create: { key: `revolut-closed:${hash}:${ticker}`, value: notes }, update: { value: notes } });
          await tx.revolutPosition.deleteMany({ where: { ticker } });
        }
      }
      await tx.appSetting.create({ data: { key, value: JSON.stringify({ importedAt: new Date().toISOString(), tickers }) } });
      return tickers;
    });
    return NextResponse.json({ success: true, importedCount: importedTickers.length, importedTickers,
      message: importedTickers.length ? `${importedTickers.length} posiciones conciliadas con el extracto completo.` : "Este extracto ya estaba importado o solo contiene posiciones cerradas." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error al importar" }, { status: error instanceof PurchaseValidationError || error instanceof SyntaxError ? 400 : 500 });
  }
}
