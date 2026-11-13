import { NextResponse } from "next/server";
import { captureSnapshot } from "@/lib/snapshots";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const count = await prisma.accountSnapshot.count();
    const latest = await prisma.accountSnapshot.findFirst({
      orderBy: { date: "desc" },
    });

    return NextResponse.json({
      totalSnapshots: count,
      latestSnapshot: latest ? latest.date : null,
      latestValue: latest ? latest.totalValue : null,
      latestProfit: latest ? latest.realProfit : null,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(): Promise<NextResponse> {
  try {
    const result = await captureSnapshot();
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      message: "Snapshot guardado correctamente",
      snapshotId: result.snapshotId,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
