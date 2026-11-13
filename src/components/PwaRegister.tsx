"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function PwaRegister() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Registrar Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registrado con éxito:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Error al registrar Service Worker:", err);
        });
    }

    // Comprobar estado de conexión
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      {/* Banner de modo sin conexión (solo visible si no hay internet) */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-rose-950/90 border-b border-rose-800 text-rose-200 px-4 py-2 flex items-center justify-center gap-2 text-xs font-mono font-medium backdrop-blur-md">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Sin conexión. Las cotizaciones no se pueden actualizar.</span>
        </div>
      )}
    </>
  );
}
