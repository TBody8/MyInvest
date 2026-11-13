import { NextRequest, NextResponse } from "next/server";
import { getChartPoints } from "@/lib/snapshots";
import { Timeframe } from "@/types/trading212";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const tfParam = searchParams.get("timeframe") as Timeframe | null;
  const timeframe: Timeframe = tfParam && ["D", "W", "M", "Y", "ALL"].includes(tfParam)
    ? tfParam
    : "ALL";

  try {
    const points = await getChartPoints(timeframe);
    return NextResponse.json({ timeframe, points });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
