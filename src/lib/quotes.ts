// Market prices retain their currency until explicitly converted to EUR.
export interface QuoteData {
  price: number;
  currency: string;
  changePct: number;
  name?: string;
  timestamp: number;
  nativePrice?: number;
  nativeCurrency?: string;
}

const nativeCache = new Map<string, QuoteData>();
const fxCache = new Map<string, { rate: number; timestamp: number }>();
const TTL = 60_000;
const SYMBOLS: Record<string, string> = { IUSQ: "IUSQ.DE", "6AQQ": "6AQQ.DE", IS3N: "IS3N.DE", IUSN: "IUSN.DE", QDVE: "QDVE.DE" };

export function normalizeTicker(ticker: string): string {
  const clean = ticker.trim().toUpperCase().split("_")[0];
  return SYMBOLS[clean] || clean;
}

export function clearQuoteCache(): void {
  nativeCache.clear();
  fxCache.clear();
}

async function chart(symbol: string, query: string) {
  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`, {
    headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store", signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Cotización no disponible para ${symbol} (${res.status})`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`Sin datos de mercado para ${symbol}`);
  return result;
}

export async function fetchNativeQuote(ticker: string): Promise<QuoteData> {
  const symbol = normalizeTicker(ticker);
  const cached = nativeCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < TTL) return cached;
  const { meta } = await chart(symbol, "interval=1d&range=1d");
  if (!Number.isFinite(meta?.regularMarketPrice) || meta.regularMarketPrice <= 0 || !meta.currency) {
    throw new Error(`Precio o divisa no disponibles para ${symbol}`);
  }
  const previous = meta.chartPreviousClose || meta.previousClose;
  const q: QuoteData = {
    price: meta.regularMarketPrice, currency: meta.currency,
    changePct: previous > 0 ? (meta.regularMarketPrice / previous - 1) * 100 : 0,
    name: meta.shortName || meta.longName || symbol, timestamp: Date.now(),
  };
  nativeCache.set(symbol, q);
  return q;
}

/** EUR for one unit of the quoted currency. Historical dates use the last available
 * daily FX close on or before that date (weekends/holidays), never today's rate. */
export async function getEurConversionRate(currency: string, date?: string): Promise<number> {
  const minorUnit = currency === "GBp" || currency === "GBX";
  const major = minorUnit ? "GBP" : currency;
  if (major === "EUR") return 1;
  if (!/^[A-Z]{3}$/.test(major)) throw new Error(`Divisa no compatible: ${currency}`);
  const key = `${currency}:${date || "live"}`;
  const cached = fxCache.get(key);
  if (cached && (date || Date.now() - cached.timestamp < TTL)) return cached.rate;
  let quotedRate: number;
  if (date) {
    const end = Date.parse(`${date}T00:00:00Z`) / 1000 + 86400;
    const result = await chart(`EUR${major}=X`, `interval=1d&period1=${end - 10 * 86400}&period2=${end}`);
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
    const valid = closes.map((close, i) => ({ close, time: result.timestamp?.[i] }))
      .filter((x) => x.close != null && Number.isFinite(x.close) && x.close > 0 && x.time < end);
    quotedRate = valid[valid.length - 1]?.close ?? NaN;
  } else {
    quotedRate = (await fetchNativeQuote(`EUR${major}=X`)).price;
  }
  if (!Number.isFinite(quotedRate) || quotedRate <= 0) throw new Error(`Cambio ${currency}/EUR no disponible${date ? ` para ${date}` : ""}`);
  const rate = 1 / quotedRate / (minorUnit ? 100 : 1);
  fxCache.set(key, { rate, timestamp: Date.now() });
  return rate;
}

export async function getLiveEurUsdRate(): Promise<number> {
  return 1 / await getEurConversionRate("USD");
}

export async function fetchLiveQuote(ticker: string): Promise<QuoteData> {
  const q = await fetchNativeQuote(ticker);
  return { ...q, price: q.price * await getEurConversionRate(q.currency), currency: "EUR", nativePrice: q.price, nativeCurrency: q.currency };
}

export async function fetchMultipleQuotes(tickers: string[]): Promise<Map<string, QuoteData>> {
  const map = new Map<string, QuoteData>();
  await Promise.all(tickers.map(async (ticker) => {
    const q = await fetchLiveQuote(ticker);
    map.set(ticker.toUpperCase(), q);
    map.set(normalizeTicker(ticker), q);
  }));
  return map;
}
