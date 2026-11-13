"use client";

import { HeatmapMonth } from "@/types/trading212";
import { formatPct, formatEur } from "@/lib/utils";

interface MonthlyHeatmapProps {
  heatmapData?: HeatmapMonth[];
}

export default function MonthlyHeatmap({ heatmapData = [] }: MonthlyHeatmapProps) {
  const safeHeatmap = Array.isArray(heatmapData) ? heatmapData : [];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const years = Array.from(new Set(safeHeatmap.map((d) => d.year))).sort((a, b) => b - a);

  const getMonthData = (year: number, monthIdx: number) => {
    return safeHeatmap.find((d) => d.year === year && d.month === monthIdx);
  };

  const getColorClass = (returnPct: number | undefined) => {
    if (returnPct === undefined) return "bg-white/[0.02] text-zinc-700";
    if (returnPct > 3) return "bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/35";
    if (returnPct > 0) return "bg-emerald-500/15 text-emerald-400";
    if (returnPct === 0) return "bg-white/[0.02] text-zinc-600";
    if (returnPct > -2) return "bg-rose-500/15 text-rose-400";
    return "bg-rose-500/25 text-rose-300 font-bold border border-rose-500/35";
  };

  return (
    <section className="border-t border-white/[0.06] pt-4 pb-2">
      <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
        Rendimiento Mensual
      </div>

      {safeHeatmap.length === 0 ? <p className="text-xs text-zinc-400">N/D · Faltan valoraciones y movimientos para calcular rendimientos mensuales.</p> : <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="min-w-[540px]">
          {/* Header meses en 13 columnas exactas */}
          <div
            className="gap-1 mb-1 text-center text-[10px] font-mono text-zinc-500"
            style={{ display: "grid", gridTemplateColumns: "44px repeat(12, minmax(0, 1fr))" }}
          >
            <div className="text-left pl-1">Año</div>
            {months.map((m) => (
              <div key={m}>{m}</div>
            ))}
          </div>

          {/* Filas por año en 13 columnas exactas */}
          <div className="space-y-1">
            {years.map((year) => (
              <div
                key={year}
                className="gap-1 items-center font-mono text-xs"
                style={{ display: "grid", gridTemplateColumns: "44px repeat(12, minmax(0, 1fr))" }}
              >
                <div className="text-[11px] text-zinc-400 pl-1 text-left font-semibold">
                  {year}
                </div>
                {months.map((_, idx) => {
                  const data = getMonthData(year, idx);
                  const returnPct = data?.returnPct;
                  const colorClass = getColorClass(returnPct);

                  return (
                    <div
                      key={`${year}-${idx}`}
                      title={
                        data
                          ? `${months[idx]} ${year}: ${formatPct(data.returnPct, true)} (${formatEur(data.profitEuro, true)})`
                          : `${months[idx]} ${year}: Sin datos`
                      }
                      className={`h-7 rounded flex items-center justify-center text-[10px] tabular-nums transition-transform hover:scale-105 cursor-default ${colorClass}`}
                    >
                      {returnPct !== undefined ? (
                        <span>
                          {returnPct === 0 ? "—" : returnPct > 0 ? `+${returnPct.toFixed(0)}%` : `${returnPct.toFixed(0)}%`}
                        </span>
                      ) : (
                        <span className="text-zinc-700">·</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>}
    </section>
  );
}
