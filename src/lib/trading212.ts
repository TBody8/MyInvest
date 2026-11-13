import {
  T212AccountSummary,
  T212Position,
  T212Transaction,
} from "@/types/trading212";
import { getEurConversionRate, fetchMultipleQuotes } from "./quotes";

const BASE_URL = process.env.T212_BASE_URL || "https://live.trading212.com/api/v0";
const API_KEY = process.env.T212_API_KEY || "";
const API_SECRET = process.env.T212_API_SECRET || "";
const DEMO_FALLBACK = process.env.ENABLE_DEMO_FALLBACK === "true";

interface FetchOptions {
  timeoutMs?: number;
}

// CACHÉ EN MEMORIA PARA PROTEGER CONTRA RATE LIMITS (429 TOO MANY REQUESTS)
interface ApiCache<T> {
  data: T;
  timestamp: number;
}

let cachedSummary: ApiCache<T212AccountSummary> | null = null;
let cachedPositions: ApiCache<T212Position[]> | null = null;
let cachedTransactions: ApiCache<T212Transaction[]> | null = null;
const CACHE_TTL_MS = 30 * 1000;
const pending = new Map<string, Promise<unknown>>();

function coalesce<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;
  const promise = load().finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}

export function getAccountSummary(force = false) { return coalesce("summary", () => loadAccountSummary(force)); }
export function getPositions(force = false) { return coalesce("positions", () => loadPositions(force)); }
export function getCashTransactions(limit = 50, force = false) { return coalesce("transactions", () => loadCashTransactions(limit, force)); }

function getAuthHeader(): string {
  const key = process.env.T212_API_KEY || API_KEY;
  const secret = process.env.T212_API_SECRET || API_SECRET;

  if (!key) return "";

  if (key.startsWith("Basic ")) return key;

  if (key && secret) {
    const creds = Buffer.from(`${key}:${secret}`).toString("base64");
    return `Basic ${creds}`;
  }

  if (key.includes(":")) {
    const creds = Buffer.from(key).toString("base64");
    return `Basic ${creds}`;
  }

  return key;
}

