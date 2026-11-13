"use client";

import { useMemo } from "react";
import { Coins, ArrowDownRight, ArrowUpRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { FundamentalHistoryPoint, HistoricalMedians } from "@/types/fundamentals";

interface CashFlowCardProps {
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

export default function CashFlowCard({
  history,
  medians,
  currency,
}: CashFlowCardProps) {
  const currencySign = currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "USD" ? "$" : `${currency} `;

  // Tomar el periodo más reciente cerrado
  const latest = history.length > 0 ? history[history.length - 1] : null;

  const ocf = latest?.operatingCashFlow ?? null;
  const capex = latest?.capex ?? null;
  const fcf = latest?.freeCashFlow ?? null;
  const conversion = latest?.cashConversion ?? null;
  const capexCov = latest?.capexCoverage ?? null;
  const fcfPerShare = latest?.fcfPerShare ?? null;

  // Clasificación de la conversión de caja
  let convStatus = "Sin datos comparables";
  let convColor = "text-zinc-300";
  let convBadge = "bg-white/[0.04] text-zinc-300 border-white/[0.08]";

  if (conversion != null) {
    if (conversion >= 100) {
      convStatus = "Excelente (>100% beneficio se convierte en caja real)";
      convColor = "text-emerald-400";
      convBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    } else if (conversion >= 80) {
      convStatus = "Saludable (Alta generación de caja operativa)";
      convColor = "text-sky-400";
      convBadge = "bg-sky-500/10 text-sky-400 border-sky-500/20";
    } else {
      convStatus = "Atención (Beneficio contable no se traduce en caja)";
      convColor = "text-amber-400";
      convBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  }

  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-[#080b11]/90 border border-white/[0.08] backdrop-blur-md space-y-3.5 font-mono">
      {/* 1. Cabecera */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
          <Coins className="w-4 h-4 text-sky-400" />
          <span>Flujo de Caja, CapEx y Conversión</span>
        </div>
        <span className="text-[10px] text-zinc-400">
          Periodo {latest?.period || "Reciente"}
        </span>
      </div>

      {/* 2. Visualizador en 3 Columnas: OCF - CapEx = FCF */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Flujo Operativo (OCF) */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <span className="text-[10px] text-zinc-400 block uppercase font-bold">
            Flujo de Caja Operativo
          </span>
          <span className={`text-sm sm:text-base font-bold ${ocf != null && ocf < 0 ? "text-rose-400" : "text-emerald-400"} tabular-nums block mt-1`}>
            {formatAmount(ocf, currencySign)}
          </span>
          <span className="text-[9.5px] text-zinc-500 font-sans block mt-0.5">
            Caja neta generada por el negocio
          </span>
        </div>

        {/* CapEx (Inversión en Capital) */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <span className="text-[10px] text-zinc-400 block uppercase font-bold">
            CapEx (Inversión Capital)
          </span>
          <span className="text-sm sm:text-base font-bold text-amber-400 tabular-nums block mt-1">
            {formatAmount(capex, currencySign)}
          </span>
          <span className="text-[9.5px] text-zinc-500 font-sans block mt-0.5">
            Reinversión en fábricas y servidores
          </span>
        </div>

        {/* Flujo Libre de Caja (FCF) */}
        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
          <span className="text-[10px] text-sky-300 block uppercase font-bold">
            Free Cash Flow (FCF)
          </span>
          <span className={`text-sm sm:text-base font-bold ${fcf != null && fcf < 0 ? "text-rose-400" : "text-sky-300"} tabular-nums block mt-1`}>
            {formatAmount(fcf, currencySign)}
          </span>
          <span className="text-[9.5px] text-sky-400/80 font-sans block mt-0.5">
            Flujo operativo menos inversión en capital
          </span>
        </div>
      </div>

      {/* 3. Diagnóstico de Calidad: Conversión de Beneficio en Caja y Cobertura CapEx */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {/* Ratio de Conversión */}
        <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-400 uppercase font-bold">Conversión de Beneficio en Caja</span>
            <span className={`font-bold tabular-nums text-xs ${convColor}`}>
              {conversion != null ? `${conversion.toFixed(1)}%` : "N/D"}
            </span>
          </div>

          <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${Math.min(100, Math.max(0, conversion ?? 0))}%` }}
              className={`h-full rounded-full ${
                conversion && conversion >= 80 ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
          </div>

          <span className={`text-[9.5px] px-2 py-0.5 rounded border inline-block ${convBadge}`}>
            {convStatus}
          </span>
        </div>

        {/* Cobertura de CapEx & FCF por Acción */}
        <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 block uppercase font-bold">
              Cobertura del CapEx
            </span>
            <span className="text-xs sm:text-sm font-bold text-white tabular-nums mt-0.5 block">
              {capexCov != null ? `${capexCov.toFixed(1)}x` : "N/D"}
            </span>
            <span className="text-[9px] text-zinc-500 font-sans">
              Veces que la caja cubre la inversión
            </span>
          </div>

          {fcfPerShare != null && (
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">
                FCF por Acción
              </span>
              <span className="text-xs sm:text-sm font-bold text-sky-400 tabular-nums mt-0.5 block">
                {currencySign}{fcfPerShare.toFixed(2)}
              </span>
              <span className="text-[9px] text-zinc-500 font-sans">
                Flujo neto por título
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
