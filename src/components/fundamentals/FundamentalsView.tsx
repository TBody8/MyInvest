"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, RefreshCw, Search } from "lucide-react";
import TickerSearchBar from "./TickerSearchBar";
import CompanyHeader from "./CompanyHeader";
import SubmenuTabs from "./SubmenuTabs";
import GrowthChart from "./GrowthChart";
import MarginsChart from "./MarginsChart";
import CashFlowCard from "./CashFlowCard";
import BalanceDebtCard from "./BalanceDebtCard";
import ValuationCard from "./ValuationCard";
import AssetDetailDrawer from "@/components/dashboard/AssetDetailDrawer";
import { T212Position } from "@/types/trading212";
import {
  CompanyFundamentalsData,
  CompanyProfile,
  FundamentalPeriodType,
  FundamentalSubmenuTab,
} from "@/types/fundamentals";

interface FundamentalsViewProps {
  initialTicker?: string | null;
}

export default function FundamentalsView({
  initialTicker = null,
}: FundamentalsViewProps) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(initialTicker);
  const [periodType, setPeriodType] = useState<FundamentalPeriodType>("annual");
  const [activeTab, setActiveTab] = useState<FundamentalSubmenuTab>("growth");
  const [isTechnicalDrawerOpen, setIsTechnicalDrawerOpen] = useState(false);
  const [stableProfile, setStableProfile] = useState<CompanyProfile | null>(null);

  // Sincronizar ticker si viene seleccionado desde otra sección (ej. Radar Sectorial)
  useEffect(() => {
    if (initialTicker) {
      setStableProfile(null);
      setSelectedTicker(initialTicker);
    }
  }, [initialTicker]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CompanyFundamentalsData>({
    queryKey: ["fundamentals-data", selectedTicker, periodType],
    queryFn: async () => {
      if (!selectedTicker) throw new Error("No ticker selected");
      const res = await fetch(
        `/api/fundamentals?ticker=${encodeURIComponent(selectedTicker)}&period=${periodType}`
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Error al cargar datos fundamentales");
      }
      return res.json();
    },
    enabled: !!selectedTicker,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Estabilizar el perfil del ticker para que nunca oscilen decimales al cambiar Anual / Trimestral / TTM
  useEffect(() => {
    if (data?.profile) {
      setStableProfile((prev) => {
        if (!prev || prev.ticker !== data.profile.ticker) {
          return data.profile;
        }
        return data.profile;
      });
    }
  }, [data?.profile]);

  const activeProfile = stableProfile || data?.profile;

  // Objeto de posición sintético para alimentar el visor de velas japonesas de cualquier activo buscado
  const syntheticPosition: T212Position | null = useMemo(() => {
    if (!activeProfile && !selectedTicker) return null;
    const price = activeProfile?.currentPrice ?? 0;
    return {
      ticker: activeProfile?.ticker || selectedTicker || "",
      name: activeProfile?.name || selectedTicker || "",
      currentPrice: price,
      quantity: 0,
      averagePrice: 0,
      ppl: 0,
      totalCost: 0,
      currentValue: 0,
      dailyChangePct: activeProfile?.changePercent || 0,
      broker: "T212",
    };
  }, [activeProfile, selectedTicker]);

  return (
    <div className="space-y-3 sm:space-y-4 max-w-5xl mx-auto pb-8">
      {/* 1. Buscador Superior con Autocompletado */}
      <TickerSearchBar
        currentTicker={selectedTicker}
        onSelectTicker={(newTicker) => {
          setStableProfile(null);
          setSelectedTicker(newTicker);
        }}
      />

      {/* 2. Estado Inicial: Sin acción seleccionada (Esperando búsqueda) */}
      {!selectedTicker && (
        <div className="p-8 sm:p-12 rounded-2xl bg-[#080b11]/80 border border-white/[0.08] backdrop-blur-md flex flex-col items-center justify-center text-center space-y-4 font-mono select-none">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 shadow-inner">
            <Search className="w-5 h-5 text-sky-400" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <span className="text-sm font-bold text-white block">
              Explorador de Fundamentales
            </span>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              Busca una empresa para consultar sus estados financieros y previsiones de analistas. Los ETF no disponen de cuentas empresariales comparables.
            </p>
          </div>

          {/* Accesos rápidos sugeridos */}
          <div className="pt-2 flex items-center gap-1.5 flex-wrap justify-center text-[10px]">
            <span className="text-zinc-500 uppercase tracking-wider text-[9px] mr-1">
              Popular:
            </span>
            {["NVDA", "AAPL", "MSFT", "AMZN", "ITX.MC"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setStableProfile(null);
                  setSelectedTicker(t);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-sky-500/30 text-zinc-300 hover:text-white transition-all font-bold"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Estado de Carga */}
      {selectedTicker && isLoading && (
        <div className="p-8 rounded-2xl bg-[#080b11]/80 border border-white/[0.08] backdrop-blur-md flex flex-col items-center justify-center space-y-3 font-mono text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          <span className="text-xs">
            Extrayendo cuentas anuales y previsiones de {selectedTicker}...
          </span>
        </div>
      )}

      {/* 4. Estado de Error */}
      {selectedTicker && isError && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>No se pudieron cargar los datos fundamentales de {selectedTicker}</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-sans">
            {error instanceof Error ? error.message : "El ticker no dispone de estados financieros publicados o es un ETF sin balance."}
          </p>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white flex items-center gap-1.5 transition-colors mt-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {/* 5. Contenido Principal cuando los datos están listos */}
      {selectedTicker && !isLoading && !isError && data && activeProfile && (
        <>
          {/* Cabecera de la Compañía (Logo, Nombre, Cotización, Selector Temporal y Botón Gráfico Técnico) */}
          <CompanyHeader
            profile={activeProfile}
            periodType={periodType}
            onChangePeriod={(newPeriod) => setPeriodType(newPeriod)}
            onOpenTechnicalChart={() => setIsTechnicalDrawerOpen(true)}
          />

          {/* Sub-menú de Pestañas Sobrio y Sin Emojis */}
          <SubmenuTabs
            activeTab={activeTab}
            onChangeTab={(tab) => setActiveTab(tab)}
          />
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Yahoo Finance · Cuentas en {activeProfile.financialCurrency || "divisa no indicada"} · {periodType === "ttm" ? "Últimos cuatro trimestres completos" : periodType === "quarterly" ? "Trimestres identificados por fecha de cierre; crecimiento interanual" : "Ejercicios fiscales"}.
            {periodType !== "quarterly" && " ROE/ROIC sobre saldos medios."} N/D indica información insuficiente. El consenso de BPA puede usar ajustes distintos del histórico publicado.
          </p>

          {/* Bloques Modulares según la Pestaña Activa */}
          <div className="transition-all duration-200">
            {activeTab === "growth" && (
              <GrowthChart
                history={data.history}
                forecasts={data.forecasts}
                currency={activeProfile.financialCurrency || "N/D"}
              />
            )}

            {activeTab === "margins" && (
              <MarginsChart
                history={data.history}
                medians={data.medians}
              />
            )}

            {activeTab === "cashflow" && (
              <CashFlowCard
                history={data.history}
                medians={data.medians}
                currency={activeProfile.financialCurrency || "N/D"}
              />
            )}

            {activeTab === "balance" && (
              <BalanceDebtCard
                history={data.history}
                medians={data.medians}
                currency={activeProfile.financialCurrency || "N/D"}
              />
            )}

            {activeTab === "valuation" && (
              <ValuationCard
                valuation={data.valuation}
                historicalMultiples={data.historicalMultiples}
                currentPrice={activeProfile.currentPrice}
                currency={activeProfile.currency}
              />
            )}
          </div>
        </>
      )}

      {/* 6. Cajón de Gráfico Técnico con Velas Japonesas y TradingView */}
      <AssetDetailDrawer
        marketOnly
        position={isTechnicalDrawerOpen ? syntheticPosition : null}
        onClose={() => setIsTechnicalDrawerOpen(false)}
      />
    </div>
  );
}
