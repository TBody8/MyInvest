import { NextRequest, NextResponse } from "next/server";
import { fetchNativeQuote } from "@/lib/quotes";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase() || "";
  if (!/^[A-Z0-9][A-Z0-9.^_-]{0,39}$/.test(ticker)) return NextResponse.json({ error: "Ticker no válido" }, { status: 400 });
  try {
    return NextResponse.json(await fetchNativeQuote(ticker), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo verificar la divisa" }, { status: 502 });
  }
}
