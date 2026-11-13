"use client";

import { useState, useMemo } from "react";
import { TrendingUp, Users, BarChart3, HelpCircle } from "lucide-react";
import { FundamentalHistoryPoint, FundamentalForecastPoint } from "@/types/fundamentals";

type GrowthMetric = "revenue" | "grossProfit" | "ebitda" | "netIncome" | "eps";

interface GrowthChartProps {
  history: FundamentalHistoryPoint[];
  forecasts: FundamentalForecastPoint[];
  currency: string;
}

const METRICS: { id: GrowthMetric; label: string; key: keyof FundamentalHistoryPoint }[] = [
  { id: "revenue", label: "Ingresos", key: "revenue" },
  { id: "grossProfit", label: "Beneficio Bruto", key: "grossProfit" },
  { id: "ebitda", label: "EBITDA", key: "ebitda" },
  { id: "netIncome", label: "Beneficio Neto", key: "netIncome" },
  { id: "eps", label: "BPA Diluido", key: "eps" },
];

function formatFinancialValue(val: number | null | undefined, currencySign: string, isEps: boolean = false): string {
  if (val == null) return "N/D";
  if (isEps) {
    return `${currencySign}${val.toFixed(2)}`;
  }
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1e12) {
    return `${sign}${currencySign}${(abs / 1e12).toFixed(2)}T`;
  }
  if (abs >= 1e9) {
    return `${sign}${currencySign}${(abs / 1e9).toFixed(2)}B`;
  }
  if (abs >= 1e6) {
    return `${sign}${currencySign}${(abs / 1e6).toFixed(1)}M`;
  }
  if (abs >= 1e3) {
    return `${sign}${currencySign}${(abs / 1e3).toFixed(1)}k`;
  }
  return `${sign}${currencySign}${abs.toFixed(2)}`;
}

