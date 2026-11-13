export type FundamentalPeriodType = "annual" | "quarterly" | "ttm";

export type FundamentalSubmenuTab =
  | "growth"
  | "margins"
  | "cashflow"
  | "balance"
  | "valuation";

export interface CompanyProfile {
  ticker: string;
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  country?: string | null;
  website?: string | null;
  currency: string;
  financialCurrency?: string | null;
  currentPrice?: number | null;
  changePercent?: number | null;
  marketCap?: number | null;
  enterpriseValue?: number | null;
  logoUrl: string;
}

export interface FundamentalHistoryPoint {
  period: string;
  date: string;
  isForecast: boolean;
  // Crecimiento
  revenue?: number | null;
  grossProfit?: number | null;
  ebitda?: number | null;
  operatingIncome?: number | null;
  netIncome?: number | null;
  eps?: number | null;
  revenueYoY?: number | null;
  netIncomeYoY?: number | null;
  epsYoY?: number | null;
  // Márgenes (%)
  grossMargin?: number | null;
  ebitdaMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  fcfMargin?: number | null;
  roe?: number | null;
  roic?: number | null;
  // Caja y CapEx
  operatingCashFlow?: number | null;
  capex?: number | null;
  freeCashFlow?: number | null;
  fcfPerShare?: number | null;
  cashConversion?: number | null;
  capexCoverage?: number | null;
  // Balance y Solvencia
  cashAndEquivalents?: number | null;
  totalDebt?: number | null;
  netDebt?: number | null;
  netDebtToEbitda?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  quickRatio?: number | null;
  interestCoverage?: number | null;
}

export interface FundamentalForecastPoint {
  period: string;
  label: string;
  code: string;
  isForecast: boolean;
  revenue?: number | null;
  revenueYoY?: number | null;
  revenueLow?: number | null;
  revenueHigh?: number | null;
  eps?: number | null;
  epsYoY?: number | null;
  netIncome?: number | null;
  netMargin?: number | null;
  numberOfAnalysts?: number | null;
}

export interface HistoricalMultiplesPoint {
  period: string;
  trailingPE?: number | null;
  forwardPE?: number | null;
  priceToSales?: number | null;
  enterpriseToEbitda?: number | null;
  enterpriseToRevenue?: number | null;
}

export interface ValuationSummary {
  trailingPE?: number | null;
  forwardPE?: number | null;
  pegRatio?: number | null;
  priceToSales?: number | null;
  enterpriseToEbitda?: number | null;
  enterpriseToRevenue?: number | null;
  priceToBook?: number | null;
  dividendYield?: number | null;
  beta?: number | null;
  targetMeanPrice?: number | null;
  targetHighPrice?: number | null;
  targetLowPrice?: number | null;
  recommendationKey?: string | null;
  numberOfAnalystOpinions?: number | null;
}

export interface HistoricalMedians {
  grossMargin?: number | null;
  ebitdaMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  fcfMargin?: number | null;
  roe?: number | null;
  roic?: number | null;
  cashConversion?: number | null;
  capexCoverage?: number | null;
  currentRatio?: number | null;
  netDebtToEbitda?: number | null;
}

export interface CompanyFundamentalsData {
  retrievedAt?: string;
  source?: string;
  profile: CompanyProfile;
  periodType: FundamentalPeriodType;
  history: FundamentalHistoryPoint[];
  forecasts: FundamentalForecastPoint[];
  medians: HistoricalMedians;
  valuation: ValuationSummary;
  historicalMultiples: HistoricalMultiplesPoint[];
  error?: string;
}
