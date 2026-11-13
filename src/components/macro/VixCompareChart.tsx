"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { ChevronDown, AlertTriangle, ShieldCheck, Flame, Maximize2, X, Minimize2 } from "lucide-react";
import { formatCompactEur } from "@/lib/utils";

type IndexKey = "SP500" | "NASDAQ" | "DOW" | "RUSSELL";
type TimeframeKey = "1W" | "1M" | "6M" | "1Y" | "ALL";

const INDICES: Array<{ id: IndexKey; label: string; ticker: string; color: string }> = [
  { id: "SP500", label: "S&P 500", ticker: "^GSPC", color: "#38bdf8" },
  { id: "NASDAQ", label: "Nasdaq 100", ticker: "^NDX", color: "#818cf8" },
  { id: "DOW", label: "Dow Jones", ticker: "^DJI", color: "#34d399" },
  { id: "RUSSELL", label: "Russell 2000", ticker: "^RUT", color: "#c084fc" },
];

const TIMEFRAMES: Array<{ id: TimeframeKey; label: string }> = [
  { id: "1W", label: "1S" },
  { id: "1M", label: "1M" },
  { id: "6M", label: "6M" },
  { id: "1Y", label: "1A" },
  { id: "ALL", label: "TODO" },
];

interface VixPoint {
  date: string;
  fullDate: string;
  indexPrice: number;
  vixPrice: number;
}

interface CustomCompareTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    payload: VixPoint;
  }>;
  indexName: string;
  indexColor: string;
}