export default function GrowthChart({
  history,
  forecasts,
  currency,
}: GrowthChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<GrowthMetric>("revenue");
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  const currencySign = currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "USD" ? "$" : `${currency} `;
  const isEps = selectedMetric === "eps";

  // Unificar serie histórica y estimaciones futuras en una sola línea de tiempo
  const combinedSeries = useMemo(() => {
    const pastItems = history.map((item) => {
      let val = item[selectedMetric] as number | null | undefined;
      let yoy = selectedMetric === "revenue" ? item.revenueYoY : selectedMetric === "netIncome" ? item.netIncomeYoY : selectedMetric === "eps" ? item.epsYoY : null;

      return {
        period: item.period,
        value: val,
        yoy,
        isForecast: false,
        label: "Dato publicado",
        analysts: null,
      };
    });

    const futureItems = forecasts.map((fc) => {
      let val: number | null | undefined = null;
      let yoy = fc.revenueYoY;

      if (selectedMetric === "revenue") {
        val = fc.revenue;
        yoy = fc.revenueYoY;
      } else if (selectedMetric === "eps") {
        val = fc.eps;
        yoy = fc.epsYoY;
      } else if (selectedMetric === "netIncome") {
        val = fc.netIncome;
        yoy = fc.epsYoY; // proporcional
      } else if (selectedMetric === "ebitda" || selectedMetric === "grossProfit") {
        // Si no hay estimación directa de EBITDA/Gross en el consenso, proyectar con margen
        val = null;
      }

      return {
        period: fc.period,
        value: val,
        yoy,
        isForecast: true,
        label: fc.label || "Consenso Wall Street",
        analysts: fc.numberOfAnalysts,
      };
    }).filter((item) => item.value != null);

    return [...pastItems, ...futureItems];
  }, [history, forecasts, selectedMetric]);

  // Cálculo de escalas para el gráfico SVG
  const { maxVal, minVal } = useMemo(() => {
    const values = combinedSeries.map((s) => s.value).filter((v): v is number => v != null);
    if (values.length === 0) return { maxVal: 100, minVal: 0 };

    const rawMax = Math.max(...values, 0);
    const rawMin = Math.min(...values, 0);
    return {
      maxVal: rawMax > 0 ? rawMax * 1.18 : 100,
      minVal: rawMin < 0 ? rawMin * 1.15 : 0,
    };
  }, [combinedSeries]);

  const activeItem = (activeItemIndex !== null ? combinedSeries[activeItemIndex] : null) ?? combinedSeries[combinedSeries.length - 1];

  // Dimensiones del gráfico adaptado a móvil
  const chartHeight = 220;
  const chartWidth = 420;
  const barWidth = Math.min(36, Math.max(22, (chartWidth - 50) / (combinedSeries.length || 1) - 10));

  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-[#080b11]/90 border border-white/[0.08] backdrop-blur-md space-y-3.5 font-mono">
      {/* 1. Cabecera con Conmutador de Métrica (Ingresos, EBITDA, Neto, BPA) */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/[0.05]">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
          <BarChart3 className="w-4 h-4 text-sky-400" />
          <span>Crecimiento y Previsión Futura</span>
        </div>

        {/* Píldoras de Selección de Métrica */}
        <div className="inline-flex max-w-full items-center gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] overflow-x-auto no-scrollbar">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedMetric(m.id);
                setActiveItemIndex(null);
              }}
              className={`px-2.5 py-1 rounded transition-all whitespace-nowrap ${
                selectedMetric === m.id
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. HUD Informativo Táctil (Se actualiza al tocar cualquier barra) */}
      {activeItem && (
        <div className="h-8 px-2 sm:px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs whitespace-nowrap overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0 pr-1 truncate">
            <span className="font-bold text-white text-xs shrink-0">{activeItem.period}</span>
            <span className="text-[9.5px] text-zinc-400 font-sans truncate hidden sm:inline">
              ({activeItem.label})
            </span>
            {activeItem.isForecast && activeItem.analysts && (
              <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 shrink-0">
                <Users className="w-2.5 h-2.5" />
                <span>{activeItem.analysts} analistas</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 tabular-nums shrink-0">
            <span className="font-bold text-white text-xs sm:text-sm">
              {formatFinancialValue(activeItem.value, currencySign, isEps)}
            </span>
            {activeItem.yoy != null && (
              <span
                className={`text-[10px] sm:text-[10.5px] font-bold ${
                  activeItem.yoy >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {activeItem.yoy >= 0 ? "+" : ""}
                {activeItem.yoy.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Gráfico SVG de Barras (Pasado Sólido + Futuro Rayado/Consenso) */}
      <div className="w-full h-[220px] sm:h-[240px] relative overflow-hidden flex items-center justify-center select-none">
        {combinedSeries.length === 0 ? (
          <div className="text-xs text-zinc-500 animate-pulse">
            No hay datos suficientes para esta métrica
          </div>
        ) : (
          <svg
            className="w-full h-full"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              {/* Degradado para barras históricas auditadas */}
              <linearGradient id="solidBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
              </linearGradient>

              {/* Degradado para barras de previsión futura de consenso */}
              <linearGradient id="forecastBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#7e22ce" stopOpacity="0.3" />
              </linearGradient>

              {/* Patrón rayado institucional para estimaciones */}
              <pattern
                id="stripePattern"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
              </pattern>
            </defs>

            {/* Líneas sutiles de cuadrícula horizontal */}
            <line x1="20" y1="30" x2={chartWidth - 10} y2="30" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <line x1="20" y1="90" x2={chartWidth - 10} y2="90" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <line x1="20" y1="150" x2={chartWidth - 10} y2="150" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />

            {/* Eje Base Cero */}
            <line
              x1="15"
              y1={chartHeight - 32}
              x2={chartWidth - 5}
              y2={chartHeight - 32}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />

            {/* Renderizado de Barras */}
            {combinedSeries.map((item, idx) => {
              const val = item.value ?? 0;
              const range = maxVal - minVal || 1;
              const plotBottom = chartHeight - 32;
              const plotTop = 24;
              const plotHeight = plotBottom - plotTop;

              const barH = Math.max(4, ((val - Math.min(0, minVal)) / range) * plotHeight);
              const xPos = 25 + idx * ((chartWidth - 50) / combinedSeries.length) + ((chartWidth - 50) / combinedSeries.length - barWidth) / 2;
              const yPos = plotBottom - barH;

              const effectiveActiveIndex = activeItemIndex !== null ? activeItemIndex : combinedSeries.length - 1;
              const isSelected = effectiveActiveIndex === idx;

              return (
                <g
                  key={`${item.period}-${idx}`}
                  className="cursor-pointer transition-all"
                  onClick={() => setActiveItemIndex(idx)}
                >
                  {/* Barra Principal */}
                  <rect
                    x={xPos}
                    y={yPos}
                    width={barWidth}
                    height={barH}
                    rx="4"
                    fill={item.isForecast ? "url(#forecastBarGrad)" : "url(#solidBarGrad)"}
                    stroke={item.isForecast ? "#c084fc" : isSelected ? "#ffffff" : "#38bdf8"}
                    strokeWidth={isSelected ? "1.8" : "1"}
                    strokeDasharray={item.isForecast ? "4 2" : undefined}
                    style={{
                      filter: isSelected
                        ? "drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))"
                        : undefined,
                    }}
                  />

                  {/* Relleno rayado translúcido para barras de previsión */}
                  {item.isForecast && (
                    <rect
                      x={xPos}
                      y={yPos}
                      width={barWidth}
                      height={barH}
                      rx="4"
                      fill="url(#stripePattern)"
                    />
                  )}

                  {/* Porcentaje de crecimiento YoY encima de la barra */}
                  {item.yoy != null && (
                    <text
                      x={xPos + barWidth / 2}
                      y={yPos - 6}
                      textAnchor="middle"
                      fill={item.yoy >= 0 ? "#34d399" : "#f43f5e"}
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {item.yoy >= 0 ? "+" : ""}
                      {Math.round(item.yoy)}%
                    </text>
                  )}

                  {/* Etiqueta del periodo en el eje X */}
                  <text
                    x={xPos + barWidth / 2}
                    y={chartHeight - 14}
                    textAnchor="middle"
                    fill={isSelected ? "#ffffff" : item.isForecast ? "#c084fc" : "#94a3b8"}
                    fontSize="9"
                    fontWeight={isSelected ? "bold" : "normal"}
                    fontFamily="monospace"
                  >
                    {item.period}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* 4. Leyenda Sobria Institucional */}
      <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-zinc-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block" />
            <span>Histórico publicado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 border border-purple-300 border-dashed inline-block" />
            <span>Consenso Analistas Wall Street</span>
          </div>
        </div>
        <span className="text-[9px] text-zinc-500 hidden sm:inline">
          Toca cualquier barra para inspeccionar
        </span>
      </div>
    </div>
  );
}
