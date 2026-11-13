export class PurchaseValidationError extends Error {}

export interface PurchaseInput {
  ticker: string;
  quantity: number;
  averagePrice: number;
  currency: string;
  fillDate: string;
  isEdit: boolean;
  name?: string;
  requestId?: string;
}

export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function validatePurchase(body: Record<string, unknown>): PurchaseInput {
  const ticker = typeof body.ticker === "string" ? body.ticker.trim().toUpperCase() : "";
  const { quantity, averagePrice } = body;
  const currency = typeof body.currency === "string" ? body.currency : "EUR";
  const fillDate = typeof body.fillDate === "string" ? body.fillDate : localToday();
  if (!/^[A-Z0-9][A-Z0-9.^_-]{0,39}$/.test(ticker)) throw new PurchaseValidationError("Ticker no válido");
  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1e12) throw new PurchaseValidationError("La cantidad debe ser un número positivo");
  if (typeof averagePrice !== "number" || !Number.isFinite(averagePrice) || averagePrice <= 0 || averagePrice > 1e12) throw new PurchaseValidationError("El precio debe ser un número positivo");
  if (!/^([A-Z]{3}|GBp)$/.test(currency)) throw new PurchaseValidationError("Divisa no válida");
  const date = new Date(`${fillDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fillDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== fillDate || fillDate > localToday()) throw new PurchaseValidationError("La fecha debe ser válida y no futura");
  if (body.isEdit !== undefined && typeof body.isEdit !== "boolean") throw new PurchaseValidationError("Modo de edición no válido");
  if (body.isEdit && currency !== "EUR") throw new PurchaseValidationError("La corrección del coste medio se expresa en EUR");
  return { ticker, quantity, averagePrice, currency, fillDate, isEdit: body.isEdit === true,
    name: typeof body.name === "string" ? body.name.slice(0, 200) : undefined,
    requestId: typeof body.requestId === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(body.requestId) ? body.requestId : undefined };
}

export interface RecordedPurchase {
  id: string;
  date: string;
  quantity: number;
  price: number;
  currency: string;
  eurPerUnit: number;
  costEur: number;
}

export interface PositionLedger {
  version: 2;
  baseline: { quantity: number; costEur: number };
  purchases: RecordedPurchase[];
  legacyNotes?: string | null;
  corrections?: Array<{ date: string; quantity: number; averagePrice: number }>;
}

export function readLedger(position: { quantity: number; averagePrice: number; notes?: string | null }): PositionLedger {
  try {
    const parsed = JSON.parse(position.notes || "null");
    if (parsed?.version === 2 && parsed.baseline && Array.isArray(parsed.purchases)) return parsed;
  } catch { /* Keep pre-existing notes and EUR costs intact. */ }
  return { version: 2, baseline: { quantity: position.quantity, costEur: position.quantity * position.averagePrice }, purchases: [], legacyNotes: position.notes };
}

export function addPurchase(oldQuantity: number, oldAverage: number, addedQuantity: number, priceEur: number) {
  const quantity = oldQuantity + addedQuantity;
  const averagePrice = (oldQuantity * oldAverage + addedQuantity * priceEur) / quantity;
  if (![quantity, averagePrice, quantity * averagePrice].every(Number.isFinite)) throw new PurchaseValidationError("Importe fuera de rango");
  return { quantity, averagePrice };
}
