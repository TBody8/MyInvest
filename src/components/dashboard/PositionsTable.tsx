"use client";

import { useState } from "react";
import { Search, ArrowUpDown, Edit2 } from "lucide-react";
import { T212Position, BrokerFilter } from "@/types/trading212";
import { formatEur, formatPct, formatUsd, cleanTicker } from "@/lib/utils";

interface PositionsTableProps {
  positions?: T212Position[];
  currentBroker?: BrokerFilter;
  eurUsdRate?: number;
  onEditPosition?: (pos: T212Position) => void;
  onSelectPosition?: (pos: T212Position) => void;
}

type SortField = "default" | "ticker" | "totalCost" | "currentValue" | "ppl" | "weightPct";
type SortOrder = "asc" | "desc";

// Clasificador para identificar ETFs frente a acciones individuales
function isETF(pos: T212Position): boolean {
  const t = (pos.ticker || "").toUpperCase().split("_")[0];
  const n = (pos.name || "").toUpperCase();
  const knownETFs = ["IUSQ", "6AQQ", "IS3N", "IUSN", "SPCX"];
  if (knownETFs.includes(t)) return true;
  return (
    /\bETF\b/i.test(n) ||
    /\bUCITS\b/i.test(n) ||
    /\bISHARES\b/i.test(n) ||
    /\bISHS\b/i.test(n) ||
    /\bAMUNDI\b/i.test(n) ||
    /\bSWAP\b/i.test(n)
  );
}

