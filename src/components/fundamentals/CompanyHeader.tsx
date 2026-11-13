"use client";

import { useState } from "react";
import { Building2, Globe, TrendingUp, TrendingDown, Layers, CandlestickChart } from "lucide-react";
import { CompanyProfile, FundamentalPeriodType } from "@/types/fundamentals";

interface CompanyHeaderProps {
  profile: CompanyProfile;
  periodType: FundamentalPeriodType;
  onChangePeriod: (period: FundamentalPeriodType) => void;
  onOpenTechnicalChart?: () => void;
}

export default function CompanyHeader({
  profile,
  periodType,
  onChangePeriod,
  onOpenTechnicalChart,
}: CompanyHeaderProps) {
  const [imgError, setImgError] = useState(false);

  const isPositive = (profile.changePercent ?? 0) >= 0;
  const currencySign = profile.currency === "EUR" ? "€" : profile.currency === "GBP" ? "£" : profile.currency === "USD" ? "$" : `${profile.currency || "N/D"} `;

  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-[#080b11]/90 border border-white/[0.08] backdrop-blur-md space-y-3 font-mono">
      {/* 1. Fila Principal: Logo, Nombre, Ticker, Cotización y Botón Gráfico Técnico */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo Oficial de la Compañía */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/[0.04] border border-white/[0.12] p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
            {!imgError ? (
              <img
                src={profile.logoUrl}
                alt={profile.name}
                className="w-full h-full object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs bg-sky-500/20 rounded-lg">
                {profile.ticker.slice(0, 3)}
              </div>
            )}
          </div>

          {/* Nombre y Ticker */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                {profile.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20">
                {profile.ticker}
              </span>
            </div>

            {/* Chips de Sector e Industria */}
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-sans mt-0.5 flex-wrap">
              <span>{profile.sector}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-300">{profile.industry}</span>
              {profile.country && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-400">{profile.country}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Cotización en Vivo + Botón Discreto Gráfico Técnico */}
        {profile.currentPrice != null && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <div className="text-base sm:text-lg font-bold text-white tabular-nums">
                {currencySign}
                {profile.currentPrice.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              {profile.changePercent != null && (
                <div
                  className={`text-[11px] font-bold tabular-nums flex items-center justify-end gap-0.5 ${
                    isPositive ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>
                    {isPositive ? "+" : ""}
                    {profile.changePercent.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>

            {/* Botón Discreto Gráfico Técnico Interactivo (Velas Japonesas) */}
            {onOpenTechnicalChart && (
              <button
                onClick={onOpenTechnicalChart}
                title="Abrir gráfico técnico con velas japonesas"
                className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-sky-500/40 text-zinc-400 hover:text-sky-300 flex items-center justify-center transition-all active:scale-95 group"
              >
                <CandlestickChart className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Selector Temporal Compacto (Sin Emojis, Estilo Institucional) */}
      <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between flex-wrap gap-2 text-xs">
        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
          Periodo de Análisis
        </span>

        <div className="inline-flex items-center p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[11px]">
          <button
            onClick={() => onChangePeriod("annual")}
            className={`px-3 py-1 rounded-md transition-all ${
              periodType === "annual"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Anual
          </button>

          <button
            onClick={() => onChangePeriod("quarterly")}
            className={`px-3 py-1 rounded-md transition-all ${
              periodType === "quarterly"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Trimestral
          </button>

          <button
            onClick={() => onChangePeriod("ttm")}
            className={`px-3 py-1 rounded-md transition-all ${
              periodType === "ttm"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            TTM
          </button>
        </div>
      </div>
    </div>
  );
}
