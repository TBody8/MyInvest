"use client";

import { Scale, Target, TrendingUp, BarChart2 } from "lucide-react";
import { ValuationSummary, HistoricalMultiplesPoint } from "@/types/fundamentals";

interface ValuationCardProps {
  valuation: ValuationSummary;
  historicalMultiples: HistoricalMultiplesPoint[];
  currentPrice?: number | null;
  currency: string;
}

export default function ValuationCard({
  valuation,
  historicalMultiples,
  currentPrice,
  currency,
}: ValuationCardProps) {
  const currencySign = currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "USD" ? "$" : `${currency} `;

  const targetMean = valuation.targetMeanPrice;
  const upsidePct =
    currentPrice && targetMean && currentPrice > 0
      ? ((targetMean - currentPrice) / currentPrice) * 100
      : null;

  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-[#080b11]/90 border border-white/[0.08] backdrop-blur-md space-y-3.5 font-mono">
      {/* 1. Cabecera */}
      <div className="flex flex-wrap gap-2 items-center justify-between pb-2 border-b border-white/[0.05]">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
          <Scale className="w-4 h-4 text-purple-400" />
          <span>Múltiplos de Valoración y Consenso</span>
        </div>
        {valuation.recommendationKey && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-bold border border-purple-500/20">
            {valuation.recommendationKey.replace("_", " ")}
          </span>
        )}
      </div>

      {/* 2. Grid de Múltiplos Actuales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
          <span className="text-[9px] text-zinc-400 block uppercase font-bold">
            PER Trailing (12M)
          </span>
          <span className="text-sm sm:text-base font-bold text-white tabular-nums mt-0.5 block">
            {valuation.trailingPE != null ? `${valuation.trailingPE.toFixed(1)}x` : "N/D"}
          </span>
          <span className="text-[8.5px] text-zinc-500 block">Precio / Beneficio pasado</span>
        </div>

        <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <span className="text-[9px] text-purple-300 block uppercase font-bold">
            Forward PER (Futuro)
          </span>
          <span className="text-sm sm:text-base font-bold text-purple-300 tabular-nums mt-0.5 block">
            {valuation.forwardPE != null ? `${valuation.forwardPE.toFixed(1)}x` : "N/D"}
          </span>
          <span className="text-[8.5px] text-purple-400/80 block">Con beneficios esperados</span>
        </div>

        <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
          <span className="text-[9px] text-zinc-400 block uppercase font-bold">
            EV / EBITDA
          </span>
          <span className="text-sm sm:text-base font-bold text-white tabular-nums mt-0.5 block">
            {valuation.enterpriseToEbitda != null ? `${valuation.enterpriseToEbitda.toFixed(1)}x` : "N/D"}
          </span>
          <span className="text-[8.5px] text-zinc-500 block">Valor Empresa / EBITDA</span>
        </div>

        <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
          <span className="text-[9px] text-zinc-400 block uppercase font-bold">
            Precio / Ventas (P/S)
          </span>
          <span className="text-sm sm:text-base font-bold text-white tabular-nums mt-0.5 block">
            {valuation.priceToSales != null ? `${valuation.priceToSales.toFixed(1)}x` : "N/D"}
          </span>
          <span className="text-[8.5px] text-zinc-500 block">Capitalización / Ventas</span>
        </div>
      </div>

      {/* 3. Panel de Consenso Analistas y Precio Objetivo (Ultra-compacto en 1 sola línea) */}
      {targetMean != null && (
        <div className="min-h-10 py-2 px-2.5 sm:px-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex w-6 h-6 rounded-md bg-purple-500/20 border border-purple-500/30 items-center justify-center shrink-0">
              <Target className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-white whitespace-nowrap" data-testid="analyst-target">
                Objetivo: {currencySign}{targetMean.toFixed(2)}
              </span>
              <span className="text-[10px] text-zinc-400 font-sans truncate hidden xs:inline">
                ({valuation.numberOfAnalystOpinions || "Consenso"} analistas)
              </span>
            </div>
          </div>

          {upsidePct != null && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-[10.5px] sm:text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-md border ${
                  upsidePct >= 0
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}
              >
                {upsidePct >= 0 ? "+" : ""}
                {upsidePct.toFixed(1)}%<span className="hidden sm:inline"> Potencial</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* 4. Evolución de Múltiplos Históricos Recientes */}
      {historicalMultiples.length === 0 && <p className="text-[11px] text-zinc-400">Múltiplos históricos: N/D en el proveedor.</p>}
      {historicalMultiples.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            Evolución Trimestral de Múltiplos
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-[10px] text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-500 uppercase">
                  <th className="py-1 px-2 font-normal">Periodo</th>
                  <th className="py-1 px-2 font-normal text-right">Trailing PER</th>
                  <th className="py-1 px-2 font-normal text-right">Forward PER</th>
                  <th className="py-1 px-2 font-normal text-right">EV/EBITDA</th>
                  <th className="py-1 px-2 font-normal text-right">P/Ventas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {historicalMultiples.slice(0, 5).map((m, idx) => (
                  <tr key={`${m.period}-${idx}`} className="hover:bg-white/[0.02]">
                    <td className="py-1.5 px-2 text-zinc-300 font-bold">{m.period}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-white">
                      {m.trailingPE != null ? `${m.trailingPE.toFixed(1)}x` : "-"}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-purple-300">
                      {m.forwardPE != null ? `${m.forwardPE.toFixed(1)}x` : "-"}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-zinc-300">
                      {m.enterpriseToEbitda != null ? `${m.enterpriseToEbitda.toFixed(1)}x` : "-"}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-zinc-400">
                      {m.priceToSales != null ? `${m.priceToSales.toFixed(1)}x` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
