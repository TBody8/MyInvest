import prisma from "./db";
import type { ChartPoint, Timeframe } from "@/types/trading212";

export interface Observation { timestamp: number; totalValue: number; totalInvested: number; realProfit: number }

// Versioned provenance: only observations captured by this implementation enter
// these series. Older, unverified snapshots are preserved separately.
export async function recordObservation(broker: string, current: Observation): Promise<Observation[]> {
  const key = `verified-observations-v1:${broker}`;
  return prisma.$transaction(async tx => {
    const row = await tx.appSetting.findUnique({ where: { key } });
    let previous: Observation[] = [];
    try { previous = row ? JSON.parse(row.value) : []; } catch { /* Recover from malformed settings. */ }
    const cutoff = current.timestamp - 5 * 366 * 86400_000;
    // One observation per hour; keeps a bounded five-year history.
    const bucket = Math.floor(current.timestamp / 3600_000);
    const points = previous.filter(p => p.timestamp >= cutoff && Math.floor(p.timestamp / 3600_000) !== bucket);
    points.push(current);
    points.sort((a, b) => a.timestamp - b.timestamp);
    await tx.appSetting.upsert({ where: { key }, create: { key, value: JSON.stringify(points) }, update: { value: JSON.stringify(points) } });
    return points;
  });
}

export function observedChart(points: Observation[], timeframe: Timeframe, now = Date.now()): ChartPoint[] {
  const days = { D: 1, W: 7, M: 30, Y: 365, ALL: Infinity }[timeframe];
  return points.filter(p => p.timestamp <= now && p.timestamp >= now - days * 86400_000).map(p => ({
    timestamp: p.timestamp,
    date: new Date(p.timestamp).toLocaleString("es-ES", timeframe === "D" ? { hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short" }),
    fullDate: new Date(p.timestamp).toLocaleString("es-ES"),
    totalValue: p.totalValue, totalInvested: p.totalInvested, realProfit: p.realProfit,
    realProfitPct: p.totalInvested > 0 ? p.realProfit / p.totalInvested * 100 : 0,
  }));
}
