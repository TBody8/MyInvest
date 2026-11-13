"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gauge, Activity } from "lucide-react";

interface SentimentPayload {
  score: number;
  rating: string;
  previousClose: number;
  previous1Week: number;
  previous1Month: number;
  previous1Year: number;
  timestamp: string;
}

export default function FearGreedGauge() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Retardo sutil para disparar la animación de giro de la aguja al montar
    const t = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(t);
  }, []);

  const { data, isLoading } = useQuery<SentimentPayload>({
    queryKey: ["market-sentiment-fear-greed"],
    queryFn: async () => {
      const res = await fetch("/api/macro/sentiment");
      if (!res.ok) throw new Error("Error cargando índice de sentimiento");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return <div className="h-full rounded-xl border border-white/[0.06] p-4 text-xs text-zinc-400">CNN Fear & Greed · {isLoading ? "Cargando…" : "N/D: proveedor no disponible"}</div>;
  const score = data.score;
  const rating = data.rating;

  // Ángulo de la aguja: de -90° (0 = Miedo Extremo) a +90° (100 = Codicia Extrema)
  // Al montar arranca en -90° y gira fluidamente hasta su ángulo real
  const targetAngle = -90 + (Math.max(0, Math.min(100, score)) / 100) * 180;
  const currentAngle = mounted ? targetAngle : -90;

  // Color de acento según la zona del índice
  const getZoneColor = (s: number) => {
    if (s <= 25) return "#f43f5e"; // Carmesí / Extreme Fear
    if (s <= 45) return "#f97316"; // Naranja / Fear
    if (s <= 55) return "#eab308"; // Amarillo tenue / Neutral
    if (s <= 75) return "#84cc16"; // Verde lima / Greed
    return "#10b981"; // Esmeralda / Extreme Greed
  };

  const activeColor = getZoneColor(score);

  return (
    <div className="h-full border border-white/[0.06] rounded-xl bg-[#080b11]/80 p-3.5 sm:p-4 font-mono text-zinc-100 flex flex-col justify-between select-none">
      {/* 1. Cabecera */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
        <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider font-bold">
          <Gauge className="w-3.5 h-3.5 text-amber-400" />
          <span>Sentimiento de Mercado</span>
        </div>
        <span className="text-[10px] text-zinc-500 font-sans">CNN Fear & Greed</span>
      </div>

      {/* 2. Tacómetro Semicircular con Aguja Analógica Móvil */}
      <div className="relative flex flex-col items-center justify-center my-1">
        <svg className="w-48 h-28" viewBox="0 0 200 115">
          <defs>
            {/* Filtro de resplandor para la punta de la aguja */}
            <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={activeColor} floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Arco de fondo dividido en los 5 tramos de sentimiento */}
          {/* Tramo 1: Extreme Fear (0-25) -> Ángulo 180° a 144° */}
          <path d="M 20 100 A 80 80 0 0 1 35.5 53.0" fill="none" stroke="#f43f5e" strokeWidth="9" strokeOpacity="0.85" />
          {/* Tramo 2: Fear (25-45) -> Ángulo 144° a 108° */}
          <path d="M 37.5 49.5 A 80 80 0 0 1 75.3 23.8" fill="none" stroke="#f97316" strokeWidth="9" strokeOpacity="0.8" />
          {/* Tramo 3: Neutral (45-55) -> Ángulo 108° a 72° */}
          <path d="M 78.5 22.2 A 80 80 0 0 1 121.5 22.2" fill="none" stroke="#71717a" strokeWidth="9" strokeOpacity="0.75" />
          {/* Tramo 4: Greed (55-75) -> Ángulo 72° a 36° */}
          <path d="M 124.7 23.8 A 80 80 0 0 1 162.5 49.5" fill="none" stroke="#84cc16" strokeWidth="9" strokeOpacity="0.8" />
          {/* Tramo 5: Extreme Greed (75-100) -> Ángulo 36° a 0° */}
          <path d="M 164.5 53.0 A 80 80 0 0 1 180 100" fill="none" stroke="#10b981" strokeWidth="9" strokeOpacity="0.85" />

          {/* Marcas de escala mínima y máxima */}
          <text x="14" y="112" fill="#71717a" fontSize="8" fontFamily="monospace">0</text>
          <text x="96" y="14" fill="#71717a" fontSize="8" fontFamily="monospace" textAnchor="middle">50</text>
          <text x="180" y="112" fill="#71717a" fontSize="8" fontFamily="monospace">100</text>

          {/* AGUJA ANALÓGICA CON ROTACIÓN DINÁMICA Y FÍSICA DE REBOTE */}
          <g
            transform={`translate(100, 100) rotate(${currentAngle})`}
            style={{
              transition: "transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Cuerpo estilizado de la aguja */}
            <polygon points="-3,0 0,-76 3,0" fill="#ffffff" filter="url(#needleGlow)" />
            {/* Punta de color reactivo al régimen actual */}
            <circle cx="0" cy="-76" r="3.2" fill={activeColor} />
            {/* Eje central pivotante */}
            <circle cx="0" cy="0" r="7" fill="#18181b" stroke="#71717a" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
          </g>
        </svg>

        {/* Lectura Digital Central */}
        <div className="text-center -mt-3">
          <div className="text-2xl font-bold tracking-tight text-white tabular-nums">
            {score}
          </div>
          <div
            className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5"
            style={{
              color: activeColor,
              backgroundColor: `${activeColor}15`,
              border: `1px solid ${activeColor}30`,
            }}
          >
            {rating}
          </div>
        </div>
      </div>

      {/* 3. Micro-datos históricos oficiales (Cierre previo, 1S, 1M) - Cero texto de relleno */}
      <div className="pt-2 border-t border-white/[0.04] grid grid-cols-3 gap-1 text-[9px] text-center">
        <div className="p-1 rounded bg-white/[0.02]">
          <span className="text-zinc-500 block">Cierre Previo</span>
          <span className="font-bold text-zinc-300 mt-0.5 block">{data?.previousClose ?? 20}</span>
        </div>
        <div className="p-1 rounded bg-white/[0.02]">
          <span className="text-zinc-500 block">Hace 1 Sem.</span>
          <span className="font-bold text-zinc-300 mt-0.5 block">{data?.previous1Week ?? 26}</span>
        </div>
        <div className="p-1 rounded bg-white/[0.02]">
          <span className="text-zinc-500 block">Hace 1 Mes</span>
          <span className="font-bold text-zinc-300 mt-0.5 block">{data?.previous1Month ?? 47}</span>
        </div>
      </div>
    </div>
  );
}
