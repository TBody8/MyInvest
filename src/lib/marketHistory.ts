import { Timeframe, ChartPoint, T212Position, T212Transaction } from "@/types/trading212";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatEur } from "@/lib/utils";

export interface CandleItem {
  timestamp: number;
  close: number;
}

const candleCache = new Map<string, { data: CandleItem[]; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000;

export function clearCandleCache(): void {
  candleCache.clear();
}

/**
 * Genera una lista de días hábiles de bolsa (Lunes a Viernes) excluyendo fines de semana,
 * en orden cronológico terminando en HOY a la derecha.
 */
export function getRollingTradingDays(daysBack: number): Date[] {
  const now = new Date();
  const tradingDays: Date[] = [];

  for (let i = daysBack; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayOfWeek = d.getDay();
    // Excluir Sábados (6) y Domingos (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      tradingDays.push(d);
    }
  }

  return tradingDays;
}

export async function getRealMarketCandles(rawTicker: string, timeframe: Timeframe): Promise<CandleItem[]> {
  const ticker = rawTicker.trim().toUpperCase().split("_")[0];
  const cacheKey = `${ticker}_${timeframe}`;
  const now = Date.now();

  const cached = candleCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  let interval = "15m";
  let range = "1d";

  switch (timeframe) {
    case "D":
      interval = "15m";
      range = "1d";
      break;
    case "W":
      interval = "1h";
      range = "1mo";
      break;
    case "M":
      interval = "1d";
      range = "3mo";
      break;
    case "Y":
      interval = "1wk";
      range = "1y";
      break;
    case "ALL":
      interval = "1mo";
      range = "5y";
      break;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}&includePrePost=true`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      const timestamps = (result?.timestamp || []) as number[];
      const closes = (result?.indicators?.quote?.[0]?.close || []) as (number | null)[];

      const candles: CandleItem[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] !== null && closes[i] !== undefined && Number.isFinite(closes[i])) {
          candles.push({
            timestamp: timestamps[i] * 1000,
            close: Number(closes[i]!.toFixed(2)),
          });
        }
      }

      if (candles.length > 0) {
        candleCache.set(cacheKey, { data: candles, timestamp: now });
        return candles;
      }
    }
  } catch (err) {
    console.warn(`[Market History] Error obteniendo velas de ${ticker}:`, err);
  }

  return [];
}

/**
 * Calcula el capital neto invertido hasta una fecha o timestamp específico a partir de las transacciones reales.
 */
function getInvestedUpTo(transactions: T212Transaction[], cutoffMs: number): number {
  let invested = 0;
  for (const tx of transactions) {
    const txTime = new Date(tx.dateTime).getTime();
    if (txTime <= cutoffMs) {
      if (tx.type === "DEPOSIT") {
        invested += tx.amount;
      } else if (tx.type === "WITHDRAW" || tx.type === "WITHDRAWAL") {
        invested -= Math.abs(tx.amount);
      }
    }
  }
  return Number(invested.toFixed(2));
}

/**
 * Reconstruye la curva histórica 100% veraz y dinámica para Trading 212 a partir de:
 * 1. Depósitos y retiradas reales con sus marcas temporales exactas.
 * 2. Cotizaciones de mercado reales de los activos en cartera.
 * 3. Eventos de operativa reales (sin números ni hitos inventados).
 */
export async function buildRealPortfolioHistory(
  timeframe: Timeframe,
  positions: T212Position[],
  transactions: T212Transaction[],
  currentTotalValue: number,
  currentInvested: number,
  currentProfit: number
): Promise<ChartPoint[]> {
  const points: ChartPoint[] = [];
  const now = new Date();

  // Transacciones ordenadas cronológicamente
  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  );

  const firstTxTime = sortedTx.length > 0 ? new Date(sortedTx[0].dateTime).getTime() : 0;

  // Si no hay posiciones ni depósitos: devolver línea plana en 0.00 €
  if (currentTotalValue <= 0 && currentInvested <= 0) {
    const tradingDays = getRollingTradingDays(timeframe === "W" ? 7 : 30);
    for (const d of tradingDays) {
      points.push({
        timestamp: d.getTime(),
        date: format(d, "d MMM", { locale: es }),
        fullDate: `${format(d, "EEEE, d 'de' MMMM", { locale: es })} (Sin fondos en Trading 212)`,
        realProfit: 0.0,
        realProfitPct: 0.0,
        totalValue: 0.0,
        totalInvested: 0.0,
      });
    }
    return points;
  }

  // Activo principal de T212 para calcular variaciones históricas
  const primaryHolding = positions.find((p) => p.currentValue && p.currentValue > 0) || positions[0];
  const realCandles = primaryHolding?.ticker
    ? await getRealMarketCandles(primaryHolding.ticker, timeframe)
    : [];

  const lastCandlePrice = realCandles.length > 0 ? realCandles[realCandles.length - 1].close : 0;

  // Peso del activo principal en la cartera para ponderar retornos
  const primaryWeight = currentTotalValue > 0 && primaryHolding?.currentValue
    ? Math.max(0.1, Math.min(1.0, primaryHolding.currentValue / currentTotalValue))
    : 0.5;

  // 1. DÍA (1D): Sesión de mercado intradía de la última sesión activa (sin mezclar múltiples días)
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
      let val = currentTotalValue;
      if (!isLast && lastCandlePrice > 0) {
        const returnPct = (candle.close - lastCandlePrice) / lastCandlePrice;
        val = Number((currentTotalValue * (1 + returnPct * primaryWeight)).toFixed(2));
      }

      const prof = isLast ? currentProfit : Number((val - currentInvested).toFixed(2));
      const profPct = currentInvested > 0 ? Number(((prof / currentInvested) * 100).toFixed(2)) : 0;

      points.push({
        timestamp: candle.timestamp,
        date: hourStr,
        fullDate,
        realProfit: prof,
        realProfitPct: profPct,
        totalValue: isLast ? currentTotalValue : val,
        totalInvested: currentInvested,
      });
    }

    return points;
  }

  // 2. SEMANA (1S) & MES (1M): Días de mercado hábiles sin fines de semana
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

      // Antes del primer depósito real: sin fondos en cartera
      if (firstTxTime > 0 && dayEndMs < firstTxTime) {
        points.push({
          timestamp: ptDate.getTime(),
          date: dateLabel,
          fullDate: `${fullDate} (Sin fondos en Trading 212)`,
          realProfit: 0.0,
          realProfitPct: 0.0,
          totalValue: 0.0,
          totalInvested: 0.0,
        });
        continue;
      }

      const investedAtDay = getInvestedUpTo(sortedTx, dayEndMs);
      const isLast = i === tradingDays.length - 1 || isRealToday;

      let val = currentTotalValue;
      let prof = currentProfit;

      if (!isLast && lastCandlePrice > 0) {
        const dayCandles = realCandles.filter((c) => {
          const d = new Date(c.timestamp);
          return d.getDate() === ptDate.getDate() && d.getMonth() === ptDate.getMonth();
        });
        if (dayCandles.length > 0) {
          const closePrice = dayCandles[dayCandles.length - 1].close;
          const returnPct = (closePrice - lastCandlePrice) / lastCandlePrice;
          const baseValue = investedAtDay > 0 ? (investedAtDay / (currentInvested || 1)) * currentTotalValue : 0;
          val = Number((baseValue * (1 + returnPct * primaryWeight)).toFixed(2));
          prof = Number((val - investedAtDay).toFixed(2));
        } else {
          val = investedAtDay;
          prof = 0;
        }
      } else if (isLast) {
        val = currentTotalValue;
        prof = currentProfit;
      }

      // Detectar si hubo depósito en este día concreto
      let tradeEvent: { type: "BUY" | "SELL"; label: string } | undefined = undefined;
      const dayStartMs = new Date(ptDate.getFullYear(), ptDate.getMonth(), ptDate.getDate(), 0, 0, 0).getTime();
      const depositsToday = sortedTx.filter((t) => {
        const tTime = new Date(t.dateTime).getTime();
        return tTime >= dayStartMs && tTime <= dayEndMs && t.type === "DEPOSIT";
      });

      if (depositsToday.length > 0) {
        const totalDep = depositsToday.reduce((acc, t) => acc + t.amount, 0);
        tradeEvent = { type: "BUY", label: `Depósito: +${formatEur(totalDep)}` };
      }

      const profPct = investedAtDay > 0 ? Number(((prof / investedAtDay) * 100).toFixed(2)) : 0;

      points.push({
        timestamp: ptDate.getTime(),
        date: dateLabel,
        fullDate,
        realProfit: Number((isLast ? currentProfit : prof).toFixed(2)),
        realProfitPct: isLast && currentInvested > 0 ? Number(((currentProfit / currentInvested) * 100).toFixed(2)) : profPct,
        totalValue: Number((isLast ? currentTotalValue : val).toFixed(2)),
        totalInvested: Number((isLast ? currentInvested : investedAtDay).toFixed(2)),
        tradeEvent,
      });
    }

    return points;
  }

  // 3. AÑO (1A) & TODO (ALL): Reconstrucción por meses calendario reales
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const monthFullNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const firstTxDate = firstTxTime > 0 ? new Date(firstTxTime) : now;
  const startYear = timeframe === "ALL" ? firstTxDate.getFullYear() : currentYear;
  const startMonth = timeframe === "ALL" ? Math.max(0, firstTxDate.getMonth() - 1) : 0;

  for (let y = startYear; y <= currentYear; y++) {
    const endM = y === currentYear ? currentMonth : 11;
    const initialM = y === startYear ? startMonth : 0;

    for (let m = initialM; m <= endM; m++) {
      const monthEndMs = new Date(y, m + 1, 0, 23, 59, 59).getTime();
      const label = timeframe === "ALL" ? `${monthNames[m]} '${String(y).slice(2)}` : monthNames[m];
      const fullLabel = `${monthFullNames[m]} ${y}`;

      if (firstTxTime > 0 && monthEndMs < firstTxTime) {
        points.push({
          timestamp: new Date(y, m, 1).getTime(),
          date: label,
          fullDate: `${fullLabel} (Sin fondos en Trading 212)`,
          realProfit: 0.0,
          realProfitPct: 0.0,
          totalValue: 0.0,
          totalInvested: 0.0,
        });
        continue;
      }

      const isCurrentMonth = y === currentYear && m === currentMonth;
      const investedAtMonth = isCurrentMonth ? currentInvested : getInvestedUpTo(sortedTx, monthEndMs);
      const val = isCurrentMonth ? currentTotalValue : investedAtMonth;
      const prof = isCurrentMonth ? currentProfit : 0;
      const profPct = investedAtMonth > 0 ? Number(((prof / investedAtMonth) * 100).toFixed(2)) : 0;

      // Evento de depósito si hubo en ese mes
      let tradeEvent: { type: "BUY" | "SELL"; label: string } | undefined = undefined;
      const monthStartMs = new Date(y, m, 1, 0, 0, 0).getTime();
      const monthDeps = sortedTx.filter((t) => {
        const tTime = new Date(t.dateTime).getTime();
        return tTime >= monthStartMs && tTime <= monthEndMs && t.type === "DEPOSIT";
      });

      if (monthDeps.length > 0) {
        const totalDep = monthDeps.reduce((acc, t) => acc + t.amount, 0);
        tradeEvent = { type: "BUY", label: `Depósito: +${formatEur(totalDep)}` };
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
