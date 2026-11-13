"use client";

import { useState, useEffect, useRef } from "react";
import { X, Trash2, Check, AlertCircle, FileSpreadsheet, Search, Loader2, Calendar } from "lucide-react";
import { T212Position } from "@/types/trading212";
import { localToday } from "@/lib/revolutAccounting";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface RevolutAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPosition?: T212Position | null;
}

interface SearchItem {
  symbol: string;
  name: string;
  exchange: string;
}

export default function RevolutAddModal({
  isOpen,
  onClose,
  onSuccess,
  initialPosition,
}: RevolutAddModalProps) {
  const [ticker, setTicker] = useState(initialPosition?.ticker || "");
  const [companyName, setCompanyName] = useState(initialPosition?.name || "");
  const [quantity, setQuantity] = useState(initialPosition ? String(initialPosition.quantity) : "");
  const [averagePrice, setAveragePrice] = useState(initialPosition ? String(initialPosition.averagePrice) : "");
  const [currency, setCurrency] = useState<string | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(localToday);
  const requestId = useRef("");
  const submissionKey = useRef("");
  const [instrumentError, setInstrumentError] = useState<string | null>(null);
  
  // Estados para autocompletado en vivo
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Estados de guardado / importación
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(initialPosition);

  // Sincronizar campos cuando se abre el modal o cambia la posición a editar
  useEffect(() => {
    if (initialPosition) {
      setTicker(initialPosition.ticker || "");
      setCompanyName(initialPosition.name || "");
      setQuantity(initialPosition.quantity !== undefined ? String(initialPosition.quantity) : "");
      setAveragePrice(initialPosition.averagePrice !== undefined ? String(initialPosition.averagePrice) : "");
      setCurrency("EUR");
      setPurchaseDate(localToday());
    } else {
      setTicker("");
      setCompanyName("");
      setQuantity("");
      setAveragePrice("");
      setCurrency(null);
      setPurchaseDate(localToday());
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    requestId.current = generateUUID();
    submissionKey.current = "";
  }, [initialPosition, isOpen]);

  useEffect(() => {
    if (!isOpen || isEditing) return;
    setCurrency(null);
    setInstrumentError(null);
    if (!ticker.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/revolut/instrument?ticker=${encodeURIComponent(ticker.trim())}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo verificar la divisa");
        if (!controller.signal.aborted) setCurrency(data.currency);
      } catch (error) {
        if (!controller.signal.aborted) setInstrumentError(error instanceof Error ? error.message : "Divisa no disponible");
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [ticker, isOpen, isEditing]);

  // Cerrar desplegable al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Búsqueda en vivo con debounce mientras escribe en el input
  useEffect(() => {
    if (isEditing || !isOpen) return;
    const term = ticker.trim();
    if (term.length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/ticker/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
          setShowDropdown(!companyName && (data.results || []).length > 0);
        }
      } catch (err) {
        console.warn("Error buscando ticker:", err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [ticker, isEditing, isOpen, companyName]);

  if (!isOpen) return null;

  // Seleccionar empresa del desplegable
  const handleSelectResult = async (item: SearchItem) => {
    setTicker(item.symbol);
    setCompanyName(item.name);
    setShowDropdown(false);
  };

  // Subir e interpretar archivo CSV de Revolut
  const handleCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingCsv(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const text = await file.text();
      const res = await fetch("/api/revolut/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al procesar archivo CSV");
      }

      const msg = data.message || `¡${data.importedCount} posiciones importadas con éxito!`;
      setSuccessMsg(msg);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1600);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al importar CSV");
    } finally {
      setIsImportingCsv(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveTicker = (isEditing && initialPosition ? initialPosition.ticker : ticker).trim().toUpperCase();
    if (!effectiveTicker || !quantity || !averagePrice || !currency || isSaving) {
      setErrorMsg("Completa todos los campos");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    const fingerprint = JSON.stringify([effectiveTicker, quantity, averagePrice, currency, purchaseDate, isEditing]);
    if (submissionKey.current !== fingerprint) {
      requestId.current = generateUUID();
      submissionKey.current = fingerprint;
    }

    try {
      const res = await fetch("/api/revolut/position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: effectiveTicker,
          quantity: parseFloat(quantity),
          averagePrice: parseFloat(averagePrice),
          currency,
          fillDate: purchaseDate,
          isEdit: isEditing,
          requestId: requestId.current,
          name: companyName || initialPosition?.name || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al guardar posición");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialPosition?.ticker) return;
    if (!confirm(`¿Eliminar ${initialPosition.ticker} de Revolut?`)) return;

    setIsDeleting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/revolut/position?ticker=${encodeURIComponent(initialPosition.ticker)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar posición Revolut" : "Añadir compra Revolut"}
        className="w-full max-w-sm max-h-[90dvh] overflow-y-auto bg-[#0e131f] border border-white/[0.08] rounded-xl p-4 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con botón minimalista de líneas discontinuas para importar CSV */}
        <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06] mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-200 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-200 border border-white/40" />
              <span>{isEditing ? `Editar ${initialPosition?.ticker}` : "Añadir a Revolut"}</span>
            </div>

            {/* Botón minimalista de línea discontinua a la derecha */}
            {!isEditing && (
              <label className="cursor-pointer inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-400 hover:text-zinc-200 border border-dashed border-zinc-700/60 hover:border-zinc-400 transition-colors">
                <FileSpreadsheet className="w-3 h-3 text-zinc-400" />
                <span>{isImportingCsv ? "Leyendo..." : "Importar CSV"}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFile}
                  className="hidden"
                  disabled={isImportingCsv}
                />
              </label>
            )}
          </div>

          <button
            aria-label="Cerrar formulario Revolut"
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mensaje de éxito si se importó CSV */}
        {successMsg && (
          <div className="p-2 mb-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
          {/* Campo Ticker con Autocompletado en Vivo */}
          <div className="relative" ref={searchContainerRef}>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
              Ticker o Nombre de empresa
            </label>
            <div className="relative">
              <input
                aria-label="Ticker o nombre de empresa"
                type="text"
                value={ticker}
                onChange={(e) => {
                  setTicker(e.target.value);
                  setCompanyName("");
                  setCurrency(null);
                }}
                onFocus={() => {
                  if (searchResults.length > 0 && !isEditing) setShowDropdown(true);
                }}
                disabled={isEditing}
                placeholder="ej: NVDA, Apple, Tesla, SAN..."
                className="w-full px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-md text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-white/[0.25] transition-colors disabled:opacity-50 pr-7"
                autoFocus={!isEditing}
              />
              {isSearching && (
                <Loader2 className="w-3 h-3 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              )}
            </div>

            {/* Desplegable de Resultados de Búsqueda */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 top-full mt-1 w-full bg-[#131b2e] border border-white/[0.12] rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-white/[0.04]">
                {searchResults.map((item) => (
                  <button
                    key={`${item.exchange}-${item.symbol}`}
                    type="button"
                    onClick={() => handleSelectResult(item)}
                    className="w-full px-2.5 py-2 text-left hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-zinc-100">{item.symbol}</span>
                        {item.exchange && (
                          <span className="text-[9px] text-zinc-500 px-1 py-0.2 bg-white/[0.04] rounded font-mono">
                            {item.exchange}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate max-w-[220px]">
                        {item.name}
                      </div>
                    </div>
                    <Search className="w-3 h-3 text-zinc-500 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
              Cantidad de acciones
            </label>
            <input
              aria-label="Cantidad de acciones"
              type="number"
              step="any"
              min="0.000000001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="ej: 5 o 2.5"
              className="w-full px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-md text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-white/[0.25] transition-colors"
            />
          </div>

          <div>
            <div className="flex flex-wrap gap-2 items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
              <span>{isEditing ? "Coste medio" : "Precio de compra"} ({currency || "verificando"})</span>
              {!isEditing && <div
                className="flex items-center gap-1 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]"
                title="Fecha de compra de la acción (por defecto hoy)"
              >
                <Calendar className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                <input
                  type="date"
                  aria-label="Fecha de compra"
                  max={localToday()}
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="bg-transparent text-[11px] text-zinc-300 font-mono focus:text-white outline-none cursor-pointer [color-scheme:dark]"
                />
              </div>}
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-zinc-400 text-xs font-mono font-bold pointer-events-none">
                {currency === "USD" ? "$" : currency === "EUR" ? "€" : ""}
              </span>
              <input
                aria-label={isEditing ? "Coste medio en EUR" : "Precio de compra"}
                type="number"
                step="any"
                min="0.000000001"
                value={averagePrice}
                onChange={(e) => setAveragePrice(e.target.value)}
                placeholder={currency === "USD" ? "125.40" : "115.40"}
                className="w-full pl-7 pr-2.5 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-md text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-white/[0.25] transition-colors"
              />
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-zinc-400 font-sans pt-0.5">
            {isEditing ? "Corrección de la posición total. El coste almacenado está en EUR; guardar no vuelve a convertirlo." : "La compra se suma a tu posición. La conversión a EUR usa el cierre de cambio de esa fecha o del último día disponible."}
          </p>
          {!isEditing && <p className="text-[11px] text-zinc-400">CSV: importa el historial completo. Reconcilia las posiciones incluidas en el extracto.</p>}
          {instrumentError && <p role="alert" className="text-xs text-amber-300">{instrumentError}</p>}

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-rose-400 text-[11px] pt-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center gap-2 pt-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-2.5 py-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                title="Eliminar posición"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving || !currency || isImportingCsv}
              className="flex-1 py-1.5 px-3 rounded-md bg-white/[0.1] hover:bg-white/[0.16] active:scale-[0.98] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isEditing ? "Guardar cambios" : "Guardar posición"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
