"use client";

import { useState, useMemo, useEffect } from "react";
import { T212Position, BrokerFilter } from "@/types/trading212";
import { formatEur, cleanTicker, isETF } from "@/lib/utils";
import PortfolioOrbitVisor2D from "./PortfolioOrbitVisor2D";
import {
  PieChart,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Compass,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Repeat,
  Sliders,
  Sparkles,
  RefreshCw,
  X,
  Target,
  LayoutGrid,
  Orbit,
  Package,
} from "lucide-react";

interface PortfolioMapTabProps {
  positions: T212Position[];
  totalValue: number;
  currentBroker: BrokerFilter;
  onSelectAsset?: (pos: T212Position) => void;
}

type FilterMode = "all" | "suelo" | "conviccion" | "tactica";
type ViewMode = "visor2d" | "blocks";

export default function PortfolioMapTab({
  positions = [],
  totalValue = 0,
  currentBroker,
  onSelectAsset,
}: PortfolioMapTabProps) {
  // 1. Estados de configuración y vista
  const [customClassifications, setCustomClassifications] = useState<Record<string, "largo_plazo" | "tactica">>({});
  const [simulationAmount, setSimulationAmount] = useState<number>(0);
  const [customSimulationText, setCustomSimulationText] = useState<string>("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("visor2d");
  const [selectedPosForReassign, setSelectedPosForReassign] = useState<T212Position | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("custom_asset_classification_v1");
      if (saved) {
        try {
          setCustomClassifications(JSON.parse(saved));
        } catch {}
      }
    }
  }, []);

  const handleSetClassification = (ticker: string, type: "largo_plazo" | "tactica") => {
    const updated = { ...customClassifications, [ticker]: type };
    setCustomClassifications(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("custom_asset_classification_v1", JSON.stringify(updated));
    }
    setSelectedPosForReassign(null);
  };

  // 2. Clasificación de cada activo respetando la lógica de Abel Castro
  const {
    largoPlazoPositions,
    tacticaPositions,
    sueloPositions,
    conviccionPositions,
    unclassifiedPositions,
    largoPlazoTotal,
    tacticaTotal,
    sueloTotal,
    conviccionTotal,
    effectiveTotal,
    largoPlazoPct,
    tacticaPct,
    sueloPctInLargoPlazo,
    conviccionPctInLargoPlazo,
  } = useMemo(() => {
    const defaultTactical = ["CVX", "LLY", "VST", "SPCX"];
    const defaultLongTermStocks = ["NVDA", "AVGO", "NFLX"];

    const lp: T212Position[] = [];
    const tac: T212Position[] = [];
    const suelo: T212Position[] = [];
    const conv: T212Position[] = [];
    const unclass: T212Position[] = [];

    positions.forEach((p) => {
      const clean = cleanTicker(p.ticker).toUpperCase();
      const userChoice = customClassifications[clean];

      // Los ETFs siempre pertenecen al Suelo (Largo Plazo)
      if (isETF(p)) {
        suelo.push(p);
        lp.push(p);
      } else if (userChoice) {
        if (userChoice === "tactica") {
          tac.push(p);
        } else {
          conv.push(p);
          lp.push(p);
        }
      } else if (defaultTactical.includes(clean)) {
        tac.push(p);
      } else if (defaultLongTermStocks.includes(clean)) {
        conv.push(p);
        lp.push(p);
      } else {
        // Cualquier acción nueva comprada que no esté clasificada va a la Órbita de Triaje / Entrada
        unclass.push(p);
      }
    });

    const sVal = suelo.reduce((sum, p) => sum + (p.currentValue || (p.currentPrice || 0) * (p.quantity || 0)), 0);
    const cVal = conv.reduce((sum, p) => sum + (p.currentValue || (p.currentPrice || 0) * (p.quantity || 0)), 0);
    const tVal = tac.reduce((sum, p) => sum + (p.currentValue || (p.currentPrice || 0) * (p.quantity || 0)), 0);
    const uVal = unclass.reduce((sum, p) => sum + (p.currentValue || (p.currentPrice || 0) * (p.quantity || 0)), 0);

    // Si hay simulación activa (+50, +100, +200):
    // 80% va a Bolsa 1 (Largo Plazo): 60% Suelo / 20% Convicción
    // 20% va a Bolsa 2 (Táctica) como Reserva Táctica (Pólvora Seca)
    const simSuelo = simulationAmount * 0.6;
    const simConv = simulationAmount * 0.2;
    const simTac = simulationAmount * 0.2;

    const effSueloTotal = sVal + simSuelo;
    const effConvTotal = cVal + simConv;
    const effLpTotal = effSueloTotal + effConvTotal;
    const effTacTotal = tVal + simTac;
    const effTotal = effLpTotal + effTacTotal + uVal;

    const lpPct = effTotal > 0 ? Number(((effLpTotal / effTotal) * 100).toFixed(1)) : 80;
    const tacPct = effTotal > 0 ? Number(((effTacTotal / effTotal) * 100).toFixed(1)) : 20;

    const sInLp = effLpTotal > 0 ? Number(((effSueloTotal / effLpTotal) * 100).toFixed(1)) : 70;
    const cInLp = effLpTotal > 0 ? Number(((effConvTotal / effLpTotal) * 100).toFixed(1)) : 30;

    return {
      largoPlazoPositions: lp,
      tacticaPositions: tac,
      sueloPositions: suelo,
      conviccionPositions: conv,
      unclassifiedPositions: unclass,
      largoPlazoTotal: effLpTotal,
      tacticaTotal: effTacTotal,
      sueloTotal: effSueloTotal,
      conviccionTotal: effConvTotal,
      effectiveTotal: effTotal,
      largoPlazoPct: lpPct,
      tacticaPct: tacPct,
      sueloPctInLargoPlazo: sInLp,
      conviccionPctInLargoPlazo: cInLp,
    };
  }, [positions, customClassifications, simulationAmount]);

  return (
    <div className="space-y-4 font-mono text-zinc-100 select-none animate-in fade-in duration-150">
      {/* 1. CABECERA CON BARRA DE CONTROL INTEGRADA (VISOR 2D / BLOQUES + SIMULADOR EN LÍNEA) */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-[#080b11]/80 border border-white/[0.06] flex items-center justify-between flex-wrap gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Mapa de Arquitectura de Cartera
            </h2>
          </div>
          <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
            Filosofía Abel Castro: Las 2 Bolsas (80/20) y el Suelo de Índices (60/40)
          </p>
        </div>

        {/* Toolbar integrado: Modos de Vista + Simulación en una sola tira limpia */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px]">
            <button
              onClick={() => setViewMode("visor2d")}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                viewMode === "visor2d"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Orbit className="w-3.5 h-3.5 text-sky-400" />
              <span>Visor 2D</span>
            </button>
            <button
              onClick={() => setViewMode("blocks")}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                viewMode === "blocks"
                  ? "bg-white/[0.12] text-white font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Bloques</span>
            </button>
          </div>

          <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px]">
            <span className="text-[10px] text-zinc-500 px-1 font-sans">Simular:</span>
            {[50, 100, 200].map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  setSimulationAmount(simulationAmount === amt ? 0 : amt);
                  setCustomSimulationText("");
                }}
                className={`px-2 py-0.5 rounded transition-all ${
                  simulationAmount === amt && !customSimulationText
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                +{amt} €
              </button>
            ))}
            <input
              type="number"
              placeholder="Otro..."
              value={customSimulationText}
              onChange={(e) => {
                const val = e.target.value;
                setCustomSimulationText(val);
                const parsed = parseFloat(val);
                setSimulationAmount(!isNaN(parsed) && parsed > 0 ? parsed : 0);
              }}
              className="w-16 px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded text-[10px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 font-mono"
            />
            {simulationAmount > 0 && (
              <button
                onClick={() => {
                  setSimulationAmount(0);
                  setCustomSimulationText("");
                }}
                className="px-2 py-0.5 rounded bg-white/[0.08] text-zinc-300 hover:text-white transition-colors"
                title="Restablecer simulación"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. BARRA DE AVISO: ACCIONES PENDIENTES DE ASIGNAR (Si las hubiera) */}
      {unclassifiedPositions.length > 0 && (
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between flex-wrap gap-2 animate-pulse">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-purple-300 block">
                Tienes {unclassifiedPositions.length} acción nueva pendiente de clasificar
              </span>
              <span className="text-[10px] text-zinc-400 font-sans">
                Toca la acción para asignarle su bolsa según tu horizonte (Largo Plazo o Táctica).
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {unclassifiedPositions.map((pos) => (
              <button
                key={`unclass-pill-${pos.ticker}`}
                onClick={() => setSelectedPosForReassign(pos)}
                className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all"
              >
                {cleanTicker(pos.ticker)}: Asignar →
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. VISTA A: VISOR 2D INTERACTIVO CON ÓRBITAS, ZOOM Y PAN (POR DEFECTO) */}
      {viewMode === "visor2d" ? (
        <PortfolioOrbitVisor2D
          positions={positions}
          totalValue={effectiveTotal}
          sueloPositions={sueloPositions}
          conviccionPositions={conviccionPositions}
          tacticaPositions={tacticaPositions}
          unclassifiedPositions={unclassifiedPositions}
          largoPlazoTotal={largoPlazoTotal}
          tacticaTotal={tacticaTotal}
          sueloTotal={sueloTotal}
          conviccionTotal={conviccionTotal}
          simulationAmount={simulationAmount}
          onReassignAsset={handleSetClassification}
          onSelectAsset={onSelectAsset}
        />
      ) : (
        /* 4. VISTA B: VISTA ESTRUCTURADA DE BLOQUES Y JERARQUÍAS */
        <div className="space-y-4">
          {/* BARRA DE FILTROS DE ENFOQUE (Solo en modo bloques) */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-[10px]">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <button
                onClick={() => setFilterMode("all")}
                className={`px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1.5 ${
                  filterMode === "all" ? "bg-white/[0.12] text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Compass className="w-3 h-3" />
                <span>Todo el Mapa</span>
              </button>
              <button
                onClick={() => setFilterMode("suelo")}
                className={`px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1.5 ${
                  filterMode === "suelo" ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Solo Suelo</span>
              </button>
              <button
                onClick={() => setFilterMode("conviccion")}
                className={`px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1.5 ${
                  filterMode === "conviccion" ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Target className="w-3 h-3" />
                <span>Solo Convicción</span>
              </button>
              <button
                onClick={() => setFilterMode("tactica")}
                className={`px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1.5 ${
                  filterMode === "tactica" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>Solo Táctica</span>
              </button>
            </div>

            <span className="text-[10px] text-zinc-500 font-sans hidden sm:inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400/80" />
              <span>Toca cualquier activo para cambiarlo de bolsa</span>
            </span>
          </div>

          {/* NODO RAÍZ: PATRIMONIO TOTAL */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/[0.08] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-zinc-200">PATRIMONIO TOTAL EN MERCADOS:</span>
              <span className="text-sm font-bold text-white tabular-nums">{formatEur(effectiveTotal)}</span>
              {simulationAmount > 0 && (
                <span className="text-[10px] text-amber-300 font-bold bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                  (+{simulationAmount} € simulados)
                </span>
              )}
            </div>

            <span className="text-[10px] text-zinc-400 hidden sm:inline">
              {positions.length} Activos en Cartera
            </span>
          </div>

          {/* LAS DOS BOLSAS DE ABEL (LARGO PLAZO vs TÁCTICA) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* COLUMNA A: BOLSA DE LARGO PLAZO (~80% del Capital) (8 Cols) */}
            {(filterMode === "all" || filterMode === "suelo" || filterMode === "conviccion") && (
              <div className={`${filterMode === "all" ? "md:col-span-8" : "md:col-span-12"} p-3.5 sm:p-4 rounded-xl bg-[#080b11]/80 border border-sky-500/20 space-y-3 relative overflow-hidden transition-all`}>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <span className="font-bold text-sm text-white">Bolsa 1: Inversión a Largo Plazo</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 font-bold">
                        {largoPlazoPct}% de Cartera
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-sans mt-0.5">
                      «El tiempo juega a favor. Compras negocios y casi no se toca» (Pág. 58)
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-white tabular-nums">{formatEur(largoPlazoTotal)}</span>
                    <span className="text-[9px] text-zinc-500 block">Objetivo Abel: 70% - 80%</span>
                  </div>
                </div>

                {/* Barra interna de Largo Plazo (Suelo 60 / Convicción 40) */}
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-sky-300 inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>El Suelo: {sueloPctInLargoPlazo}%</span>
                    </span>
                    <span className="text-indigo-300 inline-flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      <span>Convicciones: {conviccionPctInLargoPlazo}%</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${sueloPctInLargoPlazo}%` }}
                      className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500"
                    />
                    <div
                      style={{ width: `${conviccionPctInLargoPlazo}%` }}
                      className="h-full bg-indigo-500 transition-all duration-500"
                    />
                  </div>
                  <div className="text-[9px] text-zinc-500 flex justify-between">
                    <span>Objetivo Abel: 60% - 70%</span>
                    <span>Objetivo Abel: 30% - 40%</span>
                  </div>
                </div>

                {/* SUB-RAMAS DENTRO DE LARGO PLAZO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* SUB-RAMA 1A: EL SUELO (ETFs amplios) */}
                  {(filterMode === "all" || filterMode === "suelo") && (
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-sky-500/15 space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-white/[0.04]">
                        <div>
                          <span className="text-xs font-bold text-sky-300 inline-flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>El Suelo (ETFs)</span>
                          </span>
                          <span className="text-[9px] text-zinc-500 block">Cientos de empresas diversificadas</span>
                        </div>
                        <span className="text-xs font-bold text-white tabular-nums">{formatEur(sueloTotal)}</span>
                      </div>

                      <div className="space-y-1.5">
                        {sueloPositions.map((pos) => {
                          const clean = cleanTicker(pos.ticker);
                          const val = pos.currentValue || (pos.currentPrice || 0) * (pos.quantity || 0);
                          const weight = effectiveTotal > 0 ? ((val / effectiveTotal) * 100).toFixed(1) : "0.0";
                          return (
                            <div
                              key={`suelo-${clean}`}
                              onClick={() => setSelectedPosForReassign(pos)}
                              className="p-2 rounded bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.04] flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] group"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-white group-hover:text-sky-300 transition-colors">{clean}</span>
                                  <span className="text-[9px] text-zinc-400 font-sans truncate max-w-[100px]">{pos.name}</span>
                                </div>
                                <span className="text-[9px] text-zinc-500">{formatEur(pos.averagePrice)}/acc</span>
                              </div>

                              <div className="text-right">
                                <span className="text-xs font-bold text-zinc-200 tabular-nums">{formatEur(val)}</span>
                                <span className="text-[9px] text-sky-400 block font-semibold">{weight}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SUB-RAMA 1B: EMPRESAS DE CONVICCIÓN (30% - 40%) */}
                  {(filterMode === "all" || filterMode === "conviccion") && (
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-indigo-500/15 space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-white/[0.04]">
                        <div>
                          <span className="text-xs font-bold text-indigo-300 inline-flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5" />
                            <span>Convicciones</span>
                          </span>
                          <span className="text-[9px] text-zinc-500 block">Empresas analizadas para años</span>
                        </div>
                        <span className="text-xs font-bold text-white tabular-nums">{formatEur(conviccionTotal)}</span>
                      </div>

                      <div className="space-y-1.5">
                        {conviccionPositions.map((pos) => {
                          const clean = cleanTicker(pos.ticker);
                          const val = pos.currentValue || (pos.currentPrice || 0) * (pos.quantity || 0);
                          const weightNum = effectiveTotal > 0 ? (val / effectiveTotal) * 100 : 0;
                          const isNearLimit = weightNum >= 8 && weightNum <= 10;
                          const isOverLimit = weightNum > 10;

                          return (
                            <div
                              key={`conv-${clean}`}
                              onClick={() => setSelectedPosForReassign(pos)}
                              className={`p-2 rounded bg-white/[0.03] hover:bg-white/[0.07] border transition-all cursor-pointer flex items-center justify-between active:scale-[0.98] group ${
                                isOverLimit
                                  ? "border-rose-500/40 bg-rose-500/5"
                                  : isNearLimit
                                  ? "border-amber-500/40"
                                  : "border-white/[0.04]"
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-white group-hover:text-indigo-300 transition-colors">{clean}</span>
                                  {isNearLimit && (
                                    <span className="text-[8px] px-1 rounded bg-amber-500/20 text-amber-300">Tope 10%</span>
                                  )}
                                </div>
                                <span className="text-[9px] text-zinc-500 font-sans truncate max-w-[100px] block">{pos.name}</span>
                              </div>

                              <div className="text-right">
                                <span className="text-xs font-bold text-zinc-200 tabular-nums">{formatEur(val)}</span>
                                <span className={`text-[9px] block font-semibold ${isNearLimit ? "text-amber-400" : "text-indigo-300"}`}>
                                  {weightNum.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* COLUMNA B: BOLSA TÁCTICA / SWING (~20% del Capital) (4 Cols) */}
            {(filterMode === "all" || filterMode === "tactica") && (
              <div className={`${filterMode === "all" ? "md:col-span-4" : "md:col-span-12"} p-3.5 sm:p-4 rounded-xl bg-[#080b11]/80 border border-amber-500/20 space-y-3 relative overflow-hidden transition-all`}>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-sm text-white">Bolsa 2: Táctica / Swing</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold mt-1 inline-block">
                      {tacticaPct}% de Cartera
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-white tabular-nums">{formatEur(tacticaTotal)}</span>
                    <span className="text-[9px] text-zinc-500 block">Objetivo: 20% - 30%</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15 text-[10px] space-y-1">
                  <span className="font-bold text-amber-300 uppercase block">Regla Innegociable (Pág. 59)</span>
                  <p className="text-zinc-300 font-sans leading-tight">
                    «Si una operación táctica sale mal, jamás se convierte en largo plazo para no asumir la pérdida.»
                  </p>
                </div>

                <div className="space-y-1.5">
                  {tacticaPositions.map((pos) => {
                    const clean = cleanTicker(pos.ticker);
                    const val = pos.currentValue || (pos.currentPrice || 0) * (pos.quantity || 0);
                    const weight = effectiveTotal > 0 ? ((val / effectiveTotal) * 100).toFixed(1) : "0.0";

                    return (
                      <div
                        key={`tac-${clean}`}
                        onClick={() => setSelectedPosForReassign(pos)}
                        className="p-2.5 rounded bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.04] cursor-pointer transition-all active:scale-[0.98] group space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors">{clean}</span>
                            <span className="text-[9px] text-zinc-400 font-sans truncate max-w-[90px]">{pos.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-zinc-200 tabular-nums">{formatEur(val)}</span>
                            <span className="text-[9px] text-amber-400 block font-semibold">{weight}%</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-zinc-500 border-t border-white/[0.02] pt-1">
                          <span>Plazo: Semanas</span>
                          <span className="text-zinc-400 group-hover:text-amber-300 transition-colors">Gestionar Plan →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL INTERACTIVO DE REASIGNACIÓN EN 1 CLIC */}
      {selectedPosForReassign && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedPosForReassign(null)}
        >
          <div
            className="w-full max-w-sm bg-[#0e1320] border border-white/[0.12] rounded-2xl p-4 sm:p-5 shadow-2xl font-mono text-xs text-zinc-100 space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div>
                <span className="text-base font-bold text-white">{cleanTicker(selectedPosForReassign.ticker)}</span>
                <span className="text-zinc-400 text-xs ml-1.5 font-sans">({selectedPosForReassign.name})</span>
              </div>
              <button
                onClick={() => setSelectedPosForReassign(null)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              ¿Cuál es tu horizonte real para esta posición según la metodología de Abel Castro?
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleSetClassification(cleanTicker(selectedPosForReassign.ticker), "largo_plazo")}
                className="w-full p-2.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-left transition-all group flex items-start gap-2.5"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 mt-1 shrink-0" />
                <div>
                  <span className="font-bold text-sky-300 block">Bolsa 1: Largo Plazo (Convicción)</span>
                  <p className="text-[10px] text-zinc-400 font-sans mt-0.5 leading-snug">
                    Compras negocio para años. No te asustan caídas del 20-30% porque tu tesis sigue en pie.
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleSetClassification(cleanTicker(selectedPosForReassign.ticker), "tactica")}
                className="w-full p-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left transition-all group flex items-start gap-2.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-amber-300 block">Bolsa 2: Táctica / Swing (Corto Plazo)</span>
                  <p className="text-[10px] text-zinc-400 font-sans mt-0.5 leading-snug">
                    Compras movimiento de precio para unas semanas o un mes. Exige Stop Loss y recogida fijados.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex justify-end">
              <button
                onClick={() => setSelectedPosForReassign(null)}
                className="px-3 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
