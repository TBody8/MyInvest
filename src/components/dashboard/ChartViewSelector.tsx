"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { ChartView, ChartViewOption } from "@/types/trading212";

interface ChartViewSelectorProps {
  currentView: ChartView;
  onViewChange: (view: ChartView) => void;
}

export const CHART_VIEWS: ChartViewOption[] = [
  {
    id: "profit",
    label: "Beneficio Real",
    unit: "€",
    description: "Ganancia/pérdida neta acumulada",
  },
  {
    id: "value",
    label: "Valor de Cartera",
    unit: "€",
    description: "Capital liquidativo total",
  },
  {
    id: "returnPct",
    label: "Rentabilidad",
    unit: "%",
    description: "Retorno porcentual de la inversión",
  },
];

export default function ChartViewSelector({
  currentView,
  onViewChange,
}: ChartViewSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption = CHART_VIEWS.find((v) => v.id === currentView) || CHART_VIEWS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 -ml-2 rounded-md hover:bg-white/[0.06] text-zinc-200 hover:text-white transition-colors group"
      >
        <span className="text-xs font-semibold tracking-tight text-zinc-200 group-hover:text-white">
          {activeOption.label}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-zinc-300" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-40 w-56 rounded-lg bg-[#0e131f] border border-white/[0.1] shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-zinc-500">
            Seleccionar gráfico
          </div>
          {CHART_VIEWS.map((option) => {
            const isSelected = option.id === currentView;
            return (
              <button
                key={option.id}
                onClick={() => {
                  onViewChange(option.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-white/[0.08] text-white font-medium"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                }`}
              >
                <div>
                  <div className="font-medium leading-none">{option.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{option.description}</div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
