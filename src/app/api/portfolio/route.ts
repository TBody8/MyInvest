import { NextRequest, NextResponse } from "next/server";
import {
  getAccountSummary,
  getPositions,
  getCashTransactions,
  clearApiCache,
} from "@/lib/trading212";
import {
  calculateRealProfit,
  computePortfolioMetrics,
  generateMonthlyHeatmap,
  fetchSp500PeriodReturn,
} from "@/lib/calculations";
import { buildRealPortfolioHistory, clearCandleCache } from "@/lib/marketHistory";
import { getRevolutPositions, getRevolutChartPoints } from "@/lib/revolut";
import { clearQuoteCache, getLiveEurUsdRate } from "@/lib/quotes";
import {
  calculatePreciseTWR,
  calculateMaxDrawdown,
  calculatePortfolioDiversification,
  getUpcomingEarnings,
} from "@/lib/analytics";
import prisma from "@/lib/db";
import { DashboardData, Timeframe, ChartPoint, BrokerFilter, T212Position, T212Transaction, PortfolioMetrics } from "@/types/trading212";

export const dynamic = "force-dynamic";

/**
 * Calcula la variación de hoy a partir del cambio porcentual de cada activo ponderado por su valor en EUR
 */
function computeDailyChangeFromPositions(
  positions: T212Position[],
  totalValue: number
): { amount: number; pct: number } {
  if (positions.length === 0 || totalValue <= 0) return { amount: 0, pct: 0 };

  let totalDeltaEur = 0;
  for (const pos of positions) {
    const val = pos.currentValue ?? ((pos.currentPrice || 0) * (pos.quantity || 0));
    const changePct = pos.dailyChangePct;
    if (val > 0 && changePct != null && Number.isFinite(changePct)) {
      // previousVal = val / (1 + changePct / 100)
      // delta = val - previousVal
      const prevVal = val / (1 + changePct / 100);
      totalDeltaEur += (val - prevVal);
    }
  }

  const prevTotal = totalValue - totalDeltaEur;
  const pct = prevTotal > 0 ? Number(((totalDeltaEur / prevTotal) * 100).toFixed(2)) : 0;
  return { amount: Number(totalDeltaEur.toFixed(2)), pct };
}

/**
 * Combina curvas de ambos brokers alineando estrictamente por FECHA/TIMESTAMP (con forward-fill para evitar caídas artificiales a cero)
 */
