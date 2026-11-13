"use client";

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatEur, formatPct } from "@/lib/utils";

interface KpiHeaderProps {
  summary?: {
    totalValue: number;
    totalInvested: number;
    realProfit: number;
    realProfitPct: number;
    dailyChange: {
      amount: number | null;
      pct: number | null;
    };
  };
}

export default function KpiHeader({ summary }: KpiHeaderProps) {
  const realProfit = summary?.realProfit ?? 0;
  const realProfitPct = summary?.realProfitPct ?? 0;
  const totalInvested = summary?.totalInvested ?? 0;
  const totalValue = summary?.totalValue ?? 0;
  const dailyAmount = summary?.dailyChange?.amount;
  const dailyPct = summary?.dailyChange?.pct;

  const isPositive = realProfit >= 0;
  const isDailyPositive = dailyAmount != null && dailyAmount >= 0;

  return (
    <section className="pt-2 pb-1">
      {/* Etiqueta sutil */}
      <div className="text-[11px] font-mono tracking-wider uppercase text-zinc-400 mb-1">
        Beneficio Real
      </div>

      {/* Cifra Héroe de Beneficio Real */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2
          className={`text-3xl sm:text-4xl font-bold font-mono tracking-tight tabular-nums ${
            isPositive ? "text-profit" : "text-loss"
          }`}
        >
          {formatEur(realProfit, true)}
        </h2>
        <span
          className={`text-sm sm:text-base font-semibold font-mono tabular-nums ${
            isPositive ? "text-profit/90" : "text-loss/90"
          }`}
        >
          {formatPct(realProfitPct, true)}
        </span>
      </div>

      {/* Cápsula diaria estilizada */}
      <div className="mt-2 flex items-center gap-2">
        <div className="inline-flex items-center gap-1 font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] transition-colors">
          {dailyAmount == null ? null : isDailyPositive ? (
            <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0" />
          ) : (
            <ArrowDownRight className="w-3 h-3 text-rose-400 shrink-0" />
          )}
          <span
            className={`font-semibold tabular-nums ${
              dailyAmount == null ? "text-zinc-400" : isDailyPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {dailyAmount == null || dailyPct == null ? "N/D" : `${formatEur(dailyAmount, true)} (${formatPct(dailyPct, true)})`}
          </span>
          <span className="text-zinc-400 text-[10px]">hoy</span>
        </div>
      </div>

      {/* Bloque limpio de Valor de Cartera y Total Invertido (claros, legibles y bien contrastados) */}
      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/[0.06] max-w-sm font-mono">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-0.5">
            Valor Cartera
          </div>
          <div className="text-base sm:text-lg font-bold text-zinc-100 tabular-nums">
            {formatEur(totalValue)}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-0.5">
            Total Invertido
          </div>
          <div className="text-base sm:text-lg font-bold text-zinc-300 tabular-nums">
            {formatEur(totalInvested)}
          </div>
        </div>
      </div>
    </section>
  );
}
