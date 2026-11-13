"use client";

import { ShieldCheck, AlertTriangle, CheckCircle2, Landmark } from "lucide-react";
import { FundamentalHistoryPoint, HistoricalMedians } from "@/types/fundamentals";

interface BalanceDebtCardProps {
  history: FundamentalHistoryPoint[];
  medians: HistoricalMedians;
  currency: string;
}

function formatAmount(val: number | null | undefined, sign: string): string {
  if (val == null) return "N/D";
  const abs = Math.abs(val);
  const prefix = val < 0 ? "-" : "";
  if (abs >= 1e12) return `${prefix}${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${prefix}${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${prefix}${sign}${(abs / 1e6).toFixed(1)}M`;
  return `${prefix}${sign}${abs.toFixed(2)}`;
}

export default function BalanceDebtCard({
  history,
  medians,
  currency,
}: BalanceDebtCardProps) {
  const currencySign = currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "USD" ? "$" : `${currency} `;
  const latest = history.length > 0 ? history[history.length - 1] : null;

  const cash = latest?.cashAndEquivalents ?? null;
  const debt = latest?.totalDebt ?? null;
  const netDebt = latest?.netDebt ?? null;
  const netDebtToEbitda = latest?.netDebtToEbitda ?? null;
  const debtToEquity = latest?.debtToEquity ?? null;
  const currentRatio = latest?.currentRatio ?? null;
  const interestCoverage = latest?.interestCoverage ?? null;

  const hasNetCash = netDebt != null && netDebt <= 0;

  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-[#080b11]/90 border border-white/[0.08] backdrop-blur-md space-y-3.5 font-mono">
      {/* 1. Cabecera */}
      <div className="flex flex-wrap gap-2 items-center justify-between pb-2 border-b border-white/[0.05]">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
          <Landmark className="w-4 h-4 text-emerald-400" />
          <span>Balance, Deuda y Solvencia</span>
        </div>
        <span className="text-[10px] text-zinc-400">
          Periodo {latest?.period || "Reciente"}
        </span>
      </div>

      {/* 2. Franja Compacta de Estructura de Capital (1 sola línea ultra-eficiente) */}
      <div
        className={`h-8 px-2.5 sm:px-3 rounded-lg border flex items-center justify-between gap-2 text-xs whitespace-nowrap overflow-hidden ${
          hasNetCash
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            : "bg-amber-500/10 border-amber-500/20 text-amber-300"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 pr-1 truncate">
          {hasNetCash ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
          <span className="font-bold text-[11px] truncate">
            {netDebt == null ? "Sin datos" : hasNetCash ? "Caja neta" : "Deuda neta"}
          </span>
          <span className="text-[9.5px] opacity-75 hidden sm:inline">
            {hasNetCash ? "(Excedente de liquidez sobre deuda)" : "(Requiere servicio financiero)"}
          </span>
        </div>

        <span className="text-[11px] font-bold tabular-nums shrink-0">
          Deuda Neta: {formatAmount(netDebt, currencySign)}
        </span>
      </div>

      {/* 3. Desglose en 3 Columnas Compactas (1 Sola Fila en Móvil) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
        <div className="p-2 sm:p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-center sm:text-left">
          <span className="text-[9px] text-zinc-400 block uppercase font-bold truncate">
            Caja + inv.
          </span>
          <span className="text-xs sm:text-sm font-bold text-emerald-400 tabular-nums block mt-0.5 truncate">
            {formatAmount(cash, currencySign)}
          </span>
          <span className="text-[8px] text-zinc-500 font-sans block truncate mt-0.5 hidden xs:block">
            Liquidez inmediata
          </span>
        </div>

        <div className="p-2 sm:p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-center sm:text-left">
          <span className="text-[9px] text-zinc-400 block uppercase font-bold truncate">
            Deuda Total
          </span>
          <span className="text-xs sm:text-sm font-bold text-rose-400 tabular-nums block mt-0.5 truncate">
            {formatAmount(debt, currencySign)}
          </span>
          <span className="text-[8px] text-zinc-500 font-sans block truncate mt-0.5 hidden xs:block">
            Bonos y préstamos
          </span>
        </div>

        <div className="p-2 sm:p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-center sm:text-left">
          <span className="text-[9px] text-zinc-400 block uppercase font-bold truncate">
            Deuda Neta
          </span>
          <span className="text-xs sm:text-sm font-bold text-white tabular-nums block mt-0.5 truncate">
            {formatAmount(netDebt, currencySign)}
          </span>
          <span className="text-[8px] text-zinc-500 font-sans block truncate mt-0.5 hidden xs:block">
            Deuda menos caja
          </span>
        </div>
      </div>

      {/* 4. Grid 2x2 de Ratios de Solvencia Institucionales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
        <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
          <span className="text-[9px] text-zinc-400 block uppercase font-bold">
            Deuda Neta / EBITDA
          </span>
          <span className="text-xs sm:text-sm font-bold text-white tabular-nums mt-0.5 block">
            {netDebtToEbitda != null ? `${netDebtToEbitda.toFixed(2)}x${hasNetCash ? " (Caja)" : ""}` : "N/D"}
          </span>
          <span className="text-[8.5px] text-zinc-500 block">Saludable si &lt; 2.5x</span>
        </div>

        <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
          <span className="text-[9px] text-zinc-400 block uppercase font-bold">
            Current Ratio
          </span>
          <span className="text-xs sm:text-sm font-bold text-emerald-400 tabular-nums mt-0.5 block">
            {currentRatio != null ? `${currentRatio.toFixed(2)}x` : "N/D"}
          </span>
          <span className="text-[8.5px] text-zinc-500 block">Activo cte / Pasivo cte</span>
        </div>

        <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
          <span className="text-[9px] text-zinc-400 block uppercase font-bold">
            Deuda / Patrimonio
          </span>
          <span className="text-xs sm:text-sm font-bold text-white tabular-nums mt-0.5 block">
            {debtToEquity != null ? `${debtToEquity.toFixed(2)}x` : "N/D"}
          </span>
          <span className="text-[8.5px] text-zinc-500 block">Grado de apalancamiento</span>
        </div>

        <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
          <span className="text-[9px] text-zinc-400 block uppercase font-bold">
            Cobertura Intereses
          </span>
          <span className="text-xs sm:text-sm font-bold text-sky-400 tabular-nums mt-0.5 block">
            {interestCoverage != null ? `${interestCoverage.toFixed(0)}x` : "N/D"}
          </span>
          <span className="text-[8.5px] text-zinc-500 block">EBIT / Gastos Financieros</span>
        </div>
      </div>
    </div>
  );
}
