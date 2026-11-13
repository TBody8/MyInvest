"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import VixCompareChart from "./VixCompareChart";
import MacroCatalystModal, { CatalystType } from "./MacroCatalystModal";
import DcaAdvisorDrawer, { DcaRecommendation } from "./DcaAdvisorDrawer";
import FearGreedGauge from "./FearGreedGauge";
import SectorRotationChart from "./SectorRotationChart";
import {
  Sparkles,
  Loader2,
  Calendar,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  PieChart,
  Compass,
} from "lucide-react";
import { BrokerFilter, DashboardData } from "@/types/trading212";
import { cleanTicker } from "@/lib/utils";

interface MacroRadarViewProps {
  currentBroker: BrokerFilter;
  onSelectStock?: (ticker: string) => void;
}

const PRESET_AMOUNTS = [50, 100, 200];

export default function MacroRadarView({
  currentBroker,
  onSelectStock,
}: MacroRadarViewProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [advisorData, setAdvisorData] = useState<DcaRecommendation | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isAdvisorDrawerOpen, setIsAdvisorDrawerOpen] = useState(false);
  const [activeCatalyst, setActiveCatalyst] = useState<CatalystType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveAmount = customAmount ? parseFloat(customAmount) || selectedAmount : selectedAmount;

  // Consultar posiciones de la cartera para marcar automáticamente qué acciones tiene ya el usuario
  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: ["portfolio-dashboard", currentBroker],
    staleTime: 60 * 1000,
  });

  const userTickers = useMemo(() => {
    return (dashboardData?.positions || []).map((p) => cleanTicker(p.ticker).toUpperCase());
  }, [dashboardData?.positions]);

  // Cargar análisis guardado previamente en localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("ai_dca_advisor_fitintrade_cache");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.recommendation) {
            setAdvisorData(parsed.recommendation);
            setSavedAt(parsed.timestamp || null);
          }
        } catch {
          // Ignorar caché corrupta
        }
      }
    }
  }, []);

  const handleGenerateAdvice = async (shouldOpenDrawer = true) => {
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      let customClassifications = {};
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("custom_asset_classification_v1");
        if (saved) {
          try {
            customClassifications = JSON.parse(saved);
          } catch {}
        }
      }

      const res = await fetch("/api/ai/dca-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: effectiveAmount,
          broker: currentBroker,
          customClassifications,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al generar recomendación");
      }

      setAdvisorData(data.recommendation);
      const timestamp = new Date().toISOString();
      setSavedAt(timestamp);

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "ai_dca_advisor_fitintrade_cache",
          JSON.stringify({
            recommendation: data.recommendation,
            timestamp,
          })
        );
      }

      if (shouldOpenDrawer) {
        setIsAdvisorDrawerOpen(true);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado al consultar la IA");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenAdvisor = () => {
    if (advisorData) {
      setIsAdvisorDrawerOpen(true);
    } else {
      handleGenerateAdvice(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* 0. Panel de Pulso Macro: Tacómetro Fear & Greed + Rotación Sectorial (11 Sectores S&P) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5">
          <FearGreedGauge />
        </div>
        <div className="md:col-span-7">
          <SectorRotationChart userTickers={userTickers} onSelectStock={onSelectStock} />
        </div>
      </div>

      {/* 1. Gráfico Doble Sincronizado Índice vs VIX */}
      <VixCompareChart />

      {/* 2. Grid de Catalizadores Macro y Lanzador del Asistente IA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Tarjeta A: Calendario Macro & Tipos de Interés (1 Columna, Clickable) */}
        <div className="border border-white/[0.06] rounded-xl bg-[#080b11]/70 p-3 sm:p-4 font-mono text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider mb-2.5 pb-1 border-b border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>Catalizadores Macro</span>
              </div>
              <span className="text-[9px] text-zinc-500 font-sans">Toca para informe</span>
            </div>

            <div className="space-y-2">
              {/* FED */}
              <div
                onClick={() => setActiveCatalyst("FED")}
                className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-sky-500/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-zinc-400 group-hover:text-sky-300 font-bold transition-colors">
                    🇺🇸 Reserva Federal (FED)
                  </div>
                  <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-sky-300 transition-colors" />
                </div>
                <div className="flex items-center justify-between mt-1 font-bold text-zinc-200">
                  <span>Decisión Tipos</span>
                  <span className="text-sky-400">18 Dic</span>
                </div>
                <div className="text-[9px] text-zinc-400 mt-0.5">Expectativa: -25 pb (CME 68.4%)</div>
              </div>

              {/* BCE */}
              <div
                onClick={() => setActiveCatalyst("ECB")}
                className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-indigo-500/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-zinc-400 group-hover:text-indigo-300 font-bold transition-colors">
                    🇪🇺 Banco Central Europeo (BCE)
                  </div>
                  <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-indigo-300 transition-colors" />
                </div>
                <div className="flex items-center justify-between mt-1 font-bold text-zinc-200">
                  <span>Decisión Tipos</span>
                  <span className="text-indigo-400">17 Dic</span>
                </div>
                <div className="text-[9px] text-zinc-400 mt-0.5">Consenso: -25 pb hacia 3.00%</div>
              </div>

              {/* IPC EE.UU. */}
              <div
                onClick={() => setActiveCatalyst("CPI")}
                className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-emerald-500/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-zinc-400 group-hover:text-emerald-300 font-bold transition-colors">
                    📊 Inflación EE.UU. (IPC / CPI)
                  </div>
                  <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-emerald-300 transition-colors" />
                </div>
                <div className="flex items-center justify-between mt-1 font-bold text-zinc-200">
                  <span>Dato IPC</span>
                  <span className="text-emerald-400">12 Nov</span>
                </div>
                <div className="text-[9px] text-zinc-400 mt-0.5">Clave para volatilidad y VIX</div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-white/[0.04] text-[9px] text-zinc-500 flex items-center justify-between">
            <span>Régimen monetario</span>
            <span className="text-zinc-300 font-medium">Informes de analistas</span>
          </div>
        </div>

        {/* Tarjeta B: Lanzador Minimalista del Asistente de Asignación IA (2 Columnas) */}
        <div className="md:col-span-2 border border-white/[0.06] rounded-xl bg-[#080b11]/70 p-4 sm:p-5 font-mono text-xs flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06] flex-wrap">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Asistente de Asignación IA · Criterio Fitintrade</span>
              </div>
              <span className="text-[10px] text-zinc-500">Filosofía Abel Castro</span>
            </div>

            {/* Resumen de los 3 pilares */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold mb-1">
                  <PieChart className="w-3 h-3" />
                  <span>Suelo 60 / 40</span>
                </div>
                <p className="text-zinc-400 font-sans leading-tight">
                  Blindaje troncal en ETFs globales para que ninguna empresa te arruine.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Tope 10% Empresa</span>
                </div>
                <p className="text-zinc-400 font-sans leading-tight">
                  Control estricto de tamaño de posición antes de comprar.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold mb-1">
                  <Compass className="w-3 h-3" />
                  <span>Radar Exterior</span>
                </div>
                <p className="text-zinc-400 font-sans leading-tight">
                  Exploración de activos con alto ROIC y FCF para diversificar en 3D.
                </p>
              </div>
            </div>

            {/* Selector de importe */}
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              <span className="text-[11px] text-zinc-400">Capital a aportar:</span>
              <div className="flex items-center gap-1.5">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => {
                      setSelectedAmount(amt);
                      setCustomAmount("");
                    }}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      selectedAmount === amt && !customAmount
                        ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold"
                        : "bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:text-white"
                    }`}
                  >
                    {amt} €
                  </button>
                ))}
                <input
                  type="number"
                  placeholder="Otro..."
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-20 px-2 py-0.5 bg-white/[0.03] border border-white/[0.06] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Botón Central Destacado para abrir la vista dedicada */}
          <div className="mt-4 pt-3 border-t border-white/[0.04] flex flex-col items-center gap-2">
            <button
              onClick={handleOpenAdvisor}
              disabled={isAnalyzing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-400/10 hover:from-amber-500/30 hover:to-amber-400/20 border border-amber-400/40 text-amber-300 font-bold text-xs transition-all active:scale-95 shadow-xl disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analizando Cartera y Mercado Exterior con Abel...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>
                    {advisorData ? "Ver Asignación y Diagnóstico Completo" : "Abrir Asistente de Asignación IA"}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </button>

            {savedAt && (
              <span className="text-[10px] text-zinc-500">
                Último análisis: {new Date(savedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} • Toca para abrir vista dedicada
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modal 1: Ficha de Catalizador Macro */}
      <MacroCatalystModal
        catalystId={activeCatalyst}
        onClose={() => setActiveCatalyst(null)}
      />

      {/* Modal 2: Vista Dedicada a Pantalla Completa del Asistente IA (DcaAdvisorDrawer) */}
      <DcaAdvisorDrawer
        isOpen={isAdvisorDrawerOpen}
        onClose={() => setIsAdvisorDrawerOpen(false)}
        advisorData={advisorData}
        effectiveAmount={effectiveAmount}
        isAnalyzing={isAnalyzing}
        onSelectAmount={(amt) => setSelectedAmount(amt)}
        customAmount={customAmount}
        onChangeCustomAmount={(val) => setCustomAmount(val)}
        onReanalyze={() => handleGenerateAdvice(true)}
        savedAt={savedAt}
      />
    </div>
  );
}
