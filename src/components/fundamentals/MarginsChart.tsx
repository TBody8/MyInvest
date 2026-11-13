"use client";

import { useState, useMemo } from "react";
import { TrendingUp, Percent, Activity } from "lucide-react";
import { FundamentalHistoryPoint, HistoricalMedians } from "@/types/fundamentals";

type MarginMetric =
  | "grossMargin"
  | "ebitdaMargin"
  | "operatingMargin"
  | "netMargin"
  | "fcfMargin"
  | "roe"
  | "roic";

interface MarginsChartProps {
  history: FundamentalHistoryPoint[];
  medians: HistoricalMedians;
}

const METRICS: { id: MarginMetric; label: string; desc: string }[] = [
  { id: "grossMargin", label: "Margen Bruto", desc: "Gross Profit / Ingresos" },
  { id: "ebitdaMargin", label: "Margen EBITDA", desc: "EBITDA / Ingresos" },
  { id: "operatingMargin", label: "Margen Operativo", desc: "EBIT / Ingresos" },
  { id: "netMargin", label: "Margen Neto", desc: "Beneficio Neto / Ingresos" },
  { id: "fcfMargin", label: "Margen FCF", desc: "Free Cash Flow / Ingresos" },
  { id: "roe", label: "ROE", desc: "Retorno sobre Patrimonio Neto" },
  { id: "roic", label: "ROIC", desc: "Retorno sobre Capital Invertido" },
];

