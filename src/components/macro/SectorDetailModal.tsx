"use client";

import { X, TrendingUp, TrendingDown, Layers, Building2, CheckCircle2, ExternalLink, ArrowRight } from "lucide-react";
import { SectorItem } from "@/app/api/macro/sectors/route";

interface SectorConstituent {
  ticker: string;
  name: string;
  weightPct: number;
}

interface SectorMetadataExtended {
  usEtf: { ticker: string; name: string };
  ucitsEtf: { ticker: string; name: string; isin?: string };
  holdings: SectorConstituent[];
  description: string;
}

export const SECTOR_CONSTITUENTS_DATA: Record<string, SectorMetadataExtended> = {
  XLK: {
    usEtf: { ticker: "XLK", name: "Technology Select Sector SPDR Fund" },
    ucitsEtf: { ticker: "QDVE", name: "iShares S&P 500 Information Technology UCITS ETF (EUR)" },
    description: "Hardware, semiconductores, software y servicios en la nube. Motor de crecimiento global.",
    holdings: [
      { ticker: "NVDA", name: "NVIDIA Corporation", weightPct: 21.5 },
      { ticker: "AAPL", name: "Apple Inc.", weightPct: 16.8 },
      { ticker: "MSFT", name: "Microsoft Corporation", weightPct: 14.2 },
      { ticker: "AVGO", name: "Broadcom Inc.", weightPct: 5.3 },
      { ticker: "CRM", name: "Salesforce Inc.", weightPct: 3.2 },
      { ticker: "AMD", name: "Advanced Micro Devices", weightPct: 2.9 },
    ],
  },
  XLV: {
    usEtf: { ticker: "XLV", name: "Health Care Select Sector SPDR Fund" },
    ucitsEtf: { ticker: "IUHC", name: "iShares S&P 500 Health Care Sector UCITS ETF (EUR)" },
    description: "Farmacéuticas, biotecnología y equipamiento médico. Sector defensivo con flujos de caja inelásticos.",
    holdings: [
      { ticker: "LLY", name: "Eli Lilly and Company", weightPct: 12.8 },
      { ticker: "UNH", name: "UnitedHealth Group Inc.", weightPct: 9.4 },
      { ticker: "JNJ", name: "Johnson & Johnson", weightPct: 6.8 },
      { ticker: "ABBV", name: "AbbVie Inc.", weightPct: 6.5 },
      { ticker: "MRK", name: "Merck & Co. Inc.", weightPct: 5.4 },
      { ticker: "TMO", name: "Thermo Fisher Scientific", weightPct: 4.1 },
    ],
  },
  XLE: {
    usEtf: { ticker: "XLE", name: "Energy Select Sector SPDR Fund" },
    ucitsEtf: { ticker: "IUES", name: "iShares S&P 500 Energy Sector UCITS ETF (EUR)" },
    description: "Petróleo, gas y refino. Cobertura tradicional contra la inflación con altos dividendos.",
    holdings: [
      { ticker: "XOM", name: "Exxon Mobil Corporation", weightPct: 23.4 },
      { ticker: "CVX", name: "Chevron Corporation", weightPct: 15.2 },
      { ticker: "COP", name: "ConocoPhillips", weightPct: 7.8 },
      { ticker: "WMB", name: "The Williams Companies", weightPct: 4.6 },
      { ticker: "SLB", name: "Schlumberger Limited", weightPct: 4.2 },
      { ticker: "EOG", name: "EOG Resources Inc.", weightPct: 4.1 },
    ],
  },
  XLF: {
    usEtf: { ticker: "XLF", name: "Financial Select Sector SPDR Fund" },
    ucitsEtf: { ticker: "IUFS", name: "iShares S&P 500 Financials Sector UCITS ETF (EUR)" },
    description: "Banca de inversión, tarjetas de crédito y seguros. Sensible a la curva de tipos de interés.",
    holdings: [
      { ticker: "BRK.B", name: "Berkshire Hathaway Inc.", weightPct: 13.8 },
      { ticker: "JPM", name: "JPMorgan Chase & Co.", weightPct: 11.2 },
      { ticker: "V", name: "Visa Inc.", weightPct: 7.6 },
      { ticker: "MA", name: "Mastercard Incorporated", weightPct: 6.4 },
      { ticker: "BAC", name: "Bank of America Corp.", weightPct: 4.5 },
      { ticker: "WFC", name: "Wells Fargo & Company", weightPct: 3.8 },
    ],
  },
  XLP: {
    usEtf: { ticker: "XLP", name: "Consumer Staples Select Sector SPDR Fund" },
    ucitsEtf: { ticker: "IUCS", name: "iShares S&P 500 Consumer Staples UCITS ETF (EUR)" },
    description: "Alimentación, bebidas y productos del hogar. Refugio clásico en fases de contracción económica.",
    holdings: [
      { ticker: "PG", name: "Procter & Gamble Co.", weightPct: 14.5 },
      { ticker: "COST", name: "Costco Wholesale Corp.", weightPct: 12.2 },
      { ticker: "WMT", name: "Walmart Inc.", weightPct: 11.4 },
      { ticker: "KO", name: "The Coca-Cola Company", weightPct: 9.8 },
      { ticker: "PEP", name: "PepsiCo Inc.", weightPct: 8.7 },
      { ticker: "PM", name: "Philip Morris International", weightPct: 5.6 },
    ],
  },
  XLU: {
    usEtf: { ticker: "XLU", name: "Utilities Select Sector SPDR Fund" },
    ucitsEtf: { ticker: "IUUS", name: "iShares S&P 500 Utilities Sector UCITS ETF (EUR)" },
    description: "Electricidad, agua y renovables. Demanda de energía impulsada por la electrificación e IA.",
    holdings: [
      { ticker: "NEE", name: "NextEra Energy Inc.", weightPct: 13.2 },
      { ticker: "SO", name: "The Southern Company", weightPct: 7.8 },
      { ticker: "DUK", name: "Duke Energy Corporation", weightPct: 7.1 },
      { ticker: "CEG", name: "Constellation Energy Corp.", weightPct: 6.8 },
      { ticker: "VST", name: "Vistra Corp.", weightPct: 5.4 },
      { ticker: "AEP", name: "American Electric Power", weightPct: 4.5 },
    ],
  },
  XLI: {
    usEtf: { ticker: "XLI", name: "Industrial Select Sector SPDR Fund" },
    ucitsEtf: { ticker: "IUIS", name: "iShares S&P 500 Industrials Sector UCITS ETF (EUR)" },
    description: "Aeroespacial, defensa, maquinaria pesada y transporte ferroviario.",
    holdings: [
      { ticker: "GE", name: "GE Aerospace", weightPct: 8.2 },
      { ticker: "CAT", name: "Caterpillar Inc.", weightPct: 6.8 },
      { ticker: "UNP", name: "Union Pacific Corporation", weightPct: 5.1 },
      { ticker: "RTX", name: "RTX Corporation", weightPct: 4.9 },
      { ticker: "HON", name: "Honeywell International", weightPct: 4.2 },
      { ticker: "DE", name: "Deere & Company", weightPct: 3.8 },
    ],
  },
  XLC: {
    usEtf: { ticker: "XLC", name: "Communication Services Select Sector SPDR" },
    ucitsEtf: { ticker: "IUCM", name: "iShares S&P 500 Communication Sector UCITS ETF (EUR)" },
    description: "Plataformas digitales, streaming, telecomunicaciones y entretenimiento.",
    holdings: [
      { ticker: "META", name: "Meta Platforms Inc.", weightPct: 23.8 },
      { ticker: "GOOGL", name: "Alphabet Inc. (Class A)", weightPct: 12.4 },
      { ticker: "GOOG", name: "Alphabet Inc. (Class C)", weightPct: 10.8 },
      { ticker: "NFLX", name: "Netflix Inc.", weightPct: 5.6 },
      { ticker: "DIS", name: "The Walt Disney Company", weightPct: 4.4 },
      { ticker: "TMUS", name: "T-Mobile US Inc.", weightPct: 4.2 },
    ],
  },
  XLY: {
    usEtf: { ticker: "XLY", name: "Consumer Discretionary Select Sector SPDR" },
    ucitsEtf: { ticker: "IUCD", name: "iShares S&P 500 Consumer Discretionary UCITS ETF (EUR)" },
    description: "Comercio electrónico, automoción, hoteles y restaurantes. Muy ligado al consumo privado.",
    holdings: [
      { ticker: "AMZN", name: "Amazon.com Inc.", weightPct: 23.5 },
      { ticker: "TSLA", name: "Tesla Inc.", weightPct: 16.8 },
      { ticker: "HD", name: "The Home Depot Inc.", weightPct: 9.2 },
      { ticker: "MCD", name: "McDonald's Corporation", weightPct: 5.2 },
      { ticker: "BKNG", name: "Booking Holdings Inc.", weightPct: 4.5 },
      { ticker: "NKE", name: "NIKE Inc.", weightPct: 3.1 },
    ],
  },
  XLRE: {
    usEtf: { ticker: "XLRE", name: "Real Estate Select Sector SPDR Fund" },
    ucitsEtf: { ticker: "IURE", name: "iShares S&P 500 Real Estate Sector UCITS ETF (EUR)" },
    description: "REITs inmobiliarios comerciales, logísticos y torres de telecomunicaciones.",
    holdings: [
      { ticker: "PLD", name: "Prologis Inc.", weightPct: 11.8 },
      { ticker: "AMT", name: "American Tower Corporation", weightPct: 9.2 },
      { ticker: "EQIX", name: "Equinix Inc.", weightPct: 8.4 },
      { ticker: "WELL", name: "Welltower Inc.", weightPct: 6.1 },
      { ticker: "SPG", name: "Simon Property Group", weightPct: 5.4 },
      { ticker: "PSA", name: "Public Storage", weightPct: 4.8 },
    ],
  },
  XLB: {
    usEtf: { ticker: "XLB", name: "Materials Select Sector SPDR Fund" },
    ucitsEtf: { ticker: "IUMS", name: "iShares S&P 500 Materials Sector UCITS ETF (EUR)" },
    description: "Química industrial, gases, metales y embalajes de packaging.",
    holdings: [
      { ticker: "LIN", name: "Linde plc", weightPct: 20.2 },
      { ticker: "SHW", name: "The Sherwin-Williams Company", weightPct: 7.4 },
      { ticker: "FCX", name: "Freeport-McMoRan Inc.", weightPct: 5.8 },
      { ticker: "ECL", name: "Ecolab Inc.", weightPct: 5.4 },
      { ticker: "APD", name: "Air Products & Chemicals", weightPct: 4.9 },
      { ticker: "NEM", name: "Newmont Corporation", weightPct: 4.6 },
    ],
  },
};

