"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Target, Calendar, Minimize2 } from "lucide-react";
import { T212Position } from "@/types/trading212";
import { formatEur, formatPct, formatUsd, cleanTicker } from "@/lib/utils";
import InteractiveTradingViewChart, { CandleData } from "./InteractiveTradingViewChart";

interface AssetDetailDrawerProps {
  position: T212Position | null;
  onClose: () => void;
  marketOnly?: boolean;
}

type TimeframeOption = "1D" | "1S" | "1M" | "1A" | "TODO";
type ChartMode = "line" | "candles";

const TIMEFRAMES: TimeframeOption[] = ["1D", "1S", "1M", "1A", "TODO"];

export default function AssetDetailDrawer({ position, onClose, marketOnly = false }: AssetDetailDrawerProps) {
  const [timeframe, setTimeframe] = useState<TimeframeOption>("1M");
  const [chartMode, setChartMode] = useState<ChartMode>("candles");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const rawTicker = position?.ticker || "";
  const ticker = cleanTicker(rawTicker);

  // Bloquear el scroll de la web de fondo cuando el gráfico se expande
  useEffect(() => {
    if (position && (isExpanded || marketOnly)) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isExpanded, marketOnly, position]);

  const { data, isLoading } = useQuery({
    queryKey: ["asset-details", ticker, timeframe],
    queryFn: async () => {
      if (!ticker) return null;
      const res = await fetch(`/api/asset/details?ticker=${encodeURIComponent(ticker)}&timeframe=${timeframe}`);
      if (!res.ok) throw new Error("Error cargando detalles del activo");
      return res.json();
    },
    enabled: Boolean(ticker && position),
    staleTime: 60 * 1000,
  });

  if (!position) return null;

  const candles: CandleData[] = data?.candles || [];
  const stats = data?.stats;

  // Divisa nativa del activo (USD para acciones de EE.UU. como NVDA/AVGO, EUR para ETFs como IUSQ)
  const currency: string = data?.currency || "N/D";

  // Formateador condicional por divisa para cotizaciones
  const formatAssetPrice = (val: number | null | undefined, decimals = 2) => {
    if (val === null || val === undefined || isNaN(val)) return "N/D";
    return currency === "USD" ? formatUsd(val) : currency === "EUR" ? formatEur(val) : `${val.toFixed(decimals)} ${currency}`;
  };

  // Precio actual del activo en su divisa nativa
  const currentAssetPrice = data?.currentPrice ?? (marketOnly ? position.currentPrice :
    data?.eurPerUnit > 0 ? position.currentPrice / data.eurPerUnit : NaN);

  // Precio medio de compra por acción en la divisa correspondiente (Intrinsic / Average purchase price)
  const averageBuyPrice = position.averagePrice;

  // Cálculos de posición propia (SIEMPRE EN EUROS € para el balance de cartera)
  const totalCost = position.totalCost !== undefined && position.totalCost > 0
    ? position.totalCost
    : position.quantity * position.averagePrice;
  const currentPriceInEur = data?.currentPriceEur || position.currentPrice;
  const myValue = position.currentValue || position.quantity * currentPriceInEur;
  const myPpl = myValue - totalCost;
  const myPplPct = totalCost > 0 ? (myPpl / totalCost) * 100 : 0;
  const isPos = myPpl >= 0;

  // Target price de Wall Street y potencial
  const targetPrice = stats?.targetMeanPrice;
  const upsidePct = targetPrice && currentAssetPrice > 0
    ? Number((((targetPrice - currentAssetPrice) / currentAssetPrice) * 100).toFixed(1))
    : null;

  // Rango 52 semanas
  const high52 = stats?.fiftyTwoWeekHigh;
  const low52 = stats?.fiftyTwoWeekLow;
  let range52Pct = 50;
  if (high52 && low52 && high52 > low52 && currentAssetPrice) {
    range52Pct = Math.max(0, Math.min(100, Math.round(((currentAssetPrice - low52) / (high52 - low52)) * 100)));
  }

  // 1. MODO EXPANDIDO / PANTALLA COMPLETA TRADINGVIEW
  if (isExpanded || marketOnly) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-[#070a10] p-2 sm:p-4 landscape:p-1 font-mono text-zinc-100 select-none overflow-hidden h-[100dvh] max-h-[100dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera superior compacta en modo expandido */}
        <div className="flex items-center justify-between pb-1.5 landscape:pb-0.5 border-b border-white/[0.06] flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-base sm:text-lg font-bold text-white tracking-tight">{ticker}</span>
            <span className="text-xs font-bold tabular-nums text-white">
              {formatAssetPrice(currentAssetPrice)}
            </span>
            <span
              className={`text-[11px] font-bold tabular-nums ${
                position.dailyChangePct && position.dailyChangePct >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {position.dailyChangePct && position.dailyChangePct >= 0 ? "+" : ""}
              {position.dailyChangePct ? position.dailyChangePct.toFixed(2) : "0.00"}% hoy
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Selector de Modo (Sin emojis) */}
            <div className="inline-flex p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs">
              <button
                onClick={() => setChartMode("line")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  chartMode === "line" ? "bg-white/[0.12] text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Línea
              </button>
              <button
                onClick={() => setChartMode("candles")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  chartMode === "candles" ? "bg-white/[0.12] text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Velas
              </button>
            </div>

            {/* Selector Temporal */}
            <div className="inline-flex p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    timeframe === tf ? "bg-white/[0.12] text-white font-bold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Minimizar */}
            <button
              onClick={() => marketOnly ? onClose() : setIsExpanded(false)}
              className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
              title={marketOnly ? "Cerrar gráfico" : "Volver a la ficha reducida"}
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Gráfico TradingView ocupando TODO el espacio vertical sin desbordar */}
        <div className="flex-1 my-1 min-h-0 h-full overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500 animate-pulse font-mono">
              Descargando cotizaciones OHLC de {ticker}...
            </div>
          ) : candles.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
              Sin datos de cotización disponibles
            </div>
          ) : (
            <InteractiveTradingViewChart
              candles={candles}
              currentPrice={currentAssetPrice}
              chartMode={chartMode}
              timeframe={timeframe}
              currency={currency}
              technicalLevels={stats?.technicalLevels}
              isExpanded={true}
               onToggleExpand={() => marketOnly ? onClose() : setIsExpanded(false)}
            />
          )}
        </div>
      </div>
    );
  }

  // 2. MODO RESUMIDO DE FICHA TÉCNICA (DRAWER ESTÁNDAR)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0e131f] border border-white/[0.1] rounded-2xl p-4 sm:p-5 shadow-2xl overflow-y-auto max-h-[92vh] font-mono text-xs text-zinc-100 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header de la Ficha Técnica */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white">{ticker}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
                {position.broker === "REVOLUT" ? "Revolut" : "Trading 212"}
              </span>
              {position.nextEarningsDate && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  <span>{position.nextEarningsDate}</span>
                </span>
              )}
            </div>
            <p className="text-zinc-400 text-[11px] font-sans truncate max-w-[280px] mt-0.5">
              {stats?.name || position.name || ticker}
            </p>
          </div>

          <div className="text-right">
            <div className="text-base sm:text-lg font-bold tabular-nums text-white">
              {formatAssetPrice(currentAssetPrice)}
            </div>
            <div className={`text-[11px] tabular-nums font-bold ${position.dailyChangePct && position.dailyChangePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {position.dailyChangePct && position.dailyChangePct >= 0 ? "+" : ""}{position.dailyChangePct ? position.dailyChangePct.toFixed(2) : "0.00"}% hoy
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 -mr-1 -mt-1 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen de tu posición en esta acción:
            - Acciones y precio medio en su divisa nativa ($/acc o €/acc)
            - Valor actual, coste total e importe de beneficio en EUROS (€) */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
          <div>
            <span className="text-[10px] text-zinc-500 block">En Cartera</span>
            <span className="font-bold tabular-nums text-zinc-200">{position.quantity} acc</span>
            <span className="text-[9px] text-zinc-400 block mt-0.5">
              {formatEur(averageBuyPrice)}/acc · coste EUR
            </span>
          </div>

          <div>
            <span className="text-[10px] text-zinc-500 block">Valor Actual</span>
            <span className="font-bold tabular-nums text-zinc-100">{formatEur(myValue)}</span>
            <span className="text-[9px] text-zinc-500 block mt-0.5">
              Coste: {formatEur(totalCost)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-zinc-500 block">Tu Beneficio</span>
            <span className={`font-bold tabular-nums ${isPos ? "text-profit" : "text-loss"}`}>
              {formatEur(myPpl, true)}
            </span>
            <span className={`text-[9px] tabular-nums block mt-0.5 ${isPos ? "text-profit/80" : "text-loss/80"}`}>
              {formatPct(myPplPct, true)}
            </span>
          </div>
        </div>

        {/* Barra de Controles: Selector de Timeframe y Selector de Modo (Sin emojis) */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          {/* Selector de Modo */}
          <div className="inline-flex p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px]">
            <button
              onClick={() => setChartMode("line")}
              className={`px-2.5 py-1 rounded transition-colors ${
                chartMode === "line" ? "bg-white/[0.12] text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Línea
            </button>
            <button
              onClick={() => setChartMode("candles")}
              className={`px-2.5 py-1 rounded transition-colors ${
                chartMode === "candles" ? "bg-white/[0.12] text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Velas
            </button>
          </div>

          {/* Selector Temporal */}
          <div className="inline-flex p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px]">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded transition-colors ${
                  timeframe === tf ? "bg-white/[0.12] text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Gráfico Profesional Interactivo TradingView (Click para expandir) */}
        <div
          className="w-full relative cursor-pointer group"
          onClick={() => setIsExpanded(true)}
          title="Haz clic para abrir el gráfico en modo expandido TradingView"
        >
          {isLoading ? (
            <div className="h-[220px] sm:h-[260px] flex items-center justify-center text-xs text-zinc-500 animate-pulse font-mono border border-white/[0.04] rounded-xl bg-[#070a10]">
              Descargando cotizaciones OHLC de {ticker}...
            </div>
          ) : candles.length === 0 ? (
            <div className="h-[220px] sm:h-[260px] flex items-center justify-center text-xs text-zinc-500 font-mono border border-white/[0.04] rounded-xl bg-[#070a10]">
              Sin datos de cotización disponibles
            </div>
          ) : (
            <InteractiveTradingViewChart
              candles={candles}
              currentPrice={currentAssetPrice}
              chartMode={chartMode}
              timeframe={timeframe}
              currency={currency}
              technicalLevels={stats?.technicalLevels}
              isExpanded={false}
              onToggleExpand={() => setIsExpanded(true)}
            />
          )}
        </div>

        {/* Métricas Fundamentales & Wall Street */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
          <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Target className="w-3 h-3 text-amber-400" />
              <span>Consenso de Wall Street</span>
            </span>
            {stats?.recommendation && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {stats.recommendation}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[9px] text-zinc-500 block">Precio Objetivo</span>
              <span className="font-bold text-zinc-100 tabular-nums">
                {targetPrice ? formatAssetPrice(targetPrice) : "N/D"}
              </span>
              {upsidePct !== null && (
                <span className={`text-[9px] block mt-0.5 ${upsidePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {upsidePct >= 0 ? `+${upsidePct}%` : `${upsidePct}%`}
                </span>
              )}
            </div>

            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[9px] text-zinc-500 block">Forward P/E</span>
              <span className="font-bold text-zinc-200 tabular-nums">
                {stats?.forwardPE ? `${stats.forwardPE}x` : "N/D"}
              </span>
            </div>

            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[9px] text-zinc-500 block">Beta (Volatilidad)</span>
              <span className="font-bold text-zinc-200 tabular-nums">
                {stats?.beta ? stats.beta.toFixed(2) : "N/D"}
              </span>
            </div>

            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[9px] text-zinc-500 block">Resultados (Q3/Q4)</span>
              <span className="font-bold text-amber-300">
                {position.nextEarningsDate || "N/D"}
              </span>
            </div>
          </div>

          {/* Rango 52 Semanas */}
          {high52 && low52 && (
            <div className="pt-2 border-t border-white/[0.04] space-y-1">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>Rango 52 semanas</span>
                <span className="text-zinc-300 tabular-nums">
                  {formatAssetPrice(low52)} - {formatAssetPrice(high52)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden relative">
                <div
                  style={{ width: `${range52Pct}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 rounded-full"
                />
              </div>
            </div>
          )}

          {/* Niveles Técnicos Institucionales Verificados */}
          {stats?.technicalLevels && (stats.technicalLevels.support || stats.technicalLevels.resistance) && (
            <div className="pt-2 border-t border-white/[0.04] grid grid-cols-2 gap-2 text-[10px]">
              {stats.technicalLevels.support && (
                <div className="p-1.5 rounded bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between">
                  <span className="text-zinc-400">Suelo (SMA 200)</span>
                  <span className="font-bold text-emerald-400 tabular-nums">{formatAssetPrice(stats.technicalLevels.support)}</span>
                </div>
              )}
              {stats.technicalLevels.resistance && (
                <div className="p-1.5 rounded bg-rose-500/5 border border-rose-500/15 flex items-center justify-between">
                  <span className="text-zinc-400">Techo Analistas</span>
                  <span className="font-bold text-rose-400 tabular-nums">{formatAssetPrice(stats.technicalLevels.resistance)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
