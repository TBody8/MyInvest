import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

export const dynamic = "force-dynamic";

const execAsync = promisify(execFile);

interface CachedFundamentals {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CachedFundamentals>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas
const CACHE_VERSION = "v4_valuation_measures";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const rawTicker = (searchParams.get("ticker") || "NVDA").trim().toUpperCase();
  const period = (searchParams.get("period") || "annual").trim().toLowerCase();
  const force = searchParams.get("force") === "true";

  if (!/^[A-Z0-9][A-Z0-9.^=_-]{0,39}$/.test(rawTicker) || !["annual", "quarterly", "ttm"].includes(period)) {
    return NextResponse.json({ error: "Ticker o período no válido" }, { status: 400 });
  }

  const cacheKey = `${CACHE_VERSION}:${rawTicker}:${period}`;
  const cached = cache.get(cacheKey);

  if (!force && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        "x-cache": "HIT",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  try {
    const scriptPath = path.join(process.cwd(), "src", "lib", "get_company_fundamentals.py");
    const { stdout, stderr } = await execAsync("python", [scriptPath, rawTicker, period], {
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr && !stdout) {
      console.error("[Fundamentals API Error]", stderr);
      return NextResponse.json(
        { error: "Error en el script de datos fundamentales", details: stderr },
        { status: 500 }
      );
    }

    const data = JSON.parse(stdout.trim());

    if (data.error) {
      return NextResponse.json(
        { error: data.error, ticker: rawTicker },
        { status: 404 }
      );
    }

    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json(data, {
      headers: {
        "x-cache": "MISS",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[Fundamentals API Exception]", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los datos fundamentales", message: error?.message || String(error) },
      { status: 500 }
    );
  }
}
