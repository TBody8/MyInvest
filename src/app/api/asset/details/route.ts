import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { getLiveEurUsdRate, getEurConversionRate } from "@/lib/quotes";

export const dynamic = "force-dynamic";

const execAsync = promisify(execFile);

interface OHLCItem {
  timestamp: number;
  date: string;
  fullDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface AssetStats {
  ticker: string;
  symbol: string;
  name: string;
  targetMeanPrice?: number | null;
  recommendation?: string;
  forwardPE?: number | null;
  beta?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  marketCap?: number | null;
  sma50?: number | null;
  sma200?: number | null;
  technicalLevels?: {
    support?: number | null;
    resistance?: number | null;
    sma50?: number | null;
    sma200?: number | null;
    source: string;
  } | null;
}

const statsCache = new Map<string, { stats: AssetStats; timestamp: number }>();
const STATS_TTL = 2 * 60 * 60 * 1000; // 2 horas de caché

const REVOLUT_TICKER_MAP: Record<string, string> = {
  IUSQ: "IUSQ.DE",
  "6AQQ": "6AQQ.DE",
  IS3N: "IS3N.DE",
  IUSN: "IUSN.DE",
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const rawTicker = (searchParams.get("ticker") || "NVDA").trim().toUpperCase().split("_")[0];
  const timeframe = (searchParams.get("timeframe") || "1M").toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9.^=-]{0,39}$/.test(rawTicker) || !["1D", "1S", "1W", "1M", "1A", "1Y", "ALL", "TODO"].includes(timeframe)) {
    return NextResponse.json({ error: "Ticker o período no válido" }, { status: 400 });
  }

  const querySymbol = REVOLUT_TICKER_MAP[rawTicker] || rawTicker;

  let interval = "1d";
  let range = "3mo";

  switch (timeframe) {
    case "1D":
      interval = "15m";
      range = "1d";
      break;
    case "1W":
    case "1S":
      interval = "1h";
      range = "5d";
      break;
    case "1M":
      interval = "1d";
      range = "1mo";
      break;
    case "1Y":
    case "1A":
      interval = "1d";
      range = "1y";
      break;
    case "ALL":
    case "TODO":
      interval = "1wk";
      range = "5y";
      break;
    default:
      interval = "1d";
      range = "3mo";
  }

  try {
    const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?interval=${interval}&range=${range}&includePrePost=true`;

    const [chartRes, liveFxRate] = await Promise.all([
      fetch(chartUrl, { headers, next: { revalidate: 60 } }),
      getLiveEurUsdRate(),
    ]);

    if (!chartRes.ok) {
      throw new Error(`Error en Yahoo Finance al consultar ${querySymbol}`);
    }

    const chartJson = await chartRes.json();
    const result = chartJson?.chart?.result?.[0];
    const meta = result?.meta;
    const quotes = result?.indicators?.quote?.[0];

    const timestamps: number[] = result?.timestamp || [];
    const opens: (number | null)[] = quotes?.open || [];
    const highs: (number | null)[] = quotes?.high || [];
    const lows: (number | null)[] = quotes?.low || [];
    const closes: (number | null)[] = quotes?.close || [];
    const volumes: (number | null)[] = quotes?.volume || [];

    const currency = meta?.currency;
    if (!currency) throw new Error("Divisa de cotización no disponible");

    const candles: OHLCItem[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];

      if (![o, h, l, c].every(v => typeof v === "number" && Number.isFinite(v))) continue;
      if (o == null || h == null || l == null || c == null) continue;

      const d = new Date(timestamps[i] * 1000);
      const dayOfWeek = d.getDay();
      // Omitir fines de semana
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateLabel = interval === "15m"
        ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
        : interval === "1h"
        ? `${d.getDate()} ${d.toLocaleString("es-ES", { month: "short" })} ${String(d.getHours()).padStart(2, "0")}h`
        : timeframe === "ALL" || timeframe === "TODO"
        ? `${d.toLocaleString("es-ES", { month: "short" })} ${String(d.getFullYear()).slice(-2)}`
        : `${d.getDate()} ${d.toLocaleString("es-ES", { month: "short" })}`;

      const fullDate = d.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: timeframe === "ALL" || timeframe === "TODO" || timeframe === "1A" || timeframe === "1Y" ? "numeric" : undefined,
      });

      // Para acciones de EE.UU. (USD), se conservan las cotizaciones nativas en USD ($). Para ETFs europeos, en EUR (€).
      candles.push({
        timestamp: timestamps[i] * 1000,
        date: dateLabel,
        fullDate,
        open: Number(o.toFixed(2)),
        high: Number(h.toFixed(2)),
        low: Number(l.toFixed(2)),
        close: Number(c.toFixed(2)),
        volume: volumes[i] ? volumes[i]! : undefined,
      });
    }

    // 2. Obtener estadísticas fundamentales (con caché en memoria)
    let stats: AssetStats = {
      ticker: rawTicker,
      symbol: querySymbol,
      name: meta?.shortName || meta?.longName || rawTicker,
      fiftyTwoWeekHigh: meta?.fiftyTwoWeekHigh ? Number(meta.fiftyTwoWeekHigh.toFixed(2)) : null,
      fiftyTwoWeekLow: meta?.fiftyTwoWeekLow ? Number(meta.fiftyTwoWeekLow.toFixed(2)) : null,
      marketCap: null,
      targetMeanPrice: null,
      recommendation: "Hold",
      forwardPE: null,
      beta: null,
    };

    const cachedStats = statsCache.get(rawTicker);
    if (cachedStats && Date.now() - cachedStats.timestamp < STATS_TTL) {
      stats = cachedStats.stats;
    } else {
      try {
        const scriptPath = path.join(process.cwd(), ".opencode/skills/yfinance/get_asset_fundamentals.py");
        const { stdout } = await execAsync("python", [scriptPath, rawTicker], { timeout: 15000 });
        const parsed = JSON.parse(stdout.trim());
        if (!parsed.error) {
          const tech = parsed.technicalLevels;
          stats = {
            ...stats,
            targetMeanPrice: parsed.targetMeanPrice ? Number(parsed.targetMeanPrice.toFixed(2)) : null,
            recommendation: parsed.recommendation || "N/A",
            forwardPE: parsed.forwardPE || null,
            beta: parsed.beta || null,
            fiftyTwoWeekHigh: parsed.fiftyTwoWeekHigh ? Number(parsed.fiftyTwoWeekHigh.toFixed(2)) : stats.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: parsed.fiftyTwoWeekLow ? Number(parsed.fiftyTwoWeekLow.toFixed(2)) : stats.fiftyTwoWeekLow,
            marketCap: parsed.marketCap || null,
            sma50: parsed.sma50 ? Number(parsed.sma50.toFixed(2)) : null,
            sma200: parsed.sma200 ? Number(parsed.sma200.toFixed(2)) : null,
            technicalLevels: tech ? {
              support: tech.support ? Number(tech.support.toFixed(2)) : null,
              resistance: tech.resistance ? Number(tech.resistance.toFixed(2)) : null,
              sma50: tech.sma50 ? Number(tech.sma50.toFixed(2)) : null,
              sma200: tech.sma200 ? Number(tech.sma200.toFixed(2)) : null,
              source: tech.source,
            } : null,
          };
          statsCache.set(rawTicker, { stats, timestamp: Date.now() });
        }
      } catch {
        // Fallback a metadatos de Yahoo Chart
      }
    }

    const currentPrice = candles.length > 0
      ? candles[candles.length - 1].close
      : (meta?.regularMarketPrice ? Number(meta.regularMarketPrice.toFixed(2)) : 0);

    const eurPerUnit = await getEurConversionRate(currency);
    const currentPriceEur = currentPrice * eurPerUnit;

    return NextResponse.json({
      ticker: rawTicker,
      symbol: querySymbol,
      name: stats.name,
      currency,
      eurPerUnit,
      liveFxRate,
      currentPrice,
      currentPriceEur,
      stats,
      candles,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[API Asset Details] Error:", errorMsg);
    return NextResponse.json(
      { error: `Error obteniendo detalle de ${rawTicker}`, details: errorMsg },
      { status: 500 }
    );
  }
}
