"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { BrokerFilter } from "@/types/trading212";

interface PortfolioSwitcherProps {
  currentBroker: BrokerFilter;
  onSelectBroker: (broker: BrokerFilter) => void;
}

const BROKERS: Array<{ id: BrokerFilter; label: string; dotClass: string; description: string }> = [
  {
    id: "all",
    label: "Total Consolidado",
    dotClass: "bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.3)]",
    description: "Trading 212 + Revolut combinados",
  },
  {
    id: "t212",
    label: "Trading 212",
    // Trading 212 ahora tiene el color azul cielo (sky-400)
    dotClass: "bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.3)]",
    description: "Cuenta live Trading 212",
  },
  {
    id: "revolut",
    label: "Revolut",
    // Revolut ahora tiene un gris claro brillante de alto contraste con micro-borde
    dotClass: "bg-zinc-200 border border-zinc-400/50 shadow-[0_0_6px_rgba(255,255,255,0.25)]",
    description: "Cartera de acciones en Revolut",
  },
];

export default function PortfolioSwitcher({
  currentBroker,
  onSelectBroker,
}: PortfolioSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeBroker = BROKERS.find((b) => b.id === currentBroker) || BROKERS[0];

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
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-mono text-zinc-300 hover:text-white transition-colors"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${activeBroker.dotClass}`} />
        <span className="font-medium text-[11px] sm:text-xs">{activeBroker.label}</span>
        <ChevronDown
          className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-zinc-300" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-40 w-52 rounded-lg bg-[#0e131f] border border-white/[0.1] shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-150 font-mono">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500">
            Cambiar cartera
          </div>
          {BROKERS.map((b) => {
            const isSelected = b.id === currentBroker;
            return (
              <button
                key={b.id}
                onClick={() => {
                  onSelectBroker(b.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-white/[0.08] text-white font-medium"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.dotClass}`} />
                  <div>
                    <div className="font-medium leading-none">{b.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 font-sans">{b.description}</div>
                  </div>
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