async function t212Fetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const authHeader = getAuthHeader();
  if (!authHeader) {
    throw new Error("T212_API_KEY_NOT_CONFIGURED");
  }

  const url = `${BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 10000);

  try {
    let res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (res.status === 429) {
      console.warn(`[Trading212 RateLimit 429] Límite de peticiones alcanzado en ${endpoint}. Usando respaldo.`);
      throw new Error("RATE_LIMITED_429");
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`Trading212 API Error (${res.status}): ${errText}`);
    }

    return (await res.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export function clearApiCache(): void {
  cachedSummary = null;
  cachedPositions = null;
  cachedTransactions = null;
}

async function loadAccountSummary(force = false): Promise<T212AccountSummary> {
  const now = Date.now();
  if (!force && cachedSummary && now - cachedSummary.timestamp < CACHE_TTL_MS) {
    return cachedSummary.data;
  }

  try {
    interface RawT212Summary {
      id?: number;
      currency?: string;
      totalValue?: number;
      total?: number;
      cash?: {
        availableToTrade?: number;
        free?: number;
        total?: number;
        interest?: number;
      };
      investments?: {
        totalCost?: number;
        currentValue?: number;
        total?: number;
        unrealizedProfitLoss?: number;
        ppl?: number;
        realizedProfitLoss?: number;
        result?: number;
      };
    }

    const raw = await t212Fetch<RawT212Summary>("/equity/account/summary");
    if (raw.currency && raw.currency !== "EUR") throw new Error("La cuenta Trading 212 no está denominada en EUR");

    const totalVal = raw.totalValue ?? raw.total ?? 0;
    const freeCash = raw.cash?.availableToTrade ?? raw.cash?.free ?? 0;
    const totalCash = raw.cash?.total ?? freeCash;
    const ppl = raw.investments?.unrealizedProfitLoss ?? raw.investments?.ppl ?? 0;
    const investmentsVal = raw.investments?.currentValue ?? raw.investments?.total ?? (totalVal - freeCash);

    const summary: T212AccountSummary = {
      cash: {
        free: freeCash,
        total: totalCash,
        interest: raw.cash?.interest ?? 0,
      },
      investments: {
        total: investmentsVal,
        ppl,
        result: raw.investments?.realizedProfitLoss ?? raw.investments?.result ?? 0,
      },
      total: totalVal,
    };

    cachedSummary = { data: summary, timestamp: now };
    return summary;
  } catch (err: unknown) {
    if (cachedSummary) {
      return cachedSummary.data;
    }
    if (DEMO_FALLBACK) {
      console.warn("[Trading212] Error consultando resumen, usando respaldo demo:", err);
      return getMockAccountSummary();
    }
    throw err;
  }
}

async function loadPositions(force = false): Promise<T212Position[]> {
  const now = Date.now();
  if (!force && cachedPositions && now - cachedPositions.timestamp < CACHE_TTL_MS) {
    return cachedPositions.data;
  }

  try {
    interface RawT212PositionItem {
      instrument?: {
        ticker?: string;
        name?: string;
        currency?: string;
        isin?: string;
      };
      ticker?: string;
      name?: string;
      quantity?: number;
      quantityAvailableForTrading?: number;
      currentPrice?: number;
      averagePricePaid?: number;
      averagePrice?: number;
      walletImpact?: {
        currency?: string;
        totalCost?: number;
        currentValue?: number;
        unrealizedProfitLoss?: number;
        fxImpact?: number;
      };
      ppl?: number;
    }

    const rawList = await t212Fetch<RawT212PositionItem[]>("/equity/positions");

    const cleanTickers = (rawList || []).map(i => (i.instrument?.ticker || i.ticker || "").split("_")[0]).filter(Boolean);
    const quotes = await fetchMultipleQuotes(cleanTickers).catch(() => new Map());

    const positions: T212Position[] = await Promise.all((rawList || []).map(async (item) => {
      const ticker = item.instrument?.ticker || item.ticker || "";
      const name = item.instrument?.name || item.name || ticker;
      const quantity = item.quantity ?? item.quantityAvailableForTrading ?? 0;
      
      // walletImpact contiene los valores convertidos a EUR por Trading 212
      if (item.walletImpact?.currency && item.walletImpact.currency !== "EUR") throw new Error("La valoración de Trading 212 no está en EUR");
      // A current FX rate cannot reconstruct a historical purchase cost.
      if (item.walletImpact?.totalCost == null && item.instrument?.currency !== "EUR") throw new Error(`Coste en EUR no disponible para ${ticker}`);
      const costEur = item.walletImpact?.totalCost ?? ((item.averagePricePaid ?? item.averagePrice ?? 0) * quantity);
      const rate = item.walletImpact?.currentValue != null ? 1 : await getEurConversionRate(item.instrument?.currency || "EUR");
      const valEur = item.walletImpact?.currentValue ?? ((item.currentPrice ?? 0) * quantity * rate);
      const pplEur = item.walletImpact?.unrealizedProfitLoss ?? (valEur - costEur);

      // Precios unitarios en EUR para mostrar coherencia
      const avgPriceEur = quantity > 0 ? costEur / quantity : (item.averagePricePaid ?? 0);
      const curPriceEur = quantity > 0 ? valEur / quantity : (item.currentPrice ?? avgPriceEur);

      const clean = ticker.split("_")[0];
      const quote = quotes.get(clean.toUpperCase());

      return {
        ticker,
        name,
        quantity,
        averagePrice: avgPriceEur,
        currentPrice: curPriceEur,
        nativeCurrentPrice: quote?.nativePrice ?? item.currentPrice,
        priceCurrency: quote?.nativeCurrency ?? item.instrument?.currency ?? "USD",
        dailyChangePct: quote?.changePct != null ? Number(quote.changePct.toFixed(2)) : undefined,
        ppl: Number(pplEur.toFixed(2)),
        totalCost: Number(costEur.toFixed(2)),
        currentValue: Number(valEur.toFixed(2)),
        returnPct: costEur > 0 ? Number(((pplEur / costEur) * 100).toFixed(2)) : 0,
        broker: "T212" as const,
      };
    }));

    cachedPositions = { data: positions, timestamp: now };
    return positions;
  } catch (err: unknown) {
    if (cachedPositions) {
      return cachedPositions.data;
    }
    if (DEMO_FALLBACK) {
      console.warn("[Trading212] Error consultando posiciones, usando respaldo demo:", err);
      return getMockPositions();
    }
    throw err;
  }
}

async function loadCashTransactions(limit: number = 50, force = false): Promise<T212Transaction[]> {
  const now = Date.now();
  if (!force && cachedTransactions && now - cachedTransactions.timestamp < CACHE_TTL_MS) {
    return cachedTransactions.data;
  }

  try {
    interface TransactionResponse {
      nextPagePath?: string | null;
      items: Array<{
        reference: string;
        dateTime: string;
        type: string;
        amount: number;
        currency?: string;
      }>;
    }
    let endpoint: string | null = `/equity/history/transactions?limit=${Math.min(50, limit)}`;
    const items: TransactionResponse["items"] = [];
    const seen = new Set<string>();
    while (endpoint) {
      if (seen.has(endpoint) || seen.size >= 100) throw new Error("No se pudo completar el histórico de movimientos de Trading 212");
      seen.add(endpoint);
      const data: TransactionResponse = await t212Fetch<TransactionResponse>(endpoint);
      items.push(...(data.items || []));
      endpoint = data.nextPagePath ? data.nextPagePath.replace(/^\/api\/v0/, "") : null;
      if (endpoint && !endpoint.startsWith("/equity/history/transactions?")) throw new Error("Paginación de movimientos no válida");
    }
    if (items.some(tx => tx.currency && tx.currency !== "EUR")) throw new Error("Movimientos en divisa distinta de EUR: falta su conversión histórica");
    const transactions = Array.from(new Map(items.map(tx => [tx.reference, tx])).values()).map((tx) => ({
      id: tx.reference,
      dateTime: tx.dateTime,
      type: tx.type,
      amount: tx.amount,
      currency: "EUR",
    }));

    cachedTransactions = { data: transactions, timestamp: now };
    return transactions;
  } catch (err: unknown) {
    if (cachedTransactions) {
      return cachedTransactions.data;
    }
    if (DEMO_FALLBACK) {
      console.warn("[Trading212] Error consultando movimientos, usando respaldo demo:", err);
      return getMockTransactions();
    }
    throw err;
  }
}

export async function checkApiHealth(): Promise<{ isConnected: boolean; message: string }> {
  try {
    const summary = await getAccountSummary();
    return {
      isConnected: true,
      message: `Conexión en vivo activa. Cuenta ID detectada (${summary.total.toFixed(2)} €)`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      isConnected: false,
      message: `Error conectando con Trading 212: ${errorMsg}`,
    };
  }
}

// ==========================================
// MOCK DATA PARA DEMOSTRACIÓN (SOLO SI SE ACTIVA)
// ==========================================

export function getMockAccountSummary(): T212AccountSummary {
  return {
    cash: { free: 450.75, total: 450.75, interest: 14.20 },
    investments: { total: 12480.50, ppl: 2285.50, result: 2285.50 },
    total: 12931.25,
  };
}

export function getMockPositions(): T212Position[] {
  return [
    {
      ticker: "VWCE_DE_EQ",
      name: "Vanguard FTSE All-World UCITS ETF",
      quantity: 45,
      averagePrice: 104.20,
      currentPrice: 124.80,
      ppl: 927.00,
      totalCost: 4689.00,
      currentValue: 5616.00,
      returnPct: 19.77,
      weightPct: 43.43,
    },
    {
      ticker: "AAPL_US_EQ",
      name: "Apple Inc.",
      quantity: 12,
      averagePrice: 156.40,
      currentPrice: 224.50,
      ppl: 817.20,
      totalCost: 1876.80,
      currentValue: 2694.00,
      returnPct: 43.54,
      weightPct: 20.83,
    },
  ];
}

export function getMockTransactions(): T212Transaction[] {
  const now = new Date();
  return [
    {
      id: "tx_01",
      dateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2).toISOString(),
      type: "INTEREST",
      amount: 1.45,
      currency: "EUR",
    },
    {
      id: "tx_02",
      dateTime: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      type: "DEPOSIT",
      amount: 500.00,
      currency: "EUR",
    },
  ];
}