export default function PositionsTable({
  positions = [],
  currentBroker = "all",
  eurUsdRate = 1.085,
  onEditPosition,
  onSelectPosition,
}: PositionsTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("default");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const safePositions = Array.isArray(positions) ? positions : [];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filtered = safePositions.filter((p) => {
    if (!p) return false;
    const term = search.toLowerCase();
    return (
      (p.ticker && p.ticker.toLowerCase().includes(term)) ||
      (p.name && p.name.toLowerCase().includes(term))
    );
  });

  // Ordenación por defecto: Primero ETFs (por mayor valor €), luego Acciones (por mayor valor €)
  let sorted: T212Position[] = [];
  if (sortField === "default") {
    const etfs = filtered
      .filter(isETF)
      .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
    const stocks = filtered
      .filter((p) => !isETF(p))
      .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
    sorted = [...etfs, ...stocks];
  } else {
    sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;

      if (typeof aVal === "string") {
        return sortOrder === "asc"
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }

      return sortOrder === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }

  return (
    <section className="border-t border-white/[0.06] pt-4 pb-2">
      {/* Header y Buscador inline */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            Posiciones
          </h3>
          <span className="text-[10px] font-mono text-zinc-500">
            ({safePositions.length})
          </span>
        </div>

        {/* Buscador minimalista */}
        <div className="relative w-40 sm:w-52">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-7 pr-2.5 py-1 bg-white/[0.03] border border-white/[0.06] rounded-md text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-white/[0.2] transition-colors font-mono"
          />
        </div>
      </div>

      {/* Tabla sin card wrapper, con divide-y */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full text-left text-xs min-w-[620px]">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] uppercase font-mono tracking-wider text-zinc-500">
              <th
                onClick={() => handleSort("ticker")}
                className="py-2 pr-3 cursor-pointer hover:text-zinc-300"
              >
                <div className="flex items-center gap-1">
                  <span>Ticker</span>
                  <ArrowUpDown className="w-2.5 h-2.5 text-zinc-600" />
                </div>
              </th>
              <th className="py-2 px-2 text-right">Cant.</th>
              {/* PARES INTERCAMBIADOS: PRECIO / HOY y P/L TOTAL PRIMERO */}
              <th className="py-2 px-2 text-right">Precio / Hoy</th>
              <th
                onClick={() => handleSort("ppl")}
                className="py-2 px-2 text-right cursor-pointer hover:text-zinc-300"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>P/L Total</span>
                  <ArrowUpDown className="w-2.5 h-2.5 text-zinc-600" />
                </div>
              </th>
              {/* INVERTIDO y VALOR A CONTINUACIÓN */}
              <th
                onClick={() => handleSort("totalCost")}
                className="py-2 px-2 text-right cursor-pointer hover:text-zinc-300"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Invertido</span>
                  <ArrowUpDown className="w-2.5 h-2.5 text-zinc-600" />
                </div>
              </th>
              <th
                onClick={() => handleSort("currentValue")}
                className="py-2 px-2 text-right cursor-pointer hover:text-zinc-300"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Valor</span>
                  <ArrowUpDown className="w-2.5 h-2.5 text-zinc-600" />
                </div>
              </th>
              <th
                onClick={() => handleSort("weightPct")}
                className="py-2 pl-2 text-right cursor-pointer hover:text-zinc-300"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Peso</span>
                  <ArrowUpDown className="w-2.5 h-2.5 text-zinc-600" />
                </div>
              </th>
              {currentBroker === "revolut" && (
                <th className="py-2 pl-2 w-8"></th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {sorted.map((pos) => {
              const isPos = (pos.ppl || 0) >= 0;
              const clean = cleanTicker(pos.ticker || "");
              const weightVal = pos.weightPct || 0;
              const isRevolut = pos.broker === "REVOLUT";
              const totalCost = pos.totalCost !== undefined && pos.totalCost > 0
                ? pos.totalCost
                : pos.quantity * pos.averagePrice;
              const dailyChange = pos.dailyChangePct ?? 0;
              const isDailyPos = dailyChange >= 0;
              const nativePrice = pos.nativeCurrentPrice;
              const nativeCurrency = pos.priceCurrency;
              const priceLabel = nativePrice != null && nativeCurrency
                ? (nativeCurrency === "USD" ? formatUsd(nativePrice) : nativeCurrency === "EUR" ? formatEur(nativePrice) : `${nativePrice.toFixed(2)} ${nativeCurrency}`)
                : formatEur(pos.currentPrice);

              return (
                <tr
                  key={`${pos.broker || "broker"}-${pos.ticker}`}
                  onClick={() => onSelectPosition && onSelectPosition(pos)}
                  className="hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors font-mono group cursor-pointer"
                >
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-zinc-200">{clean}</span>
                      {/* Micro-etiqueta si estamos en vista consolidada Total */}
                      {currentBroker === "all" && pos.broker && (
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                            isRevolut
                              ? "bg-white/[0.08] text-zinc-200 border border-zinc-400/35"
                              : "bg-sky-500/15 text-sky-400 border border-sky-500/25"
                          }`}
                        >
                          {pos.broker === "REVOLUT" ? "REV" : "T212"}
                        </span>
                      )}

                      {/* Micro-aviso discreto de presentación de resultados (Earnings-Preview) */}
                      {pos.nextEarningsDate && pos.nextEarningsDate !== "Reportado" && (
                        <span
                          title={pos.earningsEstimate ? `Resultados trimestrales: ${pos.nextEarningsDate} (${pos.earningsEstimate})` : `Resultados: ${pos.nextEarningsDate}`}
                          className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-amber-400/10 text-amber-300 border border-amber-400/20 flex items-center gap-0.5"
                        >
                          <span className="w-1 h-1 rounded-full bg-amber-400" />
                          <span>{pos.nextEarningsDate}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-sans truncate max-w-[150px]">
                      {pos.name || pos.ticker}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right text-zinc-400 tabular-nums">
                    {pos.quantity}
                  </td>
                  {/* PRECIO / HOY: Cotización actual de mercado con la subida/bajada de hoy */}
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    <div className="text-zinc-200 font-medium">
                      {priceLabel}
                    </div>
                    <div
                      className={`text-[10px] font-mono ${
                        pos.dailyChangePct == null
                          ? "text-zinc-500"
                          : isDailyPos
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {pos.dailyChangePct == null
                        ? "N/D hoy"
                        : `${isDailyPos ? "+" : ""}${dailyChange.toFixed(2)}% hoy`}
                    </div>
                  </td>
                  {/* P/L TOTAL: Beneficio monetario neto y rentabilidad total acumulada */}
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    <div
                      className={`font-semibold ${
                        isPos ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatEur(pos.ppl || 0, true)}
                    </div>
                    <div
                      className={`text-[10px] ${
                        isPos ? "text-profit/80" : "text-loss/80"
                      }`}
                    >
                      {formatPct(pos.returnPct || 0, true)}
                    </div>
                  </td>
                  {/* INVERTIDO: Total pagado por la posición (€), con precio medio debajo ($/acc o €/acc) */}
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    <div className="text-zinc-300 font-medium">{formatEur(totalCost)}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {formatEur(pos.averagePrice)}/acc · EUR
                    </div>
                  </td>
                  {/* VALOR: Valor actual de mercado de la posición */}
                  <td className="py-2.5 px-2 text-right font-medium text-zinc-100 tabular-nums">
                    {formatEur(pos.currentValue || 0)}
                  </td>
                  {/* PESO EN CARTERA */}
                  <td className="py-2.5 pl-2 text-right tabular-nums">
                    <div className="text-zinc-300 font-medium">{weightVal.toFixed(1)}%</div>
                    <div className="w-12 h-1 bg-white/[0.06] rounded-full overflow-hidden mt-1 ml-auto">
                      <div
                        style={{ width: `${Math.min(100, Math.max(4, weightVal))}%` }}
                        className="h-full bg-emerald-400/70 rounded-full"
                      />
                    </div>
                  </td>
                  {currentBroker === "revolut" && (
                    <td className="py-2.5 pl-2 text-right">
                      {onEditPosition && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditPosition(pos);
                          }}
                          aria-label={`Editar posición de ${clean}`}
                          className="p-1 rounded hover:bg-white/[0.08] text-zinc-500 hover:text-zinc-200 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
