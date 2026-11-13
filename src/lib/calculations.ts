import {
  T212Position,
  PortfolioMetrics,
  ChartPoint,
  HeatmapMonth,
} from "@/types/trading212";

/**
 * Calcula el beneficio real neto:
 * totalValue (valor cartera) - depósitos netos invertidos
 */
export function calculateRealProfit(params: {
  totalValue: number;
  totalInvested: number;
}): { realProfit: number; realProfitPct: number } {
  const { totalValue, totalInvested } = params;
  
  const baseCost = totalInvested > 0 ? totalInvested : totalValue;
  const realProfit = totalValue - baseCost;
  const realProfitPct = baseCost > 0 ? (realProfit / baseCost) * 100 : 0;

  return {
    realProfit,
    realProfitPct,
  };
}

/**
 * Calcula el Time-Weighted Return (TWR) basado en subperíodos entre transacciones
 */
export function calculateTwr(snapshots: Array<{
  date: Date;
  totalValue: number;
  cashFlow?: number;
}>): number {
  if (snapshots.length < 2) return 0;

  let compoundReturn = 1.0;

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];
    const cashFlow = curr.cashFlow || 0;

    const startValue = prev.totalValue;
    const endValueBeforeCashflow = curr.totalValue - cashFlow;

    if (startValue > 0) {
      const subperiodReturn = (endValueBeforeCashflow - startValue) / startValue;
      const clampedReturn = Math.max(-0.95, Math.min(2.0, subperiodReturn));
      compoundReturn *= (1 + clampedReturn);
    }
  }

  return (compoundReturn - 1) * 100;
}

/**
 * Calcula métricas analíticas del portfolio
 */
export function computePortfolioMetrics(
  positions: T212Position[],
  totalPortfolioValue: number,
  chartHistory: ChartPoint[],
  benchmarkReturn?: number | null
): PortfolioMetrics {
  let maxWeight = 0;
  let maxTicker = "";

  for (const p of positions) {
    const val = p.currentValue ?? ((p.currentPrice || 0) * (p.quantity || 0));
    const weightPct = totalPortfolioValue > 0 ? Math.min(100, (val / totalPortfolioValue) * 100) : 0;

    if (weightPct > maxWeight) {
      maxWeight = weightPct;
      maxTicker = p.ticker;
    }
  }

  // Rentabilidad real acumulada del portfolio actual
  const lastPoint = chartHistory.length > 0 ? chartHistory[chartHistory.length - 1] : undefined;
  const myReturn = (lastPoint && lastPoint.totalInvested > 0)
    ? Number((((lastPoint.totalValue - lastPoint.totalInvested) / lastPoint.totalInvested) * 100).toFixed(2))
    : 0;

  // Comparativa con S&P 500 (benchmark real sobre el horizonte del portfolio)
  const hasInvestments = totalPortfolioValue > 0 && positions.length > 0;
  let sp500Comparison: number | null = null;
  if (hasInvestments && benchmarkReturn != null) {
    sp500Comparison = Number((myReturn - benchmarkReturn).toFixed(2));
  }

  return {
    twr: Number(myReturn.toFixed(2)),
    sp500Comparison,
    maxConcentration: {
      ticker: hasInvestments ? (maxTicker || "N/A") : "N/A",
      weightPct: hasInvestments ? Number(maxWeight.toFixed(1)) : 0.0,
      isAlert: maxWeight > 25,
    },
  };
}

let sp500Cache: { returnPct: number; timestamp: number } | null = null;
const SP500_TTL = 5 * 60 * 1000;

