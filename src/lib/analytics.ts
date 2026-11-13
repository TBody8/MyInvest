import { T212Position, ChartPoint } from "@/types/trading212";
import { isETF } from "@/lib/utils";

/**
 * 1. Time-Weighted Return (TWR) institucional (Basado en FinanceToolkit)
 * Aísla matemáticamente el impacto de las inyecciones de capital (depósitos).
 */
export function calculatePreciseTWR(
  points: ChartPoint[],
  currentTotalValue: number,
  currentInvested: number
): number {
  const activePts = points.filter((p) => p.totalInvested > 0);
  if (activePts.length < 2 || currentInvested <= 0) {
    if (currentInvested > 0) {
      return Number((((currentTotalValue - currentInvested) / currentInvested) * 100).toFixed(2));
    }
    return 0;
  }

  let compoundGrowth = 1.0;

  for (let i = 1; i < activePts.length; i++) {
    const prev = activePts[i - 1];
    const curr = activePts[i];

    // Flujo de caja neto entre ambos puntos (depósito o retiro)
    const cashFlow = curr.totalInvested - prev.totalInvested;
    const startValue = prev.totalValue;
    const endValueBeforeCashFlow = curr.totalValue - cashFlow;

    if (startValue > 0) {
      const subperiodReturn = (endValueBeforeCashFlow - startValue) / startValue;
      const clamped = Math.max(-0.95, Math.min(3.0, subperiodReturn));
      compoundGrowth *= (1 + clamped);
    }
  }

  const twrPct = (compoundGrowth - 1) * 100;
  return Number(twrPct.toFixed(2));
}

/**
 * 2. Maximum Drawdown (MDD) (Basado en FinanceToolkit)
 * Mide la mayor caída porcentual desde el pico más alto alcanzado.
 */
export function calculateMaxDrawdown(points: ChartPoint[]): number {
  const activePts = points.filter((p) => p.totalValue > 0);
  if (activePts.length === 0) return 0;

  let peak = activePts[0].totalValue;
  let maxDrawdown = 0;

  for (const pt of activePts) {
    if (pt.totalValue > peak) {
      peak = pt.totalValue;
    }
    if (peak > 0) {
      const dd = ((pt.totalValue - peak) / peak) * 100;
      if (dd < maxDrawdown) {
        maxDrawdown = dd;
      }
    }
  }

  return Number(maxDrawdown.toFixed(2));
}

/**
 * 3. Cálculo de Diversificación de Cartera basado en concentración HHI
 * Reconoce la diversificación estructural de ETFs amplios frente a acciones individuales.
 */
export interface DiversificationResult {
  score: number;
  label: "Alta" | "Moderada" | "Concentrada" | "1 solo activo";
  details: string;
}

export function calculatePortfolioDiversification(
  positions: T212Position[]
): DiversificationResult {
  const activePositions = positions.filter((p) => (p.currentValue || 0) > 0);
  const totalVal = activePositions.reduce((acc, p) => acc + (p.currentValue || 0), 0);

  if (activePositions.length <= 1 || totalVal <= 0) {
    return {
      score: 0.10,
      label: "1 solo activo",
      details: "Cartera concentrada en 1 posición.",
    };
  }

  // Índice Herfindahl-Hirschman (HHI) adaptado a fondos indexados y acciones individuales
  let effectiveHhi = 0;
  for (const p of activePositions) {
    const weight = (p.currentValue || 0) / totalVal;
    const isFund = isETF(p);
    // Un ETF amplio diversifica internamente cientos de compañías
    const penalty = isFund ? (weight * weight) / 15 : (weight * weight);
    effectiveHhi += penalty;
  }

  const score = Number(Math.max(0, Math.min(1, 1 - effectiveHhi)).toFixed(2));

  if (score >= 0.70) {
    return {
      score,
      label: "Alta",
      details: "Baja co-dependencia. Cartera bien distribuida entre índices globales y convicciones.",
    };
  } else if (score >= 0.45) {
    return {
      score,
      label: "Moderada",
      details: "Distribución equilibrada entre suelo troncal y acciones individuales.",
    };
  } else {
    return {
      score,
      label: "Concentrada",
      details: "Elevada concentración en pocos activos individuales.",
    };
  }
}

/**
 * 4. Calendario y Fechas de Resultados (Earnings-Preview)
 * Consulta en feed de fechas de presentación de resultados oficial.
 */
interface EarningsInfo {
  date: string;
  estimate?: string;
}

const earningsCache = new Map<string, { info: EarningsInfo | null; timestamp: number }>();
const EARNINGS_CACHE_TTL = 12 * 60 * 60 * 1000;

export async function getUpcomingEarnings(rawTicker: string): Promise<EarningsInfo | null> {
  const ticker = rawTicker.split("_")[0].toUpperCase();
  const now = Date.now();

  const cached = earningsCache.get(ticker);
  if (cached && now - cached.timestamp < EARNINGS_CACHE_TTL) {
    return cached.info;
  }

  try {
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=calendarEvents`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      const events = data?.quoteSummary?.result?.[0]?.calendarEvents?.earnings;
      const earningsDateRaw = events?.earningsDate?.[0]?.raw;
      const avgEps = events?.earningsAverage?.raw;

      if (earningsDateRaw) {
        const d = new Date(earningsDateRaw * 1000);
        // Solo mostrar si es en el futuro o hoy
        if (d.getTime() >= now - 24 * 3600 * 1000) {
          const day = d.getDate();
          const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
          const month = months[d.getMonth()];
          const info: EarningsInfo = {
            date: `${day} ${month}`,
            estimate: avgEps ? `Consenso: ${avgEps.toFixed(2)} $ EPS` : undefined,
          };
          earningsCache.set(ticker, { info, timestamp: now });
          return info;
        }
      }
    }
  } catch {
    // Si la consulta externa falla, no mostramos fecha desactualizada
  }

  earningsCache.set(ticker, { info: null, timestamp: now });
  return null;
}
