import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const INDEX_MAP: Record<string, { ticker: string; name: string }> = {
  SP500: { ticker: "%5EGSPC", name: "S&P 500" },
  NASDAQ: { ticker: "%5ENDX", name: "Nasdaq 100" },
  DOW: { ticker: "%5EDJI", name: "Dow Jones" },
  RUSSELL: { ticker: "%5ERUT", name: "Russell 2000" },
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const indexKey = (searchParams.get("index") || "SP500").toUpperCase();
  const timeframe = (searchParams.get("timeframe") || "1Y").toUpperCase();

  const selectedIndex = INDEX_MAP[indexKey] || INDEX_MAP.SP500;
  const vixTicker = "%5EVIX";

  let interval = "1d";
  let range = "1y";

  switch (timeframe) {
    case "1W":
      interval = "1h";
      range = "5d";
      break;
    case "1M":
      interval = "1d";
      range = "1mo";
      break;
    case "6M":
      interval = "1d";
      range = "6mo";
      break;
    case "1Y":
      interval = "1d";
      range = "1y";
      break;
    case "ALL":
      interval = "1wk";
      range = "5y";
      break;
    default:
      interval = "1d";
      range = "1y";
  }

  try {
    const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };

    const [indexRes, vixRes] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${selectedIndex.ticker}?interval=${interval}&range=${range}`, { headers, next: { revalidate: 60 } }),
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${vixTicker}?interval=${interval}&range=${range}`, { headers, next: { revalidate: 60 } }),
    ]);

    if (!indexRes.ok || !vixRes.ok) {
      throw new Error("No se pudieron obtener cotizaciones de Yahoo Finance");
    }

    const indexJson = await indexRes.json();
    const vixJson = await vixRes.json();

    const indexResult = indexJson?.chart?.result?.[0];
    const vixResult = vixJson?.chart?.result?.[0];

    const indexTimestamps: number[] = indexResult?.timestamp || [];
    const indexCloses: (number | null)[] = indexResult?.indicators?.quote?.[0]?.close || [];

    const vixTimestamps: number[] = vixResult?.timestamp || [];
    const vixCloses: (number | null)[] = vixResult?.indicators?.quote?.[0]?.close || [];

    // Mapear el VIX por día o timestamp para sincronización exacta
    const vixMap = new Map<string, number>();
    for (let i = 0; i < vixTimestamps.length; i++) {
      if (vixCloses[i] !== null && vixCloses[i] !== undefined) {
        const d = new Date(vixTimestamps[i] * 1000);
        const key = interval === "1h"
          ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
          : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        vixMap.set(key, Number(vixCloses[i]!.toFixed(2)));
      }
    }

    const points: Array<{
      date: string;
      fullDate: string;
      indexPrice: number;
      vixPrice: number;
    }> = [];

    let lastKnownVix = 18.0;

    for (let i = 0; i < indexTimestamps.length; i++) {
      const idxClose = indexCloses[i];
      if (idxClose === null || idxClose === undefined) continue;

      const d = new Date(indexTimestamps[i] * 1000);
      const day = d.getDay();
      // Omitir fines de semana
      if (day === 0 || day === 6) continue;

      const key = interval === "1h"
        ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
        : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

      if (vixMap.has(key)) {
        lastKnownVix = vixMap.get(key)!;
      }

      const dateLabel = interval === "1h"
        ? `${String(d.getHours()).padStart(2, "0")}h`
        : timeframe === "ALL"
        ? `${d.toLocaleString("es-ES", { month: "short" })} ${d.getFullYear()}`
        : `${d.getDate()} ${d.toLocaleString("es-ES", { month: "short" })}`;

      const fullDate = d.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: timeframe === "ALL" ? "numeric" : undefined,
      });

      points.push({
        date: dateLabel,
        fullDate,
        indexPrice: Number(idxClose.toFixed(2)),
        vixPrice: lastKnownVix,
      });
    }

    const currentIndexPrice = points.length > 0 ? points[points.length - 1].indexPrice : 0;
    const currentVixPrice = points.length > 0 ? points[points.length - 1].vixPrice : 20.0;

    let vixRegime: "PANIC" | "ELEVATED" | "NORMAL" | "COMPLACENCY" = "NORMAL";
    if (currentVixPrice >= 30) vixRegime = "PANIC";
    else if (currentVixPrice >= 22) vixRegime = "ELEVATED";
    else if (currentVixPrice <= 14) vixRegime = "COMPLACENCY";

    return NextResponse.json({
      indexName: selectedIndex.name,
      currentIndexPrice,
      currentVixPrice,
      vixRegime,
      points,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[API VIX-Compare] Error:", errorMsg);
    return NextResponse.json(
      { error: "Error obteniendo datos de Índice vs VIX", details: errorMsg },
      { status: 500 }
    );
  }
}