export default function MarginsChart({ history, medians }: MarginsChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MarginMetric>("operatingMargin");
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  // Serie de datos para la métrica seleccionada
  const series = useMemo(() => {
    return history
      .map((item) => ({
        period: item.period,
        date: item.date,
        value: item[selectedMetric] as number | null | undefined,
      }))
      .filter((item): item is { period: string; date: string; value: number } => item.value != null);
  }, [history, selectedMetric]);

  const medianVal = medians[selectedMetric] ?? null;

  // Cálculo de escalas para el gráfico SVG
  const { minVal, maxVal, currentVal } = useMemo(() => {
    const vals = series.map((s) => s.value);
    if (vals.length === 0) return { minVal: 0, maxVal: 100, currentVal: null };

    const rawMin = Math.min(...vals, medianVal ?? Infinity);
    const rawMax = Math.max(...vals, medianVal ?? -Infinity);
    const padding = Math.max(3, (rawMax - rawMin) * 0.18);

    const effMin = rawMin < 0 ? Math.floor(rawMin - padding) : Math.max(0, rawMin - padding);
    const effMax = Math.ceil(rawMax + padding);

    return {
      minVal: effMin,
      maxVal: effMax,
      currentVal: vals[vals.length - 1],
    };
  }, [series, medianVal]);

  const activePoint = (activePointIndex !== null ? series[activePointIndex] : null) ?? series[series.length - 1];

  // Comparativa respecto a la mediana
  const diffFromMedian = currentVal != null && medianVal != null ? currentVal - medianVal : null;

  // Dimensiones del gráfico adaptado a móvil
  const chartHeight = 210;
  const chartWidth = 420;
  const plotLeft = 30;
  const plotRight = chartWidth - 20;
  const plotTop = 22;
  const plotBottom = chartHeight - 32;

  // Línea horizontal de equilibrio 0% (cuando hay números negativos)
  const zeroY = useMemo(() => {
    if (minVal < 0 && maxVal > 0) {
      return plotBottom - ((0 - minVal) / (maxVal - minVal || 1)) * (plotBottom - plotTop);
    }
    return null;
  }, [minVal, maxVal, plotBottom, plotTop]);

  // Coordenadas de los puntos
  const points = useMemo(() => {
    if (series.length === 0) return [];

    return series.map((s, idx) => {
      const fracX = series.length > 1 ? idx / (series.length - 1) : 0.5;
      const x = plotLeft + fracX * (plotRight - plotLeft);
      const fracY = (s.value - minVal) / (maxVal - minVal || 1);
      const y = plotBottom - fracY * (plotBottom - plotTop);
      return { x, y, ...s };
    });
  }, [series, minVal, maxVal, plotBottom, plotTop]);

  // Generar path SVG para la línea y el área
  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const baseFloorY = zeroY != null ? zeroY : plotBottom;
    return `${linePath} L ${lastX} ${baseFloorY} L ${firstX} ${baseFloorY} Z`;
  }, [linePath, points, zeroY, plotBottom]);

  // Posición Y de la línea de la mediana
  const medianY = medianVal != null
    ? plotBottom - ((medianVal - minVal) / (maxVal - minVal || 1)) * (plotBottom - plotTop)
    : null;

  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-[#080b11]/90 border border-white/[0.08] backdrop-blur-md space-y-3.5 font-mono">
      {/* 1. Cabecera con Conmutador de Métrica de Margen */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/[0.05]">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
          <Percent className="w-4 h-4 text-emerald-400" />
          <span>Rentabilidad y Márgenes</span>
        </div>

        {/* Píldoras de Margen */}
        <div className="inline-flex max-w-full items-center gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] overflow-x-auto no-scrollbar">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedMetric(m.id);
                setActivePointIndex(null);
              }}
              className={`px-2.5 py-1 rounded transition-all whitespace-nowrap ${
                selectedMetric === m.id
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. HUD de Diagnóstico del Margen vs Mediana */}
      <div className="h-8 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs whitespace-nowrap overflow-hidden">
        <div className="flex min-w-0 items-center gap-2 pr-2">
          <span className="font-bold text-white text-xs">
            {activePoint ? activePoint.period : "Actual"}
          </span>
          <span className="hidden sm:inline truncate text-zinc-400 font-sans text-[10px]">
            {METRICS.find((m) => m.id === selectedMetric)?.label}
          </span>
        </div>

        <div className="shrink-0 flex items-center gap-3 tabular-nums">
          <span className="font-bold text-white text-xs sm:text-sm">
            {activePoint ? `${activePoint.value.toFixed(1)}%` : "N/D"}
          </span>

          {medianVal != null && (
            <span className="text-[10px] text-zinc-400 hidden sm:inline">
              (Mediana 5A: <span className="text-zinc-200 font-bold">{medianVal.toFixed(1)}%</span>)
            </span>
          )}

          {diffFromMedian != null && (
            <span
              className={`text-[10px] sm:text-[10.5px] font-bold ${
                diffFromMedian >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {diffFromMedian >= 0 ? "+" : ""}
              {diffFromMedian.toFixed(1)} pp vs Med.
            </span>
          )}
        </div>
      </div>

      {/* 3. Gráfico SVG de Líneas de Margen + Línea de Mediana Histórica */}
      <div className="w-full h-[210px] sm:h-[230px] relative overflow-hidden flex items-center justify-center select-none">
        {series.length === 0 ? (
          <div className="text-xs text-zinc-500 animate-pulse">
            No hay histórico disponible para este margen
          </div>
        ) : (
          <svg
            className="w-full h-full"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="marginAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Cuadrícula sutil */}
            <line x1={plotLeft} y1={plotTop + 30} x2={plotRight} y2={plotTop + 30} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <line x1={plotLeft} y1={plotBottom - 40} x2={plotRight} y2={plotBottom - 40} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />

            {/* Eje Base 0% cuando hay valores negativos */}
            {zeroY != null && (
              <g>
                <line
                  x1={plotLeft}
                  y1={zeroY}
                  x2={plotRight}
                  y2={zeroY}
                  stroke="rgba(255,255,255,0.18)"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
                <text
                  x={plotRight}
                  y={zeroY - 3}
                  fill="#71717a"
                  fontSize="7.5"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  0%
                </text>
              </g>
            )}

            {/* Línea Horizontal Discontinua de la Mediana Histórica */}
            {medianY != null && (
              <g>
                <line
                  x1={plotLeft}
                  y1={medianY}
                  x2={plotRight}
                  y2={medianY}
                  stroke="#fbbf24"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                  opacity="0.8"
                />
                <text
                  x={plotLeft + 4}
                  y={medianY - 4}
                  fill="#fbbf24"
                  fontSize="7.5"
                  textAnchor="start"
                  fontFamily="monospace"
                >
                  Mediana: {medianVal?.toFixed(1)}%
                </text>
              </g>
            )}

            {/* Área Sombreada bajo la curva */}
            <path d={areaPath} fill="url(#marginAreaGrad)" />

            {/* Línea Principal de Tendencia */}
            <path
              d={linePath}
              fill="none"
              stroke="#34d399"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 0 6px rgba(52, 211, 153, 0.4))" }}
            />

            {/* Puntos de Datos Interactivos */}
            {points.map((p, idx) => {
              const effectiveActiveIndex = activePointIndex !== null ? activePointIndex : points.length - 1;
              const isSelected = effectiveActiveIndex === idx;

              return (
                <g
                  key={`${p.period}-${idx}`}
                  className="cursor-pointer"
                  onClick={() => setActivePointIndex(idx)}
                >
                  {/* Resaltado del punto seleccionado */}
                  {isSelected && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="7"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      opacity="0.8"
                    />
                  )}

                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isSelected ? "4.5" : "3.5"}
                    fill="#080b11"
                    stroke={p.value < 0 ? "#f43f5e" : "#34d399"}
                    strokeWidth="2"
                  />

                  {/* Etiqueta con el valor encima o debajo del punto */}
                  <text
                    x={p.x}
                    y={p.value < 0 ? p.y + 11 : p.y - 7}
                    textAnchor="middle"
                    fill={isSelected ? "#ffffff" : p.value < 0 ? "#f43f5e" : "#34d399"}
                    fontSize="8"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {p.value.toFixed(1)}%
                  </text>

                  {/* Etiqueta del periodo en el eje X */}
                  <text
                    x={p.x}
                    y={chartHeight - 12}
                    textAnchor="middle"
                    fill={isSelected ? "#ffffff" : "#94a3b8"}
                    fontSize="9"
                    fontWeight={isSelected ? "bold" : "normal"}
                    fontFamily="monospace"
                  >
                    {p.period}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* 4. Leyenda Sobria */}
      <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-zinc-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
            <span>Tendencia del Margen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-amber-400 border-t border-dashed inline-block" />
            <span>Mediana Histórica</span>
          </div>
        </div>
        <span className="text-[9px] text-zinc-500">
          Histórico publicado
        </span>
      </div>
    </div>
  );
}
