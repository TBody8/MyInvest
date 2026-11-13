import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface FearAndGreedData {
  score: number;
  rating: string;
  previousClose: number;
  previous1Week: number;
  previous1Month: number;
  previous1Year: number;
  timestamp: string;
}

let cachedData: { data: FearAndGreedData; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de caché

export async function GET(): Promise<NextResponse> {
  const now = Date.now();
  if (cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedData.data);
  }

  try {
    const url = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (res.ok) {
      const json = await res.json();
      const fg = json?.fear_and_greed;
      if (fg && Number.isFinite(fg.score) && fg.score >= 0 && fg.score <= 100) {
        const payload: FearAndGreedData = {
          score: Math.round(fg.score),
          rating: String(fg.rating || "neutral").toUpperCase(),
          previousClose: Math.round(fg.previous_close ?? fg.score),
          previous1Week: Math.round(fg.previous_1_week ?? fg.score),
          previous1Month: Math.round(fg.previous_1_month ?? fg.score),
          previous1Year: Math.round(fg.previous_1_year ?? fg.score),
          timestamp: fg.timestamp || new Date().toISOString(),
        };

        cachedData = { data: payload, timestamp: now };
        return NextResponse.json(payload);
      }
    }
  } catch (err) {
    console.warn("[FearAndGreed API] Error consultando CNN, usando respaldo:", err);
  }

  return NextResponse.json({ error: "Índice CNN no disponible temporalmente" }, { status: 503 });
}
