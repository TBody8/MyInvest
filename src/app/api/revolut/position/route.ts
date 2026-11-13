import { NextRequest, NextResponse } from "next/server";
import { saveRevolutPosition, deleteRevolutPosition } from "@/lib/revolut";
import { validatePurchase, PurchaseValidationError } from "@/lib/revolutAccounting";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const result = await saveRevolutPosition(validatePurchase(body));

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: err instanceof PurchaseValidationError || err instanceof SyntaxError ? 400 : 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");

    if (!ticker) {
      return NextResponse.json({ error: "Ticker requerido" }, { status: 400 });
    }

    await deleteRevolutPosition(ticker);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
