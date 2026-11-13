"use client";

import { useMemo } from "react";
import { T212Position } from "@/types/trading212";
import { isETF, formatEur } from "@/lib/utils";
import { ShieldCheck, Target, ChevronRight, PieChart } from "lucide-react";

interface SueloIndicatorBarProps {
  positions: T212Position[];
  onOpenMap?: () => void;
}

export default function SueloIndicatorBar({ positions = [], onOpenMap }: SueloIndicatorBarProps) {
  const { sueloVal, empresasVal, totalVal, sueloPct, empresasPct } = useMemo(() => {
    let sVal = 0;
    let eVal = 0;

    positions.forEach((p) => {
      const val = p.currentValue || (p.currentPrice || 0) * (p.quantity || 0);
      if (isETF(p)) {
        sVal += val;
      } else {
        eVal += val;
      }
    });

    const tot = sVal + eVal;
    const sPct = tot > 0 ? Number(((sVal / tot) * 100).toFixed(1)) : 0;
    const ePct = tot > 0 ? Number(((eVal / tot) * 100).toFixed(1)) : 0;

    return {
      sueloVal: sVal,
      empresasVal: eVal,
      totalVal: tot,
      sueloPct: sPct,
      empresasPct: ePct,
    };
  }, [positions]);

  const hasFunds = totalVal > 0;
  const isOptimal = hasFunds && sueloPct >= 60 && sueloPct <= 70;

  return (
    <div
      onClick={onOpenMap}
      className="my-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-sky-500/30 transition-all cursor-pointer font-mono text-xs group"
      title="Toca para explorar el Mapa de Arquitectura de Cartera completo"
    >
      {/* Fila 1: Encabezado y Estado */}
      <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.04] flex-wrap gap-1">
        <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
          <PieChart className="w-3.5 h-3.5 text-sky-400" />
          <span>Estructura de Cartera · Criterio Fitintrade</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`text-[9px] px-2 py-0.2 rounded font-bold border ${
              !hasFunds
                ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                : isOptimal
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
          >
            {!hasFunds
              ? "Sin fondos"
              : isOptimal
              ? "Suelo en Rango (60-70%)"
              : "Requiere Rebalanceo"}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-sky-400 transition-colors" />
        </div>
      </div>

      {/* Fila 2: Etiquetas numéricas de Suelo vs Convicciones */}
      <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-2 pb-1 font-semibold">
        <span className="text-sky-300 flex items-center gap-1.5 truncate">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>Suelo:</span>
          <strong className="text-white">{sueloPct}%</strong>
          <span className="text-[9px] sm:text-[10px] text-zinc-500 font-normal">({formatEur(sueloVal)})</span>
        </span>

        <span className="text-indigo-300 flex items-center gap-1.5 truncate justify-end">
          <Target className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>Convicción:</span>
          <strong className="text-white">{empresasPct}%</strong>
          <span className="text-[9px] sm:text-[10px] text-zinc-500 font-normal">({formatEur(empresasVal)})</span>
        </span>
      </div>

      {/* Fila 3: Barra de Progreso Dinámica */}
      <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden flex relative mt-0.5">
        <div
          style={{ width: `${sueloPct}%` }}
          className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500"
        />
        <div
          style={{ width: `${empresasPct}%` }}
          className="h-full bg-indigo-500 transition-all duration-500"
        />
      </div>

      {/* Fila 4: Subtexto discreto de guía */}
      <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-1.5">
        <span>Objetivo Suelo: 60% - 70%</span>
        <span>Tope: Máx 10% por empresa individual</span>
      </div>
    </div>
  );
}
