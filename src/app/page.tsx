"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import KpiHeader from "@/components/dashboard/KpiHeader";
import ProfitChart from "@/components/dashboard/ProfitChart";
import SecondaryMetrics from "@/components/dashboard/SecondaryMetrics";
import PortfolioDonut from "@/components/dashboard/PortfolioDonut";
import PositionsTable from "@/components/dashboard/PositionsTable";
import MonthlyHeatmap from "@/components/dashboard/MonthlyHeatmap";
import TransactionHistory from "@/components/dashboard/TransactionHistory";
import SettingsDrawer from "@/components/dashboard/SettingsDrawer";
import RevolutAddModal from "@/components/RevolutAddModal";
import MacroRadarView from "@/components/macro/MacroRadarView";
import AssetDetailDrawer from "@/components/dashboard/AssetDetailDrawer";
import SueloIndicatorBar from "@/components/dashboard/SueloIndicatorBar";
import PortfolioMapTab from "@/components/map/PortfolioMapTab";
import FundamentalsView from "@/components/fundamentals/FundamentalsView";
import { DashboardData, BrokerFilter, T212Position } from "@/types/trading212";
import { cleanTicker } from "@/lib/utils";
import { AlertCircle, RefreshCw } from "lucide-react";

async function fetchDashboardData(broker: BrokerFilter, force = false): Promise<DashboardData> {
  const url = `/api/portfolio?broker=${broker}${force ? "&force=true" : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al cargar datos del portfolio");
  }
  return res.json();
}

export default function DashboardPage() {
  const [currentBroker, setCurrentBroker] = useState<BrokerFilter>("all");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRevolutModalOpen, setIsRevolutModalOpen] = useState(false);
  const [editingRevolutPosition, setEditingRevolutPosition] = useState<T212Position | null>(null);
  const [isRefreshedRecently, setIsRefreshedRecently] = useState(false);
  const [isForceFetching, setIsForceFetching] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<"portfolio" | "map" | "macro" | "fundamentals">("portfolio");
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<T212Position | null>(null);
  const [selectedFundamentalTicker, setSelectedFundamentalTicker] = useState<string | null>(null);

  // Cargar preferencia de broker guardada en localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("preferred_broker") as BrokerFilter | null;
      if (saved && ["all", "t212", "revolut"].includes(saved)) {
        setCurrentBroker(saved);
      }
    }
  }, []);

  const handleSelectBroker = (broker: BrokerFilter) => {
    setCurrentBroker(broker);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferred_broker", broker);
    }
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<DashboardData>({
    queryKey: ["portfolio-dashboard", currentBroker],
    queryFn: () => fetchDashboardData(currentBroker),
    refetchInterval: 60 * 1000,
  });

  const queryClient = useQueryClient();

  // Precarga automática en segundo plano de todos los gráficos de activos para apertura instantánea (0ms)
  useEffect(() => {
    if (data?.positions && data.positions.length > 0) {
      data.positions.forEach((pos) => {
        const ticker = cleanTicker(pos.ticker);
        queryClient.prefetchQuery({
          queryKey: ["asset-details", ticker, "1M"],
          queryFn: async () => {
            const res = await fetch(`/api/asset/details?ticker=${encodeURIComponent(ticker)}&timeframe=1M`);
            if (!res.ok) return null;
            return res.json();
          },
          staleTime: 60 * 1000,
        });
      });
    }
  }, [data?.positions, queryClient]);

  const handleManualRefresh = async () => {
    setIsForceFetching(true);
    try {
      await fetchDashboardData(currentBroker, true);
      await refetch();
      setIsRefreshedRecently(true);
      setTimeout(() => setIsRefreshedRecently(false), 2500);
    } catch (err) {
      console.warn("Error en refresco:", err);
    } finally {
      setIsForceFetching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b11] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
      {/* Header Fijo con Selector de Carteras y Switcher Macro & Radar */}
      <Header
        currentBroker={currentBroker}
        onSelectBroker={handleSelectBroker}
        isDemoData={data?.isDemoData ?? true}
        lastUpdated={data?.lastUpdated}
        isFetching={isFetching || isForceFetching}
        isRefreshedRecently={isRefreshedRecently}
        onRefresh={handleManualRefresh}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenRevolutAdd={() => {
          setEditingRevolutPosition(null);
          setIsRevolutModalOpen(true);
        }}
        activeTab={activeMainTab}
        onSelectTab={(tab) => {
          setSelectedFundamentalTicker(null);
          setActiveMainTab(tab);
        }}
      />

      {/* Contenido Principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-3 pb-10 space-y-3 sm:space-y-4 overflow-x-hidden">
        {/* Skeleton de carga minimalista */}
        {isLoading && (
          <div className="space-y-4 pt-3">
            <div className="h-20 bg-white/[0.02] rounded-md animate-pulse" />
            <div className="h-64 bg-white/[0.02] rounded-md animate-pulse" />
            <div className="h-16 bg-white/[0.02] rounded-md animate-pulse" />
            <div className="h-44 bg-white/[0.02] rounded-md animate-pulse" />
          </div>
        )}

        {/* Estado de Error */}
        {isError && (
          <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-800/40 text-center space-y-2.5 my-4">
            <AlertCircle className="w-5 h-5 text-rose-400 mx-auto" />
            <div className="text-xs font-semibold text-rose-200">
              Error al conectar con el servidor
            </div>
            <p className="text-[11px] text-rose-300 font-mono">
              {error instanceof Error ? error.message : "Error inesperado"}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reintentar</span>
            </button>
          </div>
        )}

        {/* Vista Alternativa 1: Macro & Radar */}
        {activeMainTab === "macro" && (
          <MacroRadarView
            currentBroker={currentBroker}
            onSelectStock={(ticker) => {
              setSelectedFundamentalTicker(ticker);
              setActiveMainTab("fundamentals");
            }}
          />
        )}

        {/* Vista Alternativa 2: Mapa de Cartera (Criterio Fitintrade) */}
        {activeMainTab === "map" && data && (
          <PortfolioMapTab
            positions={data.positions ?? []}
            totalValue={data.accountSummary?.totalValue ?? 0}
            currentBroker={currentBroker}
            onSelectAsset={(pos) => setSelectedAssetForDetails(pos)}
          />
        )}

        {/* Vista Alternativa 3: Fundamentales (Buscador, Historia + Previsión Consenso, Márgenes, Caja, Balance) */}
        {activeMainTab === "fundamentals" && (
          <FundamentalsView initialTicker={selectedFundamentalTicker} />
        )}

        {/* Dashboard Mi Cartera: Datos Renderizados */}
        {activeMainTab === "portfolio" && data && (
          <>
            {/* 1. Héroe Tipográfico: Beneficio Real de la cartera activa */}
            <KpiHeader summary={data.accountSummary} />

            {/* 2. Gráfico con Dropdown de Vistas + Selector Temporal Debajo */}
            <ProfitChart
              data={data.chartData}
              currentProfit={data.accountSummary?.realProfit ?? 0}
              currentBroker={currentBroker}
            />

            {/* 3. Métricas Secundarias en Fila Dividida (TWR, vs S&P, Concentración, Diversificación) */}
            <SecondaryMetrics metrics={data.metrics} />

            {/* 4. Distribución de Cartera */}
            <PortfolioDonut
              positions={data.positions ?? []}
              totalValue={data.accountSummary?.totalValue ?? 0}
            />

            {/* Micro-Barra de Diagnóstico de Suelo (Criterio Fitintrade) */}
            <SueloIndicatorBar
              positions={data.positions ?? []}
              onOpenMap={() => setActiveMainTab("map")}
            />

            {/* 5. Tabla de Posiciones con indicador de broker, edición y apertura de ficha técnica */}
            <PositionsTable
              positions={data.positions ?? []}
              currentBroker={currentBroker}
              eurUsdRate={data.eurUsdRate}
              onSelectPosition={(pos) => setSelectedAssetForDetails(pos)}
              onEditPosition={(pos) => {
                setEditingRevolutPosition(pos);
                setIsRevolutModalOpen(true);
              }}
            />

            {/* 6. Heatmap de Rendimiento Mensual */}
            <MonthlyHeatmap heatmapData={data.heatmap ?? []} />

            {/* 7. Movimientos Recientes (solo para T212 y Total) */}
            {currentBroker !== "revolut" && (
              <TransactionHistory transactions={data.transactions ?? []} />
            )}
          </>
        )}
      </main>

      {/* Ficha Técnica Profesional con Velas Japonesas y Fundamentales */}
      <AssetDetailDrawer
        position={selectedAssetForDetails}
        onClose={() => setSelectedAssetForDetails(null)}
      />

      {/* Drawer de Ajustes y Snapshot */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDemoData={data?.isDemoData ?? true}
        onSnapshotTaken={() => refetch()}
      />

      {/* Modal para Añadir/Editar Acciones de Revolut */}
      <RevolutAddModal
        isOpen={isRevolutModalOpen}
        onClose={() => {
          setIsRevolutModalOpen(false);
          setEditingRevolutPosition(null);
        }}
        onSuccess={() => refetch()}
        initialPosition={editingRevolutPosition}
      />
    </div>
  );
}
