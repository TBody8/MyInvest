// Trading 212 & Multi-Broker Dashboard Types

export type Timeframe = 'D' | 'W' | 'M' | 'Y' | 'ALL';
export type ChartView = 'profit' | 'value' | 'returnPct';
export type BrokerFilter = 'all' | 't212' | 'revolut';

export interface ChartViewOption {
  id: ChartView;
  label: string;
  unit: string;
  description: string;
}

// Account Summary
export interface T212AccountSummary {
  cash: {
    free: number;
    total: number;
    interest: number;
  };
  investments: {
    total: number;
    ppl: number;
    result: number;
  };
  total: number;
}

// Position item
export interface T212Position {
  ticker: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  nativeCurrentPrice?: number;
  priceCurrency?: string;
  ppl: number;
  fxPpl?: number;
  initialFillDate?: string;
  totalCost?: number;
  currentValue?: number;
  returnPct?: number;
  weightPct?: number;
  name?: string;
  broker?: 'T212' | 'REVOLUT';
  nextEarningsDate?: string;
  earningsEstimate?: string;
  dailyChangePct?: number;
}

// Cash Transaction
export interface T212Transaction {
  id: string;
  dateTime: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'INTEREST' | string;
  amount: number;
  currency: string;
}

// Historical Chart Point
export interface ChartPoint {
  timestamp?: number;
  date: string;
  fullDate: string;
  realProfit: number;
  realProfitPct: number;
  totalValue: number;
  totalInvested: number;
  activeProfit?: number | null;
  activeValue?: number | null;
  activeReturnPct?: number | null;
  tradeEvent?: {
    type: 'BUY' | 'SELL';
    label: string;
  };
}

// Secondary Analytics Metrics
export interface PortfolioMetrics {
  twr: number | null;
  sp500Comparison: number | null;
  maxDrawdown?: number | null;
  diversification?: {
    score: number;
    label: string;
    details?: string;
  };
  maxConcentration: {
    ticker: string;
    weightPct: number;
    isAlert: boolean;
  };
}

// Monthly Heatmap Cell
export interface HeatmapMonth {
  year: number;
  month: number;
  monthName: string;
  returnPct: number;
  profitEuro: number;
}

// Full Dashboard State Payload
export interface DashboardData {
  accountSummary: {
    totalValue: number;
    totalInvested: number;
    realProfit: number;
    realProfitPct: number;
    unrealizedProfit: number;
    dailyChange: {
      amount: number | null;
      pct: number | null;
    };
  };
  metrics: PortfolioMetrics;
  positions: T212Position[];
  chartData: Record<Timeframe, ChartPoint[]>;
  heatmap: HeatmapMonth[];
  transactions: T212Transaction[];
  isDemoData: boolean;
  lastUpdated: string;
  broker: BrokerFilter;
  eurUsdRate?: number;
  dataNotice?: string;
}
