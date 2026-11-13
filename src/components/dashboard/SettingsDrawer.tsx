"use client";

import { useState } from "react";
import { X, Camera, Check, Server, Clock, KeyRound } from "lucide-react";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isDemoData: boolean;
  onSnapshotTaken: () => void;
}

export default function SettingsDrawer({
  isOpen,
  onClose,
  isDemoData,
  onSnapshotTaken,
}: SettingsDrawerProps) {
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTakeSnapshot = async () => {
    setIsTakingSnapshot(true);
    setErrorMsg(null);
    setSnapshotSuccess(false);

    try {
      const res = await fetch("/api/snapshot", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al tomar snapshot");
      }

      setSnapshotSuccess(true);
      onSnapshotTaken();
      setTimeout(() => setSnapshotSuccess(false), 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setIsTakingSnapshot(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full sm:max-w-md bg-[#0e131f] border border-white/[0.08] rounded-t-xl sm:rounded-xl p-4 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06] mb-3">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-zinc-100">
              Ajustes & Sincronización
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="space-y-3 text-xs font-mono">
          {/* Estado API */}
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
              Conexión
            </div>
            {isDemoData ? (
              <div className="text-amber-400 text-xs">
                Modo Demo. Configura <code className="text-zinc-200">T212_API_KEY</code> en <code className="text-zinc-200">.env.local</code>.
              </div>
            ) : (
              <div className="text-emerald-400 text-xs flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Trading 212 Live activo</span>
              </div>
            )}
          </div>

          {/* Snapshot Manual */}
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-zinc-200 font-medium">Snapshot Manual</div>
                <div className="text-[10px] text-zinc-500">Foto actual a SQLite</div>
              </div>
            </div>

            <button
              onClick={handleTakeSnapshot}
              disabled={isTakingSnapshot}
              className="w-full py-2 px-3 rounded-md bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.98] text-zinc-100 text-xs font-medium flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isTakingSnapshot ? (
                <span>Guardando...</span>
              ) : snapshotSuccess ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Snapshot guardado</span>
                </>
              ) : (
                <>
                  <Camera className="w-3 h-3" />
                  <span>Capturar Snapshot</span>
                </>
              )}
            </button>

            {errorMsg && <p className="text-[10px] text-rose-400">{errorMsg}</p>}
          </div>

          {/* Cron VPS */}
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-1.5 text-zinc-300 font-medium mb-1">
              <Clock className="w-3 h-3 text-sky-400" />
              <span>Cron Automático en VPS</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-normal">
              Snapshot diario a las <span className="text-zinc-300">21:00 CET</span> (cierre de mercados) almacenado en SQLite local.
            </p>
          </div>

          {/* Configuración API Key */}
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-1.5 text-zinc-300 font-medium mb-1">
              <KeyRound className="w-3 h-3 text-amber-400" />
              <span>Conectar API Key</span>
            </div>
            <ol className="text-[10px] text-zinc-500 list-decimal list-inside space-y-0.5 leading-normal">
              <li>Trading 212 ➔ Ajustes ➔ API (Beta).</li>
              <li>Genera tu API key de lectura.</li>
              <li>Pégala en <code className="text-zinc-300">.env.local</code>.</li>
              <li>Reinicia con <code className="text-zinc-300">pm2 restart 0</code>.</li>
            </ol>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 py-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-mono transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