function CustomCompareTooltip({ active, payload, indexName, indexColor }: CustomCompareTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  if (!point) return null;

  const vix = point.vixPrice;
  const isPanic = vix >= 25;
  const isCalm = vix <= 15;

  return (
    <div className="bg-[#0e131f]/95 border border-white/[0.1] rounded-lg p-2.5 shadow-2xl backdrop-blur-md text-xs font-mono min-w-[190px]">
      <p className="text-zinc-400 text-[10px] mb-1.5 pb-1 border-b border-white/[0.06]">
        {point.fullDate}
      </p>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-zinc-400">{indexName}:</span>
          <span className="font-bold tabular-nums" style={{ color: indexColor }}>
            {point.indexPrice.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pts
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-zinc-400">CBOE VIX:</span>
          <span className={`font-bold tabular-nums ${isPanic ? "text-amber-400" : isCalm ? "text-emerald-400" : "text-amber-300"}`}>
            {point.vixPrice.toFixed(2)}
          </span>
        </div>

        <div className="pt-1 text-[10px] text-zinc-500 border-t border-white/[0.04]">
          {isPanic ? (
            <span className="text-amber-400 font-medium">⚠️ Volatilidad Alta / Capitulación</span>
          ) : isCalm ? (
            <span className="text-emerald-400 font-medium">🛡️ Complacencia / Calma</span>
          ) : (
            <span>Rango de volatilidad normal</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VixCompareChart() {
  const [selectedIndex, setSelectedIndex] = useState<IndexKey>("SP500");
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeKey>("1Y");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Bloquear el scroll de la página cuando el gráfico VIX se expande
  useEffect(() => {
    if (isExpanded) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isExpanded]);

  const activeIndexInfo = INDICES.find((i) => i.id === selectedIndex) || INDICES[0];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vix-compare", selectedIndex, selectedTimeframe],
    queryFn: async () => {
      const res = await fetch(`/api/macro/vix-compare?index=${selectedIndex}&timeframe=${selectedTimeframe}`);
      if (!res.ok) throw new Error("Error cargando comparativa VIX");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const points: VixPoint[] = data?.points || [];
  const currentVix = data?.currentVixPrice || 20.0;
  const vixRegime = data?.vixRegime || "NORMAL";

  // Cálculo matemático de ticks para distribuir los meses de forma uniforme (soluciona hueco entre agosto y noviembre)
  const xTicks = useMemo(() => {
    if (!points || points.length === 0) return undefined;
    const targetCount = 5;
    if (points.length <= targetCount) return points.map((p) => p.date);
    const step = (points.length - 1) / (targetCount - 1);
    const result: string[] = [];
    for (let i = 0; i < targetCount; i++) {
      const idx = Math.min(points.length - 1, Math.round(i * step));
      result.push(points[idx].date);
    }
    return Array.from(new Set(result));
  }, [points]);

  // Renderizador personalizado de etiquetas X: en "TODO" muestra el Año destacado y el Mes sutil
  const renderCustomXTick = (props: any): React.ReactElement => {
    const { x, y, payload } = props;
    const val = String(payload?.value || "");

    if (selectedTimeframe === "ALL") {
      const parts = val.split(" ");
      if (parts.length === 2 && parts[1].length === 4) {
        const month = parts[0];
        const year = parts[1];
        return (
          <g transform={`translate(${x},${y + 6})`}>
            <text textAnchor="middle" fontSize={9} fontFamily="monospace">
              <tspan fill="#f4f4f5" fontWeight="bold">{year}</tspan>
              <tspan fill="#71717a" fontSize={7.5}> {month}</tspan>
            </text>
          </g>
        );
      }
    }

    return (
      <text x={x} y={y + 6} textAnchor="middle" fill="#a1a1aa" fontSize={9} fontFamily="monospace">
        {val}
      </text>
    );
  };

  const renderChart = (heightClass = "h-[240px] sm:h-[300px]") => (
    <div className={`w-full ${heightClass} relative cursor-pointer`} onClick={() => !isExpanded && setIsExpanded(true)}>
      {isLoading ? (
        <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono animate-pulse">
          Sincronizando cotizaciones con Wall Street...
        </div>
      ) : isError || points.length === 0 ? (
        <div className="h-full flex items-center justify-center text-xs text-rose-400 font-mono">
          Error cargando datos de mercado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            {/* Cuadrícula gris muy tenue horizontal y vertical */}
            <CartesianGrid stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="2 2" vertical={true} />
            <XAxis
              dataKey="date"
              ticks={xTicks}
              interval={0}
              stroke="#a1a1aa"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              dy={6}
              tick={renderCustomXTick as any}
            />

            {/* Eje Y Izquierdo: Índice (S&P 500, Nasdaq, etc.) */}
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke={activeIndexInfo.color}
              fontSize={9}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
              tick={{ fill: activeIndexInfo.color }}
              tickFormatter={(val) => formatCompactEur(val).replace("€", "")}
              width={45}
            />

            {/* Eje Y Derecho: VIX (Escala 10 a 45) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#fbbf24"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              domain={[10, "auto"]}
              tick={{ fill: "#fbbf24" }}
              tickFormatter={(val) => `${val.toFixed(0)}`}
              width={30}
            />

            <Tooltip
              content={<CustomCompareTooltip indexName={activeIndexInfo.label} indexColor={activeIndexInfo.color} />}
              cursor={{ stroke: "#ffffff", strokeWidth: 1, strokeDasharray: "3 3", opacity: 0.25 }}
            />

            {/* Líneas guía de régimen del VIX */}
            <ReferenceLine yAxisId="right" y={25} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1} />
            <ReferenceLine yAxisId="right" y={15} stroke="#34d399" strokeDasharray="3 3" strokeWidth={1} />

            {/* 1. Curva del Índice (Eje Izquierdo) */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="indexPrice"
              stroke={activeIndexInfo.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            {/* 2. Curva del VIX (Eje Derecho) */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="vixPrice"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {!isExpanded && (
        <div className="absolute top-2 right-2 p-1 rounded bg-black/40 border border-white/[0.08] text-zinc-400 hover:text-white pointer-events-none">
          <Maximize2 className="w-3 h-3" />
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="border border-white/[0.06] rounded-xl bg-[#080b11]/70 p-3 sm:p-4">
        {/* Cabecera del gráfico con selector de índice y selector temporal */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          {/* Selector de índice */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-mono text-zinc-200 transition-colors"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeIndexInfo.color }} />
              <span className="font-semibold">{activeIndexInfo.label} vs VIX</span>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-40 w-44 rounded-lg bg-[#0e131f] border border-white/[0.1] shadow-2xl p-1 font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
                {INDICES.map((idxItem) => (
                  <button
                    key={idxItem.id}
                    onClick={() => {
                      setSelectedIndex(idxItem.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors ${
                      selectedIndex === idxItem.id ? "bg-white/[0.08] text-white font-medium" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: idxItem.color }} />
                    <span>{idxItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Régimen actual del VIX y selectores temporales */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Badge del VIX */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 border border-amber-500/25 text-amber-300">
              {vixRegime === "PANIC" ? <Flame className="w-3 h-3 text-rose-400" /> : vixRegime === "ELEVATED" ? <AlertTriangle className="w-3 h-3 text-amber-400" /> : <ShieldCheck className="w-3 h-3 text-emerald-400" />}
              <span>VIX: {currentVix.toFixed(2)}</span>
            </span>

            {/* Selector Temporal */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06] font-mono text-[10px]">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setSelectedTimeframe(tf.id)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    selectedTimeframe === tf.id ? "bg-white/[0.12] text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gráfico Doble Eje Y Sincronizado */}
        {renderChart("h-[240px] sm:h-[300px]")}

        {/* Leyenda inferior compacta */}
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-white/[0.04] mt-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: activeIndexInfo.color }} />
              <span className="text-zinc-300">{activeIndexInfo.label}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded-full bg-amber-400" />
              <span className="text-zinc-300">CBOE VIX</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-600">Régimen:</span>
            <span className={vixRegime === "PANIC" ? "text-rose-400 font-bold" : vixRegime === "ELEVATED" ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
              {vixRegime === "PANIC" ? "Pánico" : vixRegime === "ELEVATED" ? "Elevada" : "Normal"}
            </span>
          </div>
        </div>
      </div>

      {/* Modal Pantalla Completa / Expandida al pulsar sobre el gráfico */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[#080b11] p-2 sm:p-4 landscape:p-1 font-mono text-zinc-100 animate-in fade-in duration-150 overflow-hidden h-[100dvh] max-h-[100dvh]"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="w-full h-full flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera en modo expandido */}
            <div className="flex items-center justify-between pb-1.5 landscape:pb-0.5 border-b border-white/[0.06] flex-wrap gap-2 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeIndexInfo.color }} />
                  {activeIndexInfo.label} vs CBOE VIX
                </span>
                <span className="px-2 py-0.5 rounded text-xs bg-amber-500/10 border border-amber-500/25 text-amber-300 font-bold">
                  VIX: {currentVix.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Selector temporal */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf.id}
                      onClick={() => setSelectedTimeframe(tf.id)}
                      className={`px-2.5 py-0.5 rounded transition-colors ${
                        selectedTimeframe === tf.id ? "bg-white/[0.15] text-white font-bold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Gráfico en vista expandida */}
            <div className="flex-1 my-1 min-h-0 h-full overflow-hidden">
              {renderChart("h-full")}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
