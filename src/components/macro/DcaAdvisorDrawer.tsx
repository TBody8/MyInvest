"use client";

import { useEffect } from "react";
import {
  X,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Globe2,
  PieChart,
  Compass,
  ArrowRight,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Building2,
  RefreshCw,
  Zap,
  Coins,
} from "lucide-react";
import { formatEur } from "@/lib/utils";

export interface TacticalAnalystIdea {
  ticker: string;
  name: string;
  catalyst: string;
  entryZone: string;
  takeProfit: string;
  stopLoss: string;
  analystConsensus: string;
}

export interface DcaAllocation {
  ticker: string;
  name: string;
  type: "SUELO" | "CONVICCION" | "POLVORA_SECA";
  amount: number;
  percentage: number;
  currentWeight: string;
  targetWeight: string;
  metrics: {
    roic: string;
    fcfStatus: string;
    pe: string;
    technicalFloor: string;
  };
  reason: string;
  exitCondition: string;
}

export interface ExternalAssetRecommendation {
  ticker: string;
  name: string;
  sector: string;
  whyItFits: string;
  roic: string;
  fcfStatus: string;
  recommendedMaxWeight: string;
}

export interface DcaRecommendation {
  diagnostics: {
    sueloPct: number;
    empresasPct: number;
    sueloStatus: string;
    concentrationAlert: string;
    threeDimensions: {
      sector: string;
      geography: string;
      currency: string;
    };
  };
  allocations: DcaAllocation[];
  tacticalAnalystIdea?: TacticalAnalystIdea;
  externalMarketRadar: ExternalAssetRecommendation[];
  abelRoutineAdvice: string;
  thesis: string;
}

interface DcaAdvisorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  advisorData: DcaRecommendation | null;
  effectiveAmount: number;
  isAnalyzing: boolean;
  onSelectAmount: (amt: number) => void;
  customAmount: string;
  onChangeCustomAmount: (val: string) => void;
  onReanalyze: () => void;
  savedAt: string | null;
}

const PRESET_AMOUNTS = [50, 100, 200];