interface SectorDetailModalProps {
  sector: SectorItem | null;
  userTickers?: string[];
  onClose: () => void;
  onSelectStock?: (ticker: string) => void;
}

export default function SectorDetailModal({
  sector,
  userTickers = [],
  onClose,
  onSelectStock,
}: SectorDetailModalProps) {
  if (!sector) return null;

  const meta = SECTOR_CONSTITUENTS_DATA[sector.ticker] || {
    usEtf: { ticker: sector.ticker, name: sector.name },
    ucitsEtf: { ticker: sector.ticker, name: "ETF UCITS Equivalente" },
    description: "Sector económico del índice S&P 500.",
    holdings: [],
  };

  const isPos1M = sector.monthReturn >= 0;
  const isPos1W = sector.weekReturn >= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0e1320] border border-white/[0.12] rounded-2xl p-4 sm:p-5 shadow-2xl overflow-y-auto max-h-[90vh] font-mono text-xs text-zinc-100 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Cabecera */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base sm:text-lg font-bold text-white tracking-tight">{sector.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-sky-400 font-bold border border-white/[0.08]">
                {sector.ticker}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
              {meta.description}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Métricas Técnicas del Sector */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">Retorno 1 Mes</span>
            <span className={`text-xs font-bold tabular-nums mt-0.5 block ${isPos1M ? "text-emerald-400" : "text-rose-400"}`}>
              {isPos1M ? "+" : ""}{sector.monthReturn}%
            </span>
          </div>

          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">Fuerza 1 Semana</span>
            <span className={`text-xs font-bold tabular-nums mt-0.5 block ${isPos1W ? "text-emerald-400" : "text-rose-400"}`}>
              {isPos1W ? "+" : ""}{sector.weekReturn}%
            </span>
          </div>

          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">Precio ETF (USD)</span>
            <span className="text-xs font-bold text-zinc-200 tabular-nums mt-0.5 block">
              ${sector.currentPrice}
            </span>
          </div>
        </div>

        {/* 3. ETFs para Invertir en este Sector */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
          <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>ETFs de Referencia para este Sector</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
              <span className="text-zinc-500 text-[9px] block">🇺🇸 ETF Oficial Wall Street (USD)</span>
              <span className="font-bold text-white text-xs block mt-0.5">{meta.usEtf.ticker}</span>
              <span className="text-zinc-400 text-[9.5px] font-sans truncate block">{meta.usEtf.name}</span>
            </div>

            <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
              <span className="text-zinc-500 text-[9px] block">🇪🇺 ETF UCITS Europeo (EUR)</span>
              <span className="font-bold text-emerald-400 text-xs block mt-0.5">{meta.ucitsEtf.ticker}</span>
              <span className="text-zinc-400 text-[9.5px] font-sans truncate block">{meta.ucitsEtf.name}</span>
            </div>
          </div>
        </div>

        {/* 4. Las Principales Acciones que lo Componen (Top Holdings) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Acciones de referencia del sector</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-normal">Lista orientativa</span>
          </div>

          <div className="space-y-1.5">
            {meta.holdings.map((stock) => {
              const isOwned = userTickers.includes(stock.ticker);

              return (
                <button
                  type="button"
                  key={stock.ticker}
                  onClick={() => {
                    if (onSelectStock) {
                      onClose();
                      onSelectStock(stock.ticker);
                    }
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer group hover:border-sky-500/40 hover:bg-white/[0.06] ${
                    isOwned
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-white/[0.02] border-white/[0.04]"
                  }`}
                  title={`Ver fundamentales completos de ${stock.ticker}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white group-hover:text-sky-300 transition-colors">
                      {stock.ticker}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans truncate max-w-[130px] sm:max-w-[180px]">
                      {stock.name}
                    </span>
                    {isOwned && (
                      <span className="text-[8px] px-1.5 py-0.2 rounded bg-emerald-400/20 text-emerald-300 font-bold border border-emerald-400/30 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>En Cartera</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <span className="font-bold text-zinc-200 text-xs tabular-nums">
                        {stock.ticker}
                      </span>
                      <span className="text-[9px] text-zinc-400 block">Ver cuentas</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Botón de Cierre */}
        <div className="pt-2 border-t border-white/[0.06] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs transition-colors"
          >
            Cerrar Desglose
          </button>
        </div>
      </div>
    </div>
  );
}