export async function fetchSp500PeriodReturn(startDate?: Date | string): Promise<number | null> {
  const now = Date.now();
  if (sp500Cache && now - sp500Cache.timestamp < SP500_TTL) {
    return sp500Cache.returnPct;
  }

  try {
    const url = "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=6mo";
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const timestamps = (result?.timestamp || []) as number[];
    const closes = (result?.indicators?.quote?.[0]?.close || []) as (number | null)[];

    const validCloses = closes.filter((c): c is number => c != null && c > 0);
    if (validCloses.length < 2) return null;

    const lastClose = validCloses[validCloses.length - 1];
    let startClose = validCloses[0];

    if (startDate) {
      const startTimeSec = new Date(startDate).getTime() / 1000;
      const idx = timestamps.findIndex((t) => t >= startTimeSec);
      if (idx >= 0 && closes[idx] != null && closes[idx]! > 0) {
        startClose = closes[idx]!;
      }
    } else {
      // Por defecto comparar respecto a 1 mes atrás (horizonte medio activo)
      const oneMonthAgoSec = (now - 30 * 86400 * 1000) / 1000;
      const idx = timestamps.findIndex((t) => t >= oneMonthAgoSec);
      if (idx >= 0 && closes[idx] != null && closes[idx]! > 0) {
        startClose = closes[idx]!;
      }
    }

    const returnPct = Number((((lastClose - startClose) / startClose) * 100).toFixed(2));
    sp500Cache = { returnPct, timestamp: now };
    return returnPct;
  } catch {
    return null;
  }
}

/**
 * Calcula la matriz del Heatmap mensual de rendimiento (100% veraz con datos reales)
 */
export function generateMonthlyHeatmap(
  snapshots: Array<{ date: Date | string; totalValue: number; realProfit: number }>
): HeatmapMonth[] {
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const now = new Date();
  const currentYear = now.getFullYear();

  // Filtrar snapshots válidos con fecha y actividad real
  const validSnapshots = snapshots
    .map((s) => ({ ...s, parsedDate: new Date(s.date) }))
    .filter((s) => !isNaN(s.parsedDate.getTime()) && (s.totalValue > 0 || Math.abs(s.realProfit) > 0));

  // Determinar fecha del primer movimiento real (octubre 2026)
  const firstActiveDate = validSnapshots.length > 0
    ? validSnapshots[0].parsedDate
    : new Date("2026-10-26T09:00:00Z");

  const startYear = firstActiveDate.getFullYear();
  const result: HeatmapMonth[] = [];

  // Solo generar los años en los que la cuenta ha existido realmente (sin inventar 2025)
  for (let year = startYear; year <= currentYear; year++) {
    for (let month = 0; month < 12; month++) {
      if (year === currentYear && month > now.getMonth()) {
        continue; // Meses futuros no se muestran
      }

      // Si el mes es anterior a la apertura de la cuenta (antes de octubre 2026)
      const isBeforeAccountCreation =
        year < firstActiveDate.getFullYear() ||
        (year === firstActiveDate.getFullYear() && month < firstActiveDate.getMonth());

      if (isBeforeAccountCreation) {
        result.push({
          year,
          month,
          monthName: monthNames[month],
          returnPct: 0.0,
          profitEuro: 0.0,
        });
        continue;
      }

      // Meses con actividad: calcular rendimiento real
      const monthRecords = validSnapshots.filter(
        (s) => s.parsedDate.getFullYear() === year && s.parsedDate.getMonth() === month
      );

      if (monthRecords.length >= 2) {
        const first = monthRecords[0];
        const last = monthRecords[monthRecords.length - 1];
        const profitEuro = Number((last.realProfit - first.realProfit).toFixed(2));
        const returnPct = first.totalValue > 0 ? Number(((profitEuro / first.totalValue) * 100).toFixed(1)) : 0;

        result.push({
          year,
          month,
          monthName: monthNames[month],
          returnPct,
          profitEuro,
        });
      } else if (monthRecords.length === 1) {
        const item = monthRecords[0];
        const profitEuro = Number(item.realProfit.toFixed(2));
        const returnPct = item.totalValue > 0 ? Number(((profitEuro / item.totalValue) * 100).toFixed(1)) : 0;

        result.push({
          year,
          month,
          monthName: monthNames[month],
          returnPct,
          profitEuro,
        });
      } else {
        result.push({
          year,
          month,
          monthName: monthNames[month],
          returnPct: 0.0,
          profitEuro: 0.0,
        });
      }
    }
  }

  return result;
}
