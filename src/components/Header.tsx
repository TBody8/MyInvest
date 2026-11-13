"use client";

import { useState, useEffect } from "react";
import { RefreshCw, SlidersHorizontal, Plus, Check, Activity, Compass, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import PortfolioSwitcher from "@/components/PortfolioSwitcher";
import { BrokerFilter } from "@/types/trading212";

interface HeaderProps {
  currentBroker: BrokerFilter;
  onSelectBroker: (broker: BrokerFilter) => void;
  isDemoData: boolean;
  lastUpdated?: string;
  isFetching: boolean;
  isRefreshedRecently?: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenRevolutAdd: () => void;
  activeTab?: "portfolio" | "map" | "macro" | "fundamentals";
  onSelectTab?: (tab: "portfolio" | "map" | "macro" | "fundamentals") => void;
}

export default function Header({
  currentBroker,
  onSelectBroker,
  isDemoData,
  lastUpdated,
  isFetching,
  isRefreshedRecently = false,
  onRefresh,
  onOpenSettings,
  onOpenRevolutAdd,
  activeTab = "portfolio",
  onSelectTab,
}: HeaderProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formattedTime = isMounted && lastUpdated
    ? format(new Date(lastUpdated), "HH:mm", { locale: es })
    : "--:--";

  return (
    <header className="sticky top-0 z-30 w-full bg-[#080b11]/90 backdrop-blur-md border-b border-white/[0.06] px-3.5 py-2.5 sm:px-6">
      <div className="relative max-w-5xl mx-auto flex items-center justify-between gap-2.5">
        {/* Lado izquierdo: Título y Selector Discreto de Carteras */}
        <div className="min-w-0 flex-1 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3 sm:flex-wrap">
          <span className="font-bold text-sm tracking-tight text-zinc-100 hidden sm:inline">
            Mis Inversiones
          </span>

          {/* Desplegable discreto de carteras */}
          <PortfolioSwitcher
            currentBroker={currentBroker}
            onSelectBroker={onSelectBroker}
          />

          {/* Indicador de última actualización */}
          <span className="text-[10px] text-zinc-500 font-mono hidden md:inline">
            {formattedTime}
          </span>

          {/* Selector de Pestaña Principal: Cartera vs Mapa Cartera vs Macro & Radar */}
          {onSelectTab && (
            <div className="inline-flex p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] font-mono text-[10px]">
              <button
                onClick={() => onSelectTab("portfolio")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeTab === "portfolio"
                    ? "bg-white/[0.12] text-white font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Mi Cartera
              </button>
              <button
                onClick={() => onSelectTab("map")}
                className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                  activeTab === "map"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Compass className="w-2.5 h-2.5 text-sky-400" />
                <span>Mapa Cartera</span>
              </button>
              <button
                onClick={() => onSelectTab("macro")}
                className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                  activeTab === "macro"
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Activity className="w-2.5 h-2.5 text-amber-400" />
                <span className="hidden sm:inline">Macro & Radar</span>
                <span className="sm:hidden">Macro</span>
              </button>
              <button
                onClick={() => onSelectTab("fundamentals")}
                className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                  activeTab === "fundamentals"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <BarChart3 className="w-2.5 h-2.5 text-purple-400" />
                <span className="hidden sm:inline">Fundamentales</span>
                <span className="sm:hidden">Fundam.</span>
              </button>
            </div>
          )}
        </div>

        {/* Lado derecho: Botón condicional de Revolut + Refresco + Feedback + Ajustes */}
        <div className="absolute right-0 top-0 sm:static shrink-0 flex items-center gap-1.5">
          {/* Mensaje de confirmación de sincronización */}
          {isRefreshedRecently && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 animate-in fade-in duration-200">
              <Check className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Sincronizado</span>
            </span>
          )}

          {/* BOTÓN CONDICIONAL: Solo aparece si estás en la cartera de Revolut */}
          {currentBroker === "revolut" && (
            <button
              onClick={onOpenRevolutAdd}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-mono text-zinc-200 hover:text-white transition-colors active:scale-95"
            >
              <Plus className="w-3 h-3 text-sky-400" />
              <span>Añadir</span>
            </button>
          )}

          {/* Botón de refresco manual con protección contra Hydration Mismatch */}
          <button
            onClick={onRefresh}
            disabled={isMounted ? isFetching : false}
            title="Forzar actualización en vivo desde la API"
            aria-label="Actualizar datos"
            suppressHydrationWarning
            className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 transition-transform duration-700 ${
                isMounted && isFetching ? "animate-spin text-emerald-400" : ""
              }`}
            />
          </button>

          {/* Botón de ajustes */}
          <button
            onClick={onOpenSettings}
            aria-label="Ajustes y sincronización"
            suppressHydrationWarning
            className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] active:scale-95 transition-all"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
