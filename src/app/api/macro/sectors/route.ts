import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface SectorItem {
  ticker: string;
  name: string;
  shortName: string;
  monthReturn: number;
  weekReturn: number;
  currentPrice: number;
  volume: number;
}

const SECTOR_METADATA: Record<string, { name: string; shortName: string }> = {
  XLK: { name: "Tecnología", shortName: "Tech" },
  XLV: { name: "Salud / Healthcare", shortName: "Salud" },
  XLE: { name: "Energía", shortName: "Energía" },
  XLF: { name: "Servicios Financieros", shortName: "Finanzas" },
  XLP: { name: "Consumo Defensivo", shortName: "Consumo Def." },
  XLU: { name: "Utilities / Servicios", shortName: "Utilities" },
  XLI: { name: "Industriales", shortName: "Industria" },
  XLC: { name: "Comunicación & Media", shortName: "Media" },
  XLY: { name: "Consumo Cíclico", shortName: "Consumo Cíc." },
  XLRE: { name: "Inmobiliario (REITs)", shortName: "Inmobiliario" },
  XLB: { name: "Materiales Básicos", shortName: "Materiales" },
};

let cachedSectors: { data: SectorItem[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de caché

export async function GET(): Promise<NextResponse> {
  const now = Date.now();
  if (cachedSectors && now - cachedSectors.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedSectors.data);
  }

  const tickers = Object.keys(SECTOR_METADATA);
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
  };

  try {
    const results = await Promise.allSettled(
      tickers.map(async (ticker) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1mo`;
        const res = await fetch(url, { headers, next: { revalidate: 300 } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const quotes = json?.chart?.result?.[0]?.indicators?.quote?.[0];
        const closes: (number | null)[] = quotes?.close || [];
        const volumes: (number | null)[] = quotes?.volume || [];

        const validCloses = closes.filter((c): c is number => typeof c === "number" && !isNaN(c));
        if (validCloses.length < 2) throw new Error("Sin datos suficientes");

        const currentPrice = validCloses[validCloses.length - 1];
        const monthStartPrice = validCloses[0];
        const weekIndex = Math.max(0, validCloses.length - 6);
        const weekStartPrice = validCloses[weekIndex];

        const monthReturn = Number((((currentPrice - monthStartPrice) / monthStartPrice) * 100).toFixed(2));
        const weekReturn = Number((((currentPrice - weekStartPrice) / weekStartPrice) * 100).toFixed(2));
        const lastVolume = volumes[volumes.length - 1] || 0;

        return {
          ticker,
          name: SECTOR_METADATA[ticker].name,
          shortName: SECTOR_METADATA[ticker].shortName,
          monthReturn,
          weekReturn,
          currentPrice: Number(currentPrice.toFixed(2)),
          volume: lastVolume,
        } as SectorItem;
      })
    );

    const successfulSectors = results
      .filter((r): r is PromiseFulfilledResult<SectorItem> => r.status === "fulfilled")
      .map((r) => r.value);

    if (successfulSectors.length >= 6) {
      cachedSectors = { data: successfulSectors, timestamp: now };
      return NextResponse.json(successfulSectors);
    }
  } catch (err) {
    console.warn("[Sectors API] Error consultando sectores, usando datos verificados:", err);
  }

  return NextResponse.json({ error: "Datos sectoriales no disponibles temporalmente" }, { status: 503 });
}
