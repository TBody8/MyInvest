"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layers, LayoutGrid, BarChart2, ArrowRight } from "lucide-react";
import { SectorItem } from "@/app/api/macro/sectors/route";
import SectorDetailModal from "./SectorDetailModal";

const SECTOR_SHORT_NAMES: Record<string, string> = {
  XLK: "Tech",
  XLV: "Salud",
  XLE: "Energía",
  XLF: "Finan.",
  XLP: "Cons.Def",
  XLU: "Util.",
  XLI: "Indus.",
  XLC: "Media",
  XLY: "Cíclic.",
  XLRE: "Inmob.",
  XLB: "Mater.",
};

type ViewType = "quadrants" | "ranking";

interface SectorRotationChartProps {
  userTickers?: string[];
  onSelectStock?: (ticker: string) => void;
}

export default function SectorRotationChart({
  userTickers = [],
  onSelectStock,
}: SectorRotationChartProps) {
  const [selectedSector, setSelectedSector] = useState<SectorItem | null>(null);
  const [viewType, setViewType] = useState<ViewType>("quadrants");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const { data: sectors = [], isLoading } = useQuery<SectorItem[]>({
    queryKey: ["macro-sector-rotation-data"],
    queryFn: async () => {
      const res = await fetch("/api/macro/sectors");
      if (!res.ok) throw new Error("Error al consultar sectores");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Ranking ordenado de mayor a menor fuerza
  const sortedSectors = useMemo(() => {
    return [...sectors].sort((a, b) => b.monthReturn - a.monthReturn);
  }, [sectors]);

  // Cálculo de coordenadas 2D con algoritmo de repelencia anti-colisión y expansión de borde a borde
  const { nodes, zeroX, zeroY } = useMemo(() => {
    if (sectors.length === 0) {
      return { nodes: [], zeroX: 230, zeroY: 120 };
    }

    const monthVals = sectors.map((s) => s.monthReturn);
    const weekVals = sectors.map((s) => s.weekReturn);

    const rawMinX = Math.min(...monthVals);
    const rawMaxX = Math.max(...monthVals);
    const rawMinY = Math.min(...weekVals);
    const rawMaxY = Math.max(...weekVals);

    // Padding mínimo del 5% para que las burbujas ocupen los 4 extremos sin cortarse
    const padX = Math.max(1.2, (rawMaxX - rawMinX) * 0.05);
    const padY = Math.max(0.8, (rawMaxY - rawMinY) * 0.06);

    const effMinX = Math.floor(rawMinX - padX);
    const effMaxX = Math.ceil(rawMaxX + padX);
    const effMinY = Math.floor(rawMinY - padY);
    const effMaxY = Math.ceil(rawMaxY + padY);

    const width = 460;
    const height = 240;
    const plotLeft = 20;
    const plotRight = width - 20;
    const plotTop = 10;
    const plotBottom = height - 12;

    const calcX = (mVal: number) => {
      const span = effMaxX - effMinX || 1;
      const frac = (mVal - effMinX) / span;
      return plotLeft + frac * (plotRight - plotLeft);
    };

    const calcY = (wVal: number) => {
      const span = effMaxY - effMinY || 1;
      const frac = (wVal - effMinY) / span;
      return plotBottom - frac * (plotBottom - plotTop);
    };

    // Nodos con radio ampliado a 18.5px para mayor presencia física y legibilidad
    const r = 18.5;
    const layoutNodes = sectors.map((sec) => ({
      sec,
      x: calcX(sec.monthReturn),
      y: calcY(sec.weekReturn),
      r,
    }));

    // Relajación iterativa anti-colisión
    for (let iter = 0; iter < 18; iter++) {
      for (let i = 0; i < layoutNodes.length; i++) {
        for (let j = i + 1; j < layoutNodes.length; j++) {
          const a = layoutNodes[i];
          const b = layoutNodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.hypot(dx, dy);
          const minDist = a.r + b.r + 3.5;

          if (dist < minDist) {
            if (dist === 0) {
              dx = (i % 2 === 0 ? 1 : -1) * (i + 1);
              dy = (j % 2 === 0 ? 1 : -1) * (j + 1);
              dist = Math.hypot(dx, dy);
            }
            const overlap = (minDist - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;

            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;

            // Clamping dentro del área visible expandida
            a.x = Math.max(plotLeft + a.r, Math.min(plotRight - a.r, a.x));
            a.y = Math.max(plotTop + a.r, Math.min(plotBottom - a.r, a.y));
            b.x = Math.max(plotLeft + b.r, Math.min(plotRight - b.r, b.x));
            b.y = Math.max(plotTop + b.r, Math.min(plotBottom - b.r, b.y));
          }
        }
      }
    }

    return {
      nodes: layoutNodes,
      zeroX: calcX(0),
      zeroY: calcY(0),
    };
  }, [sectors]);

  const activeSector = selectedSector || (sectors.length > 0 ? sectors[0] : null);

  return (
    <div className="h-full border border-white/[0.06] rounded-xl bg-[#080b11]/80 p-3 sm:p-4 font-mono text-zinc-100 flex flex-col justify-between select-none relative">
      {/* 1. Cabecera con Conmutador Cuadrantes / Ranking */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.04] flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-zinc-300 text-xs uppercase tracking-wider font-bold">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>Rotación Sectorial S&P 500</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Conmutador Cuadrantes vs Ranking */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px]">
            <button
              onClick={() => setViewType("quadrants")}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewType === "quadrants"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Cuadrantes
            </button>
            <button
              onClick={() => setViewType("ranking")}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewType === "ranking"
                  ? "bg-white/[0.12] text-white font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Ranking
            </button>
          </div>
        </div>
      </div>

      {/* 2. Barra HUD Fija de Inspección (Clickable para abrir desglose de componentes) */}
      <div
        onClick={() => setIsDetailModalOpen(true)}
        className="h-7 px-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] hover:border-sky-500/30 flex items-center justify-between text-[10px] sm:text-[11px] my-1.5 whitespace-nowrap overflow-hidden cursor-pointer transition-all group"
        title="Toca para ver las principales acciones y ETFs que componen este sector"
      >
        {activeSector ? (
          <>
            <div className="flex items-center gap-1.5 truncate pr-2">
              <span className="font-bold text-white shrink-0 group-hover:text-sky-300 transition-colors">
                {activeSector.ticker}
              </span>
              <span className="text-zinc-400 font-sans truncate text-[9.5px]">
                ({SECTOR_SHORT_NAMES[activeSector.ticker] || activeSector.name})
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 tabular-nums text-[9.5px] sm:text-[10px] shrink-0">
              <span className={activeSector.monthReturn >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                1M: {activeSector.monthReturn >= 0 ? "+" : ""}{activeSector.monthReturn}%
              </span>
              <span className={activeSector.weekReturn >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                1S: {activeSector.weekReturn >= 0 ? "+" : ""}{activeSector.weekReturn}%
              </span>
              <span className="text-zinc-300 font-bold">${activeSector.currentPrice}</span>
              <span className="text-sky-400 font-bold flex items-center gap-0.5 text-[9px] group-hover:translate-x-0.5 transition-transform ml-1">
                <span className="hidden sm:inline">Componentes</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </>
        ) : (
          <span className="text-zinc-500 font-sans text-[10px]">
            Selecciona un sector para ver componentes
          </span>
        )}
      </div>

      {/* 3. VISTA A: CUADRANTES 2D CON EXPANSIÓN DE BORDE A BORDE */}
      {viewType === "quadrants" ? (
        <div className="w-full h-[265px] sm:h-[285px] relative my-0.5 flex items-center justify-center overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500 animate-pulse font-mono">
              Sincronizando flujos de los 11 sectores...
            </div>
          ) : (
            <svg className="w-full h-full" viewBox="0 0 460 240" preserveAspectRatio="xMidYMid meet">
              {/* Cuadrícula sutil de fondo */}
              <line x1="20" y1="60" x2="440" y2="60" stroke="rgba(255,255,255,0.03)" strokeDasharray="2 2" />
              <line x1="20" y1="120" x2="440" y2="120" stroke="rgba(255,255,255,0.03)" strokeDasharray="2 2" />
              <line x1="20" y1="180" x2="440" y2="180" stroke="rgba(255,255,255,0.03)" strokeDasharray="2 2" />

              {/* Ejes Cero (Línea de equilibrio de mercado 0%) */}
              <line x1={zeroX} y1="10" x2={zeroX} y2="228" stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" strokeWidth="1" />
              <line x1="20" y1={zeroY} x2="440" y2={zeroY} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" strokeWidth="1" />

              {/* Etiquetas de los Ejes */}
              <text x="440" y={zeroY - 4} fill="#71717a" fontSize="7.5" fontFamily="monospace" textAnchor="end">
                1M Retorno →
              </text>
              <text x={zeroX + 4} y="20" fill="#71717a" fontSize="7.5" fontFamily="monospace">
                ↑ 1S Fuerza
              </text>

              {/* Rótulos sutiles de cuadrantes */}
              <text x="438" y="24" fill="#34d399" opacity="0.3" fontSize="7" fontFamily="monospace" textAnchor="end">
                Líderes
              </text>
              <text x="24" y="224" fill="#f43f5e" opacity="0.3" fontSize="7" fontFamily="monospace">
                Corrección
              </text>

              {/* BURBUJAS EXPANDIDAS DE BORDE A BORDE */}
              {nodes.map((node) => {
                const sec = node.sec;
                const isSelected = activeSector?.ticker === sec.ticker;

                let fillColor = "#1f2937";
                let strokeColor = "#9ca3af";
                let glowColor = "rgba(156,163,175,0.4)";

                if (sec.monthReturn > 0.5) {
                  fillColor = "#06281e";
                  strokeColor = "#34d399";
                  glowColor = "rgba(52,211,153,0.5)";
                } else if (sec.monthReturn < -0.5) {
                  fillColor = "#260c14";
                  strokeColor = "#f43f5e";
                  glowColor = "rgba(244,63,94,0.5)";
                }

                const shortLabel = SECTOR_SHORT_NAMES[sec.ticker] || sec.ticker.replace("XL", "");

                return (
                  <g
                    key={sec.ticker}
                    data-testid={`sector-${sec.ticker}`}
                    className="cursor-pointer transition-all duration-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSector(sec);
                    }}
                  >
                    {/* Resaltado estático institucional */}
                    {isSelected && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.r + 4}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        strokeOpacity="0.85"
                        style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.5))" }}
                      />
                    )}

                    {/* Esfera del sector */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? "2.2" : "1.6"}
                      style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
                    />

                    {/* Línea 1: Nombre sectorial legible */}
                    <text
                      x={node.x}
                      y={node.y - 2}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="7.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {shortLabel}
                    </text>

                    {/* Línea 2: Porcentaje a 1M */}
                    <text
                      x={node.x}
                      y={node.y + 8}
                      textAnchor="middle"
                      fill={strokeColor}
                      fontSize="7"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {sec.monthReturn > 0 ? "+" : ""}{Math.round(sec.monthReturn)}%
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      ) : (
        /* 4. VISTA B: RANKING SECTORIAL ORDENADO DE MAYOR A MENOR FUERZA */
        <div className="w-full h-[265px] sm:h-[285px] overflow-y-auto space-y-1.5 my-0.5 pr-1">
          {sortedSectors.map((sec, idx) => {
            const isPos = sec.monthReturn > 0.5;
            const isNeg = sec.monthReturn < -0.5;
            const colorClass = isPos ? "text-emerald-400" : isNeg ? "text-rose-400" : "text-zinc-400";
            const barBg = isPos ? "bg-emerald-500/80" : isNeg ? "bg-rose-500/80" : "bg-zinc-500/60";

            return (
              <div
                key={`rank-${sec.ticker}`}
                onClick={() => {
                  setSelectedSector(sec);
                  setIsDetailModalOpen(true);
                }}
                className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-[10px] ${
                  activeSector?.ticker === sec.ticker
                    ? "bg-white/[0.08] border-white/[0.2]"
                    : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-zinc-500 w-3.5">#{idx + 1}</span>
                  <span className="font-bold text-white">{sec.ticker}</span>
                  <span className="text-zinc-400 font-sans truncate max-w-[120px] text-[9.5px]">{sec.name}</span>
                </div>

                <div className="flex items-center gap-3 tabular-nums">
                  <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden flex items-center">
                    <div
                      style={{ width: `${Math.min(100, Math.max(10, Math.abs(sec.monthReturn) * 4))}%` }}
                      className={`h-full rounded-full ${barBg}`}
                    />
                  </div>
                  <span className={`font-bold w-12 text-right ${colorClass}`}>
                    {sec.monthReturn > 0 ? "+" : ""}{sec.monthReturn}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Leyenda inferior ultra-compacta */}
      <div className="pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[9px] text-zinc-500">
        <span>{sectors.length ? `${sectors.length} ETFs Sectoriales SPDR` : "N/D · Sin datos sectoriales"}</span>
        <span>Eje X: Retorno 1M · Eje Y: 1S</span>
      </div>

      {/* 6. Modal Desglose Completo de Acciones y ETFs del Sector */}
      <SectorDetailModal
        sector={isDetailModalOpen ? activeSector : null}
        userTickers={userTickers}
        onClose={() => setIsDetailModalOpen(false)}
        onSelectStock={onSelectStock}
      />
    </div>
  );
}
