import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

const POPULAR_STOCKS: SearchResult[] = [
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" },
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
  { symbol: "AMZN", name: "Amazon.com, Inc.", exchange: "NASDAQ" },
  { symbol: "TSLA", name: "Tesla, Inc.", exchange: "NASDAQ" },
  { symbol: "GOOGL", name: "Alphabet Inc. (Class A)", exchange: "NASDAQ" },
  { symbol: "META", name: "Meta Platforms, Inc.", exchange: "NASDAQ" },
  { symbol: "AMD", name: "Advanced Micro Devices, Inc.", exchange: "NASDAQ" },
  { symbol: "NFLX", name: "Netflix, Inc.", exchange: "NASDAQ" },
  { symbol: "PLTR", name: "Palantir Technologies Inc.", exchange: "NYSE" },
  { symbol: "SAN.MC", name: "Banco Santander, S.A.", exchange: "BME" },
  { symbol: "ITX.MC", name: "Industria de Diseño Textil (Inditex)", exchange: "BME" },
  { symbol: "IBE.MC", name: "Iberdrola, S.A.", exchange: "BME" },
  { symbol: "BBVA.MC", name: "Banco Bilbao Vizcaya Argentaria", exchange: "BME" },
  { symbol: "VWCE.DE", name: "Vanguard FTSE All-World UCITS ETF", exchange: "XETRA" },
];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const queryLower = q.toLowerCase();

  // 1. Filtrar coincidencias locales instantáneas
  const localMatches = POPULAR_STOCKS.filter(
    (s) =>
      s.symbol.toLowerCase().includes(queryLower) ||
      s.name.toLowerCase().includes(queryLower)
  );

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      q
    )}&quotesCount=8&newsCount=0`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      interface RawQuote {
        symbol?: string;
        shortname?: string;
        longname?: string;
        exchDisp?: string;
        quoteType?: string;
      }
      const remoteQuotes = ((data.quotes || []) as RawQuote[])
        .filter((item) => item.quoteType === "EQUITY" || item.quoteType === "ETF")
        .map((item) => ({
          symbol: item.symbol || "",
          name: item.shortname || item.longname || item.symbol || "",
          exchange: item.exchDisp || "",
        }))
        .filter((item) => item.symbol);

      // Combinar sin duplicados
      const seen = new Set<string>();
      const combined: SearchResult[] = [];

      for (const item of [...localMatches, ...remoteQuotes]) {
        if (!seen.has(item.symbol)) {
          seen.add(item.symbol);
          combined.push(item);
        }
      }

      return NextResponse.json({ results: combined.slice(0, 7) });
    }
  } catch (err) {
    console.warn("[Ticker Search] Error en consulta remota, usando local:", err);
  }

  return NextResponse.json({ results: localMatches.slice(0, 7) });
}
