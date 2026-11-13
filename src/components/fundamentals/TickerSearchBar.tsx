"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2, TrendingUp, Building2 } from "lucide-react";

interface SearchResultItem {
  symbol: string;
  name: string;
  exchange: string;
}

interface TickerSearchBarProps {
  currentTicker?: string | null;
  onSelectTicker: (ticker: string) => void;
}

export default function TickerSearchBar({
  currentTicker,
  onSelectTicker,
}: TickerSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search query
  useEffect(() => {
    if (!query.trim() || query.trim().length < 1) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/ticker/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        if (res.ok && !controller.signal.aborted) {
          const data = await res.json();
          setResults(data.results || []);
          setIsOpen(true);
          setSelectedIndex(-1);
        }
      } catch (err) {
        if (!controller.signal.aborted) console.error("Error al buscar tickers:", err);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 220);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (symbol: string) => {
    onSelectTicker(symbol);
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex].symbol);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full z-40">
      {/* Input de Búsqueda Estilizado */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-zinc-400 pointer-events-none flex items-center">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar acción o ETF... (ej: NVDA, AAPL, ITX.MC)"
          className="w-full pl-9 pr-9 py-2.5 bg-[#0e1320]/90 border border-white/[0.1] focus:border-sky-500/50 rounded-xl text-xs sm:text-sm font-mono text-white placeholder-zinc-500 outline-none transition-all shadow-inner backdrop-blur-md"
        />

        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Desplegable de Sugerencias en Tiempo Real */}
      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 mt-1.5 bg-[#0e1320] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
          <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-zinc-500 font-bold bg-white/[0.02]">
            Resultados del Mercado
          </div>

          {results.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const logoUrl = `https://assets.parqet.com/logos/symbol/${item.symbol}`;

            return (
              <div
                key={`${item.symbol}-${idx}`}
                onClick={() => handleSelect(item.symbol)}
                className={`px-3 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected ? "bg-white/[0.1]" : "hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {/* Logo de la empresa con fallback */}
                  <div className="w-6 h-6 rounded-md bg-white/[0.06] border border-white/[0.1] overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                    <img
                      src={logoUrl}
                      alt={item.symbol}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white font-mono">
                        {item.symbol}
                      </span>
                      {currentTicker && item.symbol.toUpperCase() === currentTicker.toUpperCase() && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono font-bold">
                          ACTUAL
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400 font-sans truncate block">
                      {item.name}
                    </span>
                  </div>
                </div>

                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400 font-mono shrink-0 border border-white/[0.06]">
                  {item.exchange || "MKT"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