export default function DcaAdvisorDrawer({
  isOpen,
  onClose,
  advisorData,
  effectiveAmount,
  isAnalyzing,
  onSelectAmount,
  customAmount,
  onChangeCustomAmount,
  onReanalyze,
  savedAt,
}: DcaAdvisorDrawerProps) {
  // Bloquear el scroll de la página de fondo cuando el drawer está abierto
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const diag = advisorData?.diagnostics;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#090d16] border border-white/[0.12] rounded-2xl shadow-2xl font-mono text-zinc-100 flex flex-col h-[94vh] max-h-[94dvh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. CABECERA SUPERIOR */}
        <div className="p-3 sm:p-4 border-b border-white/[0.08] bg-[#0c111d] flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Asistente de Asignación IA · Criterio Fitintrade
              </h2>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
              Reparto Estricto: 60% Suelo / 20% Convicción / 20% Pólvora Seca (Abel Castro)
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. BARRA DE CONTROL DE IMPORTE RÁPIDO */}
        <div className="px-3 sm:px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-zinc-400">Capital a aportar:</span>
            <div className="inline-flex items-center gap-1.5">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => onSelectAmount(amt)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    effectiveAmount === amt && !customAmount
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
                onChange={(e) => onChangeCustomAmount(e.target.value)}
                className="w-20 px-2 py-0.5 bg-white/[0.03] border border-white/[0.06] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50"
              />
            </div>
          </div>

          <button
            onClick={onReanalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isAnalyzing ? "animate-spin" : ""}`} />
            <span>{isAnalyzing ? "Calculando..." : "Recalcular con Abel"}</span>
          </button>
        </div>

        {/* 3. CONTENIDO PRINCIPAL CON SCROLL ESPACIOSO */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {/* BLOQUE A: DIAGNÓSTICO DE LA CARTERA SEGÚN ABEL CASTRO */}
          {diag && (
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-sky-400" />
                  <span>1. Diagnóstico de Estructura (Suelo vs Convicciones)</span>
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border ${
                    diag.sueloPct >= 60 && diag.sueloPct <= 75
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {diag.sueloPct >= 60 && diag.sueloPct <= 75 ? "Suelo Equilibrado (60-70%)" : "Requiere rebalanceo"}
                </span>
              </div>

              {/* Barra de proporción visual */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-sky-300">🛡️ Suelo (ETFs): {diag.sueloPct}%</span>
                  <span className="text-indigo-300">🎯 Convicciones (Empresas): {diag.empresasPct}%</span>
                </div>
                <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${diag.sueloPct}%` }}
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-400"
                    title={`Suelo: ${diag.sueloPct}%`}
                  />
                  <div
                    style={{ width: `${diag.empresasPct}%` }}
                    className="h-full bg-indigo-500"
                    title={`Empresas: ${diag.empresasPct}%`}
                  />
                </div>
                <div className="text-[9px] text-zinc-500 flex justify-between">
                  <span>Objetivo Abel: 60% - 70%</span>
                  <span>Objetivo Abel: 30% - 40%</span>
                </div>
              </div>

              {/* Las 3 dimensiones de la diversificación real (Pág. 63) */}
              <div className="pt-2 border-t border-white/[0.04] grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-zinc-500 block uppercase font-bold">1. Sectorial</span>
                  <p className="text-zinc-300 font-sans mt-0.5 leading-snug">
                    {diag.threeDimensions?.sector || "Concentración tecnológica a vigilar"}
                  </p>
                </div>

                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-zinc-500 block uppercase font-bold">2. Geográfica</span>
                  <p className="text-zinc-300 font-sans mt-0.5 leading-snug">
                    {diag.threeDimensions?.geography || "Alta exposición al ciclo de EE.UU."}
                  </p>
                </div>

                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-zinc-500 block uppercase font-bold">3. Divisa</span>
                  <p className="text-zinc-300 font-sans mt-0.5 leading-snug">
                    {diag.threeDimensions?.currency || "Exposición al dólar sin cobertura"}
                  </p>
                </div>
              </div>

              {/* Control de la Regla del 10% por Empresa (Pág. 64) */}
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Regla del 10% por Empresa individual:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{diag.concentrationAlert || "Bajo control (<10%)"}</span>
                </span>
              </div>
            </div>
          )}

          {/* BLOQUE B: PROPUESTA DE APORTACIÓN 60 / 20 / 20 (TUS X €) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Reparto Estricto de Aportación ({effectiveAmount} €)</span>
              </span>
              <span className="text-[10px] text-zinc-500">
                60% Suelo · 20% Convicción · 20% Pólvora Seca
              </span>
            </div>

            <div className="space-y-2.5">
              {advisorData?.allocations?.map((item, idx) => {
                const isPolvora = item.type === "POLVORA_SECA";

                return (
                  <div
                    key={`${item.ticker}-${idx}`}
                    className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                      isPolvora
                        ? "bg-[#14151c] border-zinc-300/30 shadow-[0_0_15px_rgba(244,244,245,0.06)]"
                        : "bg-white/[0.03] border-white/[0.08] hover:border-amber-400/30"
                    }`}
                  >
                    {/* Fila 1: Cabecera del activo con tipo de bolsa */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {isPolvora ? "🪙 CASH" : item.ticker}
                        </span>
                        <span className="text-xs text-zinc-400 font-sans">
                          ({item.name})
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                            item.type === "SUELO"
                              ? "bg-sky-500/10 text-sky-400 border-sky-500/25"
                              : isPolvora
                              ? "bg-zinc-800 text-zinc-100 border-zinc-400/40"
                              : "bg-indigo-500/10 text-indigo-300 border-indigo-500/25"
                          }`}
                        >
                          {item.type === "SUELO"
                            ? "🛡️ SUELO TRONCAL (60%)"
                            : isPolvora
                            ? "🪙 PÓLVORA SECA / TÁCTICA (20%)"
                            : "🎯 CONVICCIÓN (20%)"}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            isPolvora ? "text-zinc-100" : "text-emerald-400"
                          }`}
                        >
                          +{formatEur(item.amount)}
                        </span>
                        {!isPolvora && (
                          <span className="text-[10px] text-zinc-500 block">
                            Peso: {item.currentWeight} → {item.targetWeight}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fila 2: Métricas de Calidad de Abel */}
                    {!isPolvora ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                        <div className="p-1.5 rounded bg-white/[0.02] border border-white/[0.04]">
                          <span className="text-zinc-500 block">ROIC (Rentab. Capital)</span>
                          <span className="font-bold text-zinc-200 mt-0.5 block">{item.metrics?.roic || "N/D"}</span>
                        </div>

                        <div className="p-1.5 rounded bg-white/[0.02] border border-white/[0.04]">
                          <span className="text-zinc-500 block">Flujo de Caja (FCF)</span>
                          <span className="font-bold text-emerald-400 mt-0.5 block">{item.metrics?.fcfStatus || "Recurrente"}</span>
                        </div>

                        <div className="p-1.5 rounded bg-white/[0.02] border border-white/[0.04]">
                          <span className="text-zinc-500 block">Múltiplo PER</span>
                          <span className="font-bold text-zinc-200 mt-0.5 block">{item.metrics?.pe || "En rango"}</span>
                        </div>

                        <div className="p-1.5 rounded bg-white/[0.02] border border-white/[0.04]">
                          <span className="text-zinc-500 block">Suelo Técnico</span>
                          <span className="font-bold text-sky-400 mt-0.5 block">{item.metrics?.technicalFloor || "Soporte SMA 200"}</span>
                        </div>
                      </div>
                    ) : null}

                    {/* Fila 3: Razón de asignación */}
                    <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                      {item.reason}
                    </p>

                    {/* SUB-BLOQUE ESPECIAL PARA PÓLVORA SECA: RADAR TÁCTICO DE ANALISTAS */}
                    {isPolvora && advisorData.tacticalAnalystIdea && (
                      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2 mt-2">
                        <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                          <span className="text-amber-300 font-bold flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>Idea Táctica de Analistas para esta Pólvora (Swing 2-4 semanas)</span>
                          </span>
                          <span className="text-[10px] px-2 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25">
                            {advisorData.tacticalAnalystIdea.analystConsensus}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{advisorData.tacticalAnalystIdea.ticker}</span>
                          <span className="text-xs text-zinc-400 font-sans">({advisorData.tacticalAnalystIdea.name})</span>
                        </div>

                        <p className="text-[11px] text-zinc-300 font-sans leading-snug">
                          <strong className="text-amber-300 font-mono">Catalizador a corto plazo: </strong>
                          {advisorData.tacticalAnalystIdea.catalyst}
                        </p>

                        {/* Plan de Salida Estricto de Abel (Págs. 66-67) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] pt-1">
                          <div className="p-1.5 rounded bg-white/[0.02] border border-white/[0.04]">
                            <span className="text-zinc-500 block">Zona de Entrada</span>
                            <span className="font-bold text-zinc-200 mt-0.5 block">{advisorData.tacticalAnalystIdea.entryZone}</span>
                          </div>
                          <div className="p-1.5 rounded bg-emerald-500/5 border border-emerald-500/15">
                            <span className="text-emerald-400 block font-bold">Take Profit (Techo)</span>
                            <span className="font-bold text-emerald-300 mt-0.5 block">{advisorData.tacticalAnalystIdea.takeProfit}</span>
                          </div>
                          <div className="p-1.5 rounded bg-rose-500/5 border border-rose-500/15">
                            <span className="text-rose-400 block font-bold">Stop Loss (Suelo)</span>
                            <span className="font-bold text-rose-300 mt-0.5 block">{advisorData.tacticalAnalystIdea.stopLoss}</span>
                          </div>
                        </div>

                        <p className="text-[9px] text-zinc-500 font-sans pt-1">
                          💡 Abel Castro: «Este dinero permanece en pólvora seca hasta que tú decidas si ejecutas o no la operación; no hay prisa por disparar cada mes.»
                        </p>
                      </div>
                    )}

                    {/* Fila 4: Condición de salida / invalidación */}
                    {item.exitCondition && !isPolvora && (
                      <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/15 text-[10px] flex items-start gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <div className="text-zinc-400 font-sans">
                          <strong className="text-rose-300 font-mono">Condición de invalidación: </strong>
                          {item.exitCondition}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* BLOQUE C: RADAR DE MERCADO EXTERIOR (NUEVAS OPORTUNIDADES COMPLEMENTARIAS) */}
          {advisorData?.externalMarketRadar && advisorData.externalMarketRadar.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>3. Radar Exterior: Nuevas Piezas para Diversificar de Verdad</span>
                </span>
                <span className="text-[9px] text-zinc-500">Criterio Calidad & ROIC &gt; 15%</span>
              </div>

              <p className="text-[10px] text-zinc-400 font-sans">
                Para evitar tener 10 empresas que suben y bajan por el mismo motivo (tecnología de EE.UU.), Abel recomienda explorar activos complementarios en sectores defensivos con balances impecables:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {advisorData.externalMarketRadar.map((ext, idx) => (
                  <div
                    key={`ext-${ext.ticker}-${idx}`}
                    className="p-3 rounded-lg bg-[#0e1320] border border-white/[0.06] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-zinc-100 text-xs">
                        <span className="text-amber-300">{ext.ticker}</span>
                        <span className="text-zinc-400 ml-1.5 font-sans font-normal text-[11px]">({ext.name})</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/[0.06] text-zinc-300">
                        {ext.sector}
                      </span>
                    </div>

                    <p className="text-[10px] text-zinc-300 font-sans leading-relaxed">
                      {ext.whyItFits}
                    </p>

                    <div className="pt-1 border-t border-white/[0.04] flex items-center justify-between text-[9px] text-zinc-400">
                      <span>ROIC: <strong className="text-emerald-400">{ext.roic}</strong></span>
                      <span>Flujo de caja: <strong className="text-zinc-300">{ext.fcfStatus}</strong></span>
                      <span>Tope: <strong className="text-sky-300">{ext.recommendedMaxWeight}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BLOQUE D: TESIS GLOBAL Y RUTINA DE FIN DE SEMANA */}
          {advisorData?.thesis && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block tracking-wider">
                Tesis Cuantitativa Global
              </span>
              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                {advisorData.thesis}
              </p>
            </div>
          )}

          {advisorData?.abelRoutineAdvice && (
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-[11px] space-y-1 font-sans">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-indigo-400 font-mono">
                <Calendar className="w-3.5 h-3.5" />
                <span>Rutina de Fin de Semana (Abel Castro)</span>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                {advisorData.abelRoutineAdvice}
              </p>
            </div>
          )}

          {savedAt && (
            <div className="text-center text-[10px] text-zinc-500 pt-2">
              Análisis institucional guardado en local • {new Date(savedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>

        {/* 4. PIE INFERIOR CON ACCIÓN DE CIERRE */}
        <div className="p-3 border-t border-white/[0.08] bg-[#0c111d] flex items-center justify-between shrink-0">
          <span className="text-[10px] text-zinc-500 font-sans">
            «Pensar y ejecutar son momentos distintos. Lo que decides en frío es siempre mejor.»
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 text-xs transition-colors"
          >
            Cerrar Asistente
          </button>
        </div>
      </div>
    </div>
  );
}
