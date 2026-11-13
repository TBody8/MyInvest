"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { T212Position } from "@/types/trading212";
import { formatEur, cleanTicker } from "@/lib/utils";

interface PortfolioDonutProps {
  positions?: T212Position[];
  totalValue: number;
}

const COLORS = [
  "#34d399", // Mint / Emerald
  "#38bdf8", // Sky
  "#818cf8", // Indigo
  "#c084fc", // Purple
  "#fbbf24", // Amber
  "#f43f5e", // Rose
  "#71717a", // Zinc
];

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: {
    name: string;
    value: number;
    weight: number;
    ticker: string;
  };
}

interface CustomDonutTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomDonutTooltip({ active, payload }: CustomDonutTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;

  return (
    <div className="bg-[#0e131f]/95 border border-white/[0.1] rounded-lg p-2 shadow-xl backdrop-blur-md text-xs font-mono">
      <p className="font-semibold text-zinc-200">{item.name}</p>
      <div className="flex items-center justify-between gap-3 mt-1 text-[11px]">
        <span className="text-zinc-500">Valor:</span>
        <span className="text-zinc-200 tabular-nums">{formatEur(item.value)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="text-zinc-500">Peso:</span>
        <span className="text-emerald-400 font-bold tabular-nums">
          {item.weight.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export default function PortfolioDonut({
  positions = [],
  totalValue = 0,
}: PortfolioDonutProps) {
  const safePositions = Array.isArray(positions) ? positions : [];

  const sorted = [...safePositions].sort(
    (a, b) => (b.currentValue || 0) - (a.currentValue || 0)
  );

  const topPositions = sorted.slice(0, 5);
  const others = sorted.slice(5);
  const othersValue = others.reduce((acc, p) => acc + (p.currentValue || 0), 0);

  const chartData = topPositions.map((p) => ({
    name: cleanTicker(p.ticker || ""),
    value: p.currentValue || 0,
    weight: p.weightPct || 0,
    ticker: p.ticker || "",
  }));

  if (othersValue > 0) {
    chartData.push({
      name: "Otros",
      value: othersValue,
      weight: totalValue > 0 ? (othersValue / totalValue) * 100 : 0,
      ticker: "OTROS",
    });
  }

  return (
    <section className="border-t border-white/[0.06] pt-3 pb-2">
      <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
        Distribución de Activos
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Gráfico Donut */}
        <div className="w-[140px] h-[140px] shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={2}
                dataKey="value"
                stroke="#080b11"
                strokeWidth={2}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomDonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">
              Activos
            </span>
            <span className="text-sm font-bold font-mono text-zinc-200">
              {safePositions.length}
            </span>
          </div>
        </div>

        {/* Leyenda compacta */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-1 gap-x-4 gap-y-1 text-xs font-mono">
          {chartData.map((item, idx) => (
            <div
              key={item.name}
              className="flex items-center justify-between py-0.5 border-b border-white/[0.04] last:border-0"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-zinc-300 truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 tabular-nums">
                <span className="text-zinc-500 text-[11px] hidden sm:inline">
                  {formatEur(item.value)}
                </span>
                <span className="text-zinc-200 font-semibold w-10 text-right">
                  {item.weight.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
