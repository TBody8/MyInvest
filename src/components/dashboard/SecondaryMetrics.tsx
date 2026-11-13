"use client";

import { PortfolioMetrics } from "@/types/trading212";
import { formatPct, cleanTicker } from "@/lib/utils";

interface SecondaryMetricsProps {
  metrics?: PortfolioMetrics;
}

export default function SecondaryMetrics({ metrics }: SecondaryMetricsProps) {
  const twr = metrics?.twr;
  const sp500 = metrics?.sp500Comparison;
  const concentration = metrics?.maxConcentration ?? {
    ticker: "N/A",
    weightPct: 0,
    isAlert: false,
  };
  const diversification = metrics?.diversification;

  const isSp500Beating = sp500 != null && sp500 >= 0;

  // Color de diversificación según nivel de correlación
  const getDiversificationColor = (label?: string) => {
    switch (label) {
      case "Alta":
        return "text-emerald-400";
      case "Moderada":
        return "text-sky-400";
      case "Concentrada":
        return "text-amber-300";
      default:
        return "text-zinc-400";
    }
  };

  return (
    <section className="border-t border-white/[0.06] pt-3 pb-2">
      <div className="grid grid-cols-4 divide-x divide-white/[0.06] text-center">
        {/* 1. TWR (Rigor FinanceToolkit) */}
        <div className="px-1 sm:px-3">
          <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            TWR
          </div>
          <div
            className={`text-xs sm:text-base font-bold font-mono tabular-nums mt-0.5 ${
              twr == null ? "text-zinc-400" : twr >= 0 ? "text-profit" : "text-loss"
            }`}
          >
            {twr == null ? "N/D" : formatPct(twr)}
          </div>
          <div className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5 hidden sm:block">
            Rendimiento puro
          </div>
        </div>

        {/* 2. vs S&P 500 */}
        <div className="px-1 sm:px-3">
          <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            vs S&P 500
          </div>
          <div
            className={`text-xs sm:text-base font-bold font-mono tabular-nums mt-0.5 ${
              sp500 == null ? "text-zinc-400" : isSp500Beating ? "text-profit" : "text-loss"
            }`}
          >
            {sp500 == null ? "N/D" : formatPct(sp500)}
          </div>
          <div className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5 hidden sm:block">
            {sp500 == null ? "Sin serie comparable" : isSp500Beating ? "Batiendo índice" : "Bajo índice"}
          </div>
        </div>

        {/* 3. CONCENTRACIÓN */}
        <div className="px-1 sm:px-3">
          <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            Concentración
          </div>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <span className="text-xs sm:text-base font-bold font-mono tabular-nums text-zinc-100">
              {concentration.weightPct.toFixed(1)}%
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 truncate max-w-[42px]">
              {cleanTicker(concentration.ticker)}
            </span>
          </div>
          <div className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5 hidden sm:block">
            Activo dominante
          </div>
        </div>

        {/* 4. DIVERSIFICACIÓN / CORRELACIÓN (Stock-Correlation) */}
        <div className="px-1 sm:px-3">
          <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            Diversificación
          </div>
          <div
            className={`text-xs sm:text-base font-bold font-mono tabular-nums mt-0.5 flex items-center justify-center gap-1 ${getDiversificationColor(
              diversification?.label
            )}`}
          >
            <span>{diversification?.score != null ? diversification.score.toFixed(2) : "N/D"}</span>
            <span className="text-[9px] uppercase font-sans font-medium px-1 py-0.2 rounded bg-white/[0.04]">
              {diversification?.label || "Sin datos"}
            </span>
          </div>
          <div className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5 hidden sm:block truncate">
            Correlación cartera
          </div>
        </div>
      </div>
    </section>
  );
}