function mergeChartDataByDate(
  t212Points: ChartPoint[],
  revPoints: ChartPoint[],
  finalTotalValue: number,
  finalTotalInvested: number,
  finalRealProfit: number,
  timeframe: Timeframe
): ChartPoint[] {
  if (!t212Points || t212Points.length === 0) return revPoints || [];
  if (!revPoints || revPoints.length === 0) return t212Points || [];

  const isIntraday = timeframe === "D";
  const map = new Map<string, { t212?: ChartPoint; rev?: ChartPoint; order: number; date: string; fullDate: string }>();

  for (const pt of t212Points) {
    let key: string;
    if (isIntraday) {
      key = pt.timestamp ? String(Math.floor(pt.timestamp / (10 * 60 * 1000))) : pt.date;
    } else if (timeframe === "W" || timeframe === "M") {
      key = pt.timestamp ? new Date(pt.timestamp).toISOString().slice(0, 10) : pt.date;
    } else {
      key = pt.date;
    }
    const entry = map.get(key) || { order: pt.timestamp || 0, date: pt.date, fullDate: pt.fullDate };
    entry.t212 = pt;
    if (pt.timestamp && !entry.order) entry.order = pt.timestamp;
    map.set(key, entry);
  }

  for (const pt of revPoints) {
    let key: string;
    if (isIntraday) {
      key = pt.timestamp ? String(Math.floor(pt.timestamp / (10 * 60 * 1000))) : pt.date;
    } else if (timeframe === "W" || timeframe === "M") {
      key = pt.timestamp ? new Date(pt.timestamp).toISOString().slice(0, 10) : pt.date;
    } else {
      key = pt.date;
    }
    const entry = map.get(key) || { order: pt.timestamp || 0, date: pt.date, fullDate: pt.fullDate };
    entry.rev = pt;
    if (pt.timestamp && !entry.order) entry.order = pt.timestamp;
    map.set(key, entry);
  }

  const entries = Array.from(map.values()).sort((a, b) => a.order - b.order);

  // Mantenemos el último valor y coste conocidos de cada broker para no convertirlos en cero
  let lastT212Val = t212Points[0]?.totalValue ?? 0;
  let lastT212Inv = t212Points[0]?.totalInvested ?? 0;
  let lastRevVal = revPoints[0]?.totalValue ?? 0;
  let lastRevInv = revPoints[0]?.totalInvested ?? 0;

  return entries.map((entry, idx) => {
    if (entry.t212) {
      lastT212Val = entry.t212.totalValue;
      lastT212Inv = entry.t212.totalInvested;
    }
    if (entry.rev) {
      lastRevVal = entry.rev.totalValue;
      lastRevInv = entry.rev.totalInvested;
    }

    const isLast = idx === entries.length - 1;
    const totalInvested = isLast ? Number(finalTotalInvested.toFixed(2)) : Number((lastT212Inv + lastRevInv).toFixed(2));
    const totalValue = isLast ? Number(finalTotalValue.toFixed(2)) : Number((lastT212Val + lastRevVal).toFixed(2));
    const realProfit = isLast ? Number(finalRealProfit.toFixed(2)) : Number((totalValue - totalInvested).toFixed(2));
    const realProfitPct = totalInvested > 0 ? Number(((realProfit / totalInvested) * 100).toFixed(2)) : 0;

    let cleanFullDate = entry.rev?.fullDate || entry.t212?.fullDate || entry.fullDate;
    if (totalInvested > 0) {
      cleanFullDate = cleanFullDate.replace(/\s*\(Sin fondos[^)]*\)/gi, "").trim();
    }

    const tradeEvent = entry.rev?.tradeEvent || entry.t212?.tradeEvent;

    return {
      timestamp: entry.order || undefined,
      date: entry.rev?.date || entry.t212?.date || entry.date,
      fullDate: cleanFullDate,
      realProfit,
      realProfitPct,
      totalValue,
      totalInvested,
      tradeEvent,
    };
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const brokerParam = searchParams.get("broker") as BrokerFilter | null;
  const broker: BrokerFilter = brokerParam && ["all", "t212", "revolut"].includes(brokerParam)
    ? brokerParam
    : "all";

  const force = searchParams.get("force") === "true";
  if (force) {
    clearApiCache();
    clearCandleCache();
    clearQuoteCache();
  }

  try {
    const isApiKeyConfigured = Boolean(process.env.T212_API_KEY);
    const timeframes: Timeframe[] = ["D", "W", "M", "Y", "ALL"];

    // 1. OBTENER DATOS DE TRADING 212 (solo si broker !== "revolut")
    let t212Positions: T212Position[] = [];
    let t212TotalValue = 0;
    let t212Invested = 0;
    let t212RealProfit = 0;
    let t212RealProfitPct = 0;
    let t212ChartData: Record<Timeframe, ChartPoint[]> = {} as any;
    let transactions: T212Transaction[] = [];

    if (broker !== "revolut") {
      const [sumRes, posRes, txRes] = await Promise.all([
        getAccountSummary(force),
        getPositions(force),
        getCashTransactions(50, force),
      ]);
      transactions = txRes;

      const totalDeposited = transactions
        .filter((t) => t.type === "DEPOSIT")
        .reduce((acc, t) => acc + t.amount, 0);

      const totalWithdrawn = transactions
        .filter((t) => t.type === "WITHDRAW" || t.type === "WITHDRAWAL")
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

      t212Invested = totalDeposited - totalWithdrawn;
      const t212PositionsCost = posRes.reduce((acc, p) => acc + p.averagePrice * p.quantity, 0);
      if (t212Invested <= 0) {
        t212Invested = t212PositionsCost;
      }

      t212TotalValue = sumRes.total;
      const t212ProfitCalc = calculateRealProfit({
        totalValue: t212TotalValue,
        totalInvested: t212Invested,
      });
      t212RealProfit = t212ProfitCalc.realProfit;
      t212RealProfitPct = t212ProfitCalc.realProfitPct;

      const t212ChartResults = await Promise.all(
        timeframes.map(async (tf) => {
          const points = await buildRealPortfolioHistory(
            tf,
            posRes,
            transactions,
            t212TotalValue,
            t212Invested,
            t212RealProfit
          );
          return [tf, points] as [Timeframe, ChartPoint[]];
        })
      );
      t212ChartData = Object.fromEntries(t212ChartResults) as Record<Timeframe, ChartPoint[]>;

      t212Positions = posRes.map((p) => {
        const val = p.currentValue !== undefined ? p.currentValue : ((p.currentPrice || 0) * (p.quantity || 0));
        const cost = p.totalCost !== undefined ? p.totalCost : ((p.averagePrice || 0) * (p.quantity || 0));
        const ppl = p.ppl !== undefined ? p.ppl : (val - cost);
        const returnPct = cost > 0 ? (ppl / cost) * 100 : 0;
        const weightPct = t212TotalValue > 0 ? Math.min(100, (val / t212TotalValue) * 100) : 0;
        return {
          ...p,
          totalCost: Number(cost.toFixed(2)),
          currentValue: Number(val.toFixed(2)),
          ppl: Number(ppl.toFixed(2)),
          returnPct: Number(returnPct.toFixed(2)),
          weightPct: Number(weightPct.toFixed(2)),
          broker: "T212" as const,
        };
      });
    }

    // 2. OBTENER DATOS DE REVOLUT (solo si broker !== "t212")
    let revolutPositions: T212Position[] = [];
    let revolutTotalValue = 0;
    let revolutInvested = 0;
    let revolutProfit = 0;
    let revolutProfitPct = 0;
    let revolutChartData: Record<Timeframe, ChartPoint[]> = {} as any;

    if (broker !== "t212") {
      revolutPositions = await getRevolutPositions();
      revolutTotalValue = revolutPositions.reduce((acc, p) => acc + (p.currentValue || 0), 0);
      revolutInvested = revolutPositions.reduce((acc, p) => acc + (p.totalCost || 0), 0);
      revolutProfit = revolutTotalValue - revolutInvested;
      revolutProfitPct = revolutInvested > 0 ? (revolutProfit / revolutInvested) * 100 : 0;

      const revolutChartResults = await Promise.all(
        timeframes.map(async (tf) => {
          const points = await getRevolutChartPoints(tf, revolutTotalValue, revolutInvested, revolutPositions);
          return [tf, points] as [Timeframe, ChartPoint[]];
        })
      );
      revolutChartData = Object.fromEntries(revolutChartResults) as Record<Timeframe, ChartPoint[]>;
    }

    // 3. GENERAR RESPUESTA SEGÚN EL BROKER SELECCIONADO
    let finalPositions: T212Position[];
    let finalTotalValue: number;
    let finalTotalInvested: number;
    let finalRealProfit: number;
    let finalRealProfitPct: number;
    let finalChartData: Record<Timeframe, ChartPoint[]>;
    let finalDailyChange: { amount: number; pct: number };

    if (broker === "t212") {
      finalPositions = t212Positions;
      finalTotalValue = t212TotalValue;
      finalTotalInvested = t212Invested;
      finalRealProfit = t212RealProfit;
      finalRealProfitPct = t212RealProfitPct;
      finalChartData = t212ChartData;
      finalDailyChange = computeDailyChangeFromPositions(t212Positions, finalTotalValue);
    } else if (broker === "revolut") {
      finalPositions = revolutPositions;
      finalTotalValue = revolutTotalValue;
      finalTotalInvested = revolutInvested;
      finalRealProfit = revolutProfit;
      finalRealProfitPct = revolutProfitPct;
      finalChartData = revolutChartData;
      finalDailyChange = computeDailyChangeFromPositions(revolutPositions, finalTotalValue);
    } else {
      // "all" - TOTAL CONSOLIDADO (T212 + REVOLUT)
      finalTotalValue = t212TotalValue + revolutTotalValue;
      finalTotalInvested = t212Invested + revolutInvested;
      finalRealProfit = finalTotalValue - finalTotalInvested;
      finalRealProfitPct = finalTotalInvested > 0 ? (finalRealProfit / finalTotalInvested) * 100 : 0;

      // Combinar posiciones y recalcular pesos
      const mergedPositions = [...t212Positions, ...revolutPositions].map((p) => ({
        ...p,
        weightPct: finalTotalValue > 0 ? Number((((p.currentValue || 0) / finalTotalValue) * 100).toFixed(2)) : 0,
      }));
      mergedPositions.sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
      finalPositions = mergedPositions;

      // Combinar gráficos cronológicamente alineados por fecha
      const combinedCharts: Record<string, ChartPoint[]> = {};
      for (const tf of timeframes) {
        combinedCharts[tf] = mergeChartDataByDate(
          t212ChartData[tf] || [],
          revolutChartData[tf] || [],
          finalTotalValue,
          finalTotalInvested,
          finalRealProfit,
          tf
        );
      }
      finalChartData = combinedCharts as Record<Timeframe, ChartPoint[]>;
      finalDailyChange = computeDailyChangeFromPositions(finalPositions, finalTotalValue);
    }

    const allChartPoints = finalChartData["ALL"] || [];
    const hasActiveFunds = finalTotalInvested > 0 || finalTotalValue > 0;

    // Calcular TWR puro matemático
    const preciseTwr = hasActiveFunds
      ? calculatePreciseTWR(allChartPoints, finalTotalValue, finalTotalInvested)
      : 0;

    // Calcular MDD
    const mdd = hasActiveFunds ? calculateMaxDrawdown(allChartPoints) : 0;

    // Calcular Diversificación estructural HHI
    const diversification = calculatePortfolioDiversification(finalPositions);

    // Comparativa real con el índice S&P 500 (^GSPC)
    const sp500Benchmark = hasActiveFunds ? await fetchSp500PeriodReturn() : null;

    const baseMetrics = computePortfolioMetrics(
      finalPositions,
      finalTotalValue,
      allChartPoints,
      sp500Benchmark
    );

    const metrics: PortfolioMetrics = {
      ...baseMetrics,
      twr: preciseTwr,
      sp500Comparison: baseMetrics.sp500Comparison,
      maxDrawdown: mdd,
      diversification,
    };

    // Enriquecer posiciones con avisos de Earnings próximos dinámicos
    const enrichedPositions = await Promise.all(
      finalPositions.map(async (pos) => {
        const earnings = await getUpcomingEarnings(pos.ticker);
        return {
          ...pos,
          nextEarningsDate: earnings?.date,
          earningsEstimate: earnings?.estimate,
        };
      })
    );

    // Reconstruir heatmap mensual a partir de la evolución histórica real
    const heatmapSnapshots = allChartPoints
      .filter((p) => p.totalInvested > 0)
      .map((p) => ({
        date: p.timestamp ? new Date(p.timestamp) : new Date(),
        totalValue: p.totalValue,
        realProfit: p.realProfit,
      }));

    const heatmap = generateMonthlyHeatmap(
      heatmapSnapshots.length > 0
        ? heatmapSnapshots
        : [{ date: new Date(), totalValue: finalTotalValue, realProfit: finalRealProfit }]
    );

    const liveFxRate = await getLiveEurUsdRate();

    const payload: DashboardData = {
      accountSummary: {
        totalValue: Number(finalTotalValue.toFixed(2)),
        totalInvested: Number(finalTotalInvested.toFixed(2)),
        realProfit: Number(finalRealProfit.toFixed(2)),
        realProfitPct: Number(finalRealProfitPct.toFixed(2)),
        unrealizedProfit: Number(finalRealProfit.toFixed(2)),
        dailyChange: finalDailyChange,
      },
      metrics,
      positions: enrichedPositions,
      chartData: finalChartData,
      heatmap,
      transactions: transactions.slice(0, 20),
      isDemoData: broker !== "revolut" && !isApiKeyConfigured,
      lastUpdated: new Date().toISOString(),
      broker,
      eurUsdRate: liveFxRate,
    };

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[API /api/portfolio] Full Error:", err);
    return NextResponse.json(
      { error: "Error al obtener datos del portfolio", details: errorMsg },
      { status: 500 }
    );
  }
}
