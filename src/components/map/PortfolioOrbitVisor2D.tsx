"use client";

import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { T212Position } from "@/types/trading212";
import { formatEur, cleanTicker } from "@/lib/utils";
import {
  ShieldCheck,
  Zap,
  Sparkles,
  Target,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Compass,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  Package,
} from "lucide-react";

interface NodeData {
  pos?: T212Position;
  ticker: string;
  name: string;
  val: number;
  weight: number;
  bag: "suelo" | "conviccion" | "tactica" | "unclassified";
  x: number;
  y: number;
  r: number;
  isNearLimit?: boolean;
  isSimulatedReceiver?: boolean;
  simulatedDelta?: number;
  isTacticalReserve?: boolean;
}

interface PortfolioOrbitVisor2DProps {
  positions: T212Position[];
  totalValue: number;
  sueloPositions: T212Position[];
  conviccionPositions: T212Position[];
  tacticaPositions: T212Position[];
  unclassifiedPositions: T212Position[];
  largoPlazoTotal: number;
  tacticaTotal: number;
  sueloTotal: number;
  conviccionTotal: number;
  simulationAmount?: number;
  onReassignAsset: (ticker: string, type: "largo_plazo" | "tactica") => void;
  onSelectAsset?: (pos: T212Position) => void;
}

export default function PortfolioOrbitVisor2D({
  positions = [],
  totalValue = 0,
  sueloPositions = [],
  conviccionPositions = [],
  tacticaPositions = [],
  unclassifiedPositions = [],
  largoPlazoTotal,
  tacticaTotal,
  sueloTotal,
  conviccionTotal,
  simulationAmount = 0,
  onReassignAsset,
  onSelectAsset,
}: PortfolioOrbitVisor2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Estados de navegación 2D (Pan & Zoom)
  const [viewTransform, setViewTransform] = useState<{ x: number; y: number; zoom: number }>({
    x: 0,
    y: 0,
    zoom: 1.0,
  });

  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isClosingModal, setIsClosingModal] = useState<boolean>(false);

  // Arrastre con ratón / cursor
  const isDragging = useRef<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialTransform = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Gestos táctiles móviles (Pan 1 dedo, Pinch 2 dedos)
  const touchState = useRef<{
    mode: "none" | "pan" | "pinch";
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialDistance: number;
    initialZoom: number;
  }>({
    mode: "none",
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    initialDistance: 0,
    initialZoom: 1.0,
  });

  // Centrado de vista
  const handleResetView = useCallback(() => {
    setViewTransform({ x: 0, y: 0, zoom: 1.0 });
    setSelectedNode(null);
    setIsClosingModal(false);
  }, []);

  const handleZoom = (delta: number) => {
    setViewTransform((prev) => ({
      ...prev,
      zoom: Math.max(0.6, Math.min(2.5, Number((prev.zoom + delta).toFixed(2)))),
    }));
  };

  const handleCloseSelected = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setSelectedNode(null);
      setIsClosingModal(false);
    }, 280);
  };

  // CÁLCULO DINÁMICO DEL REPARTO SIMULADO (CERO VALORES HARDCODEADOS)
  const simulatedAllocation = useMemo<Record<string, number>>(() => {
    if (simulationAmount <= 0) return {};

    // 1. Si existe recomendación real guardada del Asistente IA, usar los activos recomendados
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("ai_dca_advisor_fitintrade_cache");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const allocs = parsed?.recommendation?.allocations;
          if (Array.isArray(allocs) && allocs.length > 0) {
            const mapping: Record<string, number> = {};
            allocs.forEach((a: any) => {
              const t = a.type === "POLVORA_SECA" || a.ticker === "CASH" ? "RESERVA_TACTICA" : cleanTicker(a.ticker).toUpperCase();
              mapping[t] = Math.round((a.percentage / 100) * simulationAmount);
            });
            if (!mapping["RESERVA_TACTICA"]) {
              mapping["RESERVA_TACTICA"] = Math.round(simulationAmount * 0.2);
            }
            return mapping;
          }
        } catch {}
      }
    }

    // 2. Si no hay análisis de IA previo, calcular dinámicamente por déficit de peso:
    let targetSueloTicker = "IUSQ";
    if (sueloPositions.length > 0) {
      // Ordenar por menor valor para rebalancear el activo con mayor déficit
      const sortedSuelo = [...sueloPositions].sort((a, b) => {
        const vA = a.currentValue || (a.currentPrice || 0) * (a.quantity || 0);
        const vB = b.currentValue || (b.currentPrice || 0) * (b.quantity || 0);
        return vA - vB;
      });
      targetSueloTicker = cleanTicker(sortedSuelo[0].ticker).toUpperCase();
    }

    let targetConvTicker = "AVGO";
    if (conviccionPositions.length > 0) {
      // Ordenar por menor peso entre convicciones a largo plazo
      const sortedConv = [...conviccionPositions].sort((a, b) => {
        const vA = a.currentValue || (a.currentPrice || 0) * (a.quantity || 0);
        const vB = b.currentValue || (b.currentPrice || 0) * (b.quantity || 0);
        return vA - vB;
      });
      targetConvTicker = cleanTicker(sortedConv[0].ticker).toUpperCase();
    }

    return {
      [targetSueloTicker]: Math.round(simulationAmount * 0.6),
      [targetConvTicker]: Math.round(simulationAmount * 0.2),
      RESERVA_TACTICA: Math.round(simulationAmount * 0.2),
    };
  }, [simulationAmount, sueloPositions, conviccionPositions]);

  // Cálculo de nodos y posiciones espaciales en 2D (Canvas virtual de 850 x 520)
  const nodes = useMemo<NodeData[]>(() => {
    const result: NodeData[] = [];
    const effTotal = totalValue > 0 ? totalValue : 1000;

    const calcRadius = (val: number) => {
      return Math.max(20, Math.min(50, Math.round(15 + Math.sqrt(val) * 1.75)));
    };

    // 1. CLUSTER: EL SUELO (Centro orbital ~ 195, 260)
    const sueloCenter = { x: 195, y: 260 };
    const sueloOffsets = [
      { dx: -35, dy: -35 },
      { dx: 45, dy: 35 },
      { dx: -45, dy: 45 },
      { dx: 40, dy: -40 },
    ];
    sueloPositions.forEach((pos, i) => {
      const clean = cleanTicker(pos.ticker);
      const baseVal = pos.currentValue || (pos.currentPrice || 0) * (pos.quantity || 0);
      const simDelta = (simulatedAllocation as any)[clean] || 0;
      const val = baseVal + simDelta;
      const weight = Number(((val / effTotal) * 100).toFixed(1));
      const off = sueloOffsets[i % sueloOffsets.length];

      result.push({
        pos,
        ticker: clean,
        name: pos.name || clean,
        val: baseVal,
        weight,
        bag: "suelo",
        x: sueloCenter.x + off.dx,
        y: sueloCenter.y + off.dy,
        r: calcRadius(val),
        isSimulatedReceiver: simDelta > 0,
        simulatedDelta: simDelta,
      });
    });

    // 2. CLUSTER: CONVICCIONES A LARGO PLAZO (Centro orbital ~ 375, 260)
    // Offset de NFLX bajado a dy=-38 para garantizar separación total con el título superior
    const convCenter = { x: 375, y: 260 };
    const convOffsets = [
      { dx: 0, dy: -38 }, // NFLX centrado abajo
      { dx: 28, dy: 28 }, // NVDA
      { dx: -35, dy: 45 }, // AVGO
      { dx: 45, dy: -35 },
    ];
    conviccionPositions.forEach((pos, i) => {
      const clean = cleanTicker(pos.ticker);
      const baseVal = pos.currentValue || (pos.currentPrice || 0) * (pos.quantity || 0);
      const simDelta = (simulatedAllocation as any)[clean] || 0;
      const val = baseVal + simDelta;
      const weight = Number(((val / effTotal) * 100).toFixed(1));
      const off = convOffsets[i % convOffsets.length];

      result.push({
        pos,
        ticker: clean,
        name: pos.name || clean,
        val: baseVal,
        weight,
        bag: "conviccion",
        x: convCenter.x + off.dx,
        y: convCenter.y + off.dy,
        r: calcRadius(val),
        isNearLimit: weight >= 8.0,
        isSimulatedReceiver: simDelta > 0,
        simulatedDelta: simDelta,
      });
    });

    // 3. CLUSTER: BOLSA TÁCTICA / SWING (Centro orbital ~ 650, 260)
    const tacCenter = { x: 650, y: 260 };
    const tacOffsets = [
      { dx: -38, dy: -38 },
      { dx: 38, dy: -35 },
      { dx: -35, dy: 45 },
      { dx: 42, dy: 40 },
    ];
    tacticaPositions.forEach((pos, i) => {
      const clean = cleanTicker(pos.ticker);
      const baseVal = pos.currentValue || (pos.currentPrice || 0) * (pos.quantity || 0);
      const weight = Number(((baseVal / effTotal) * 100).toFixed(1));
      const off = tacOffsets[i % tacOffsets.length];

      result.push({
        pos,
        ticker: clean,
        name: pos.name || clean,
        val: baseVal,
        weight,
        bag: "tactica",
        x: tacCenter.x + off.dx,
        y: tacCenter.y + off.dy,
        r: calcRadius(baseVal),
      });
    });

    // 4. BURBUJA ESPECIAL EN PLATA: RESERVA TÁCTICA (Pólvora Seca / Liquidez para Swing)
    const simTacCash = (simulatedAllocation as any)["RESERVA_TACTICA"] || 0;
    if (simTacCash > 0) {
      result.push({
        ticker: "CASH",
        name: "Pólvora Seca (Liquidez Táctica)",
        val: simTacCash,
        weight: Number(((simTacCash / effTotal) * 100).toFixed(1)),
        bag: "tactica",
        x: tacCenter.x,
        y: tacCenter.y - 70,
        r: Math.max(26, Math.round(16 + Math.sqrt(simTacCash) * 2.2)),
        isSimulatedReceiver: true,
        simulatedDelta: simTacCash,
        isTacticalReserve: true,
      });
    }

    // 5. CLUSTER: ÓRBITA DE ENTRADA / NUEVAS POR CLASIFICAR
    const unclassCenter = { x: 460, y: 75 };
    unclassifiedPositions.forEach((pos, i) => {
      const clean = cleanTicker(pos.ticker);
      const val = pos.currentValue || (pos.currentPrice || 0) * (pos.quantity || 0);
      const weight = Number(((val / effTotal) * 100).toFixed(1));
      result.push({
        pos,
        ticker: clean,
        name: pos.name || clean,
        val,
        weight,
        bag: "unclassified",
        x: unclassCenter.x + i * 65,
        y: unclassCenter.y,
        r: calcRadius(val),
      });
    });

    return result;
  }, [
    positions,
    sueloPositions,
    conviccionPositions,
    tacticaPositions,
    unclassifiedPositions,
    totalValue,
    simulatedAllocation,
  ]);

  // Manejo de Pan 2D con ratón
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialTransform.current = { x: viewTransform.x, y: viewTransform.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || !isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setViewTransform((prev) => ({
      ...prev,
      x: initialTransform.current.x + dx,
      y: initialTransform.current.y + dy,
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    isDragging.current = false;
  };

  // Manejo de Gestos Táctiles Móviles (Pan 1 dedo, Pinch 2 dedos)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchState.current = {
        mode: "pan",
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialX: viewTransform.x,
        initialY: viewTransform.y,
        initialDistance: 0,
        initialZoom: viewTransform.zoom,
      };
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchState.current = {
        mode: "pinch",
        startX: 0,
        startY: 0,
        initialX: viewTransform.x,
        initialY: viewTransform.y,
        initialDistance: Math.max(10, dist),
        initialZoom: viewTransform.zoom,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchState.current.mode === "pan" && e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchState.current.startX;
      const dy = e.touches[0].clientY - touchState.current.startY;
      setViewTransform((prev) => ({
        ...prev,
        x: touchState.current.initialX + dx,
        y: touchState.current.initialY + dy,
      }));
    } else if (touchState.current.mode === "pinch" && e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / touchState.current.initialDistance;
      const newZoom = Math.max(0.6, Math.min(2.5, touchState.current.initialZoom * ratio));
      setViewTransform((prev) => ({
        ...prev,
        zoom: Number(newZoom.toFixed(2)),
      }));
    }
  };

  const handleTouchEnd = () => {
    touchState.current.mode = "none";
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    handleZoom(zoomDelta);
  };

  // Porcentajes de las bolsas con simulación incluida
  const simTacCash = (simulatedAllocation as any)["RESERVA_TACTICA"] || 0;
  const effTacticaTotal = tacticaTotal + simTacCash;
  const lpPct = totalValue > 0 ? ((largoPlazoTotal / totalValue) * 100).toFixed(1) : "80.0";
  const tacPct = totalValue > 0 ? ((effTacticaTotal / totalValue) * 100).toFixed(1) : "20.0";

  return (
    <div
      ref={containerRef}
      style={{ touchAction: "none" }}
      className="w-full h-[480px] sm:h-[550px] relative select-none rounded-2xl overflow-hidden bg-[#070a10] border border-white/[0.08] font-mono"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 1. LEYENDA DISCRETA SUPERIOR IZQUIERDA */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none flex items-center gap-2 flex-wrap">
        <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/[0.08] text-[10px] text-zinc-400 flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 text-sky-400">
            <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
            <span>Suelo ({sueloPositions.length})</span>
          </span>
          <span className="flex items-center gap-1.5 text-indigo-400">
            <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
            <span>Convicciones ({conviccionPositions.length})</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <span>Táctica ({tacticaPositions.length})</span>
          </span>
        </div>
      </div>

      {/* 2. CONTROLES 2D EN LA ESQUINA INFERIOR DERECHA (ULTRA-DISCRETOS Y TRASLÚCIDOS) */}
      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1 p-0.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/[0.08] text-[8px] opacity-40 hover:opacity-100 transition-opacity shadow-lg">
        <button
          onClick={() => handleZoom(0.15)}
          className="w-5 h-5 rounded bg-white/[0.05] hover:bg-white/[0.15] text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
          title="Zoom +"
        >
          <ZoomIn className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={() => handleZoom(-0.15)}
          className="w-5 h-5 rounded bg-white/[0.05] hover:bg-white/[0.15] text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
          title="Zoom -"
        >
          <ZoomOut className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={handleResetView}
          className="w-5 h-5 rounded bg-white/[0.05] hover:bg-white/[0.15] text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
          title="Centrar"
        >
          <RotateCcw className="w-2.5 h-2.5" />
        </button>
        <span className="text-[8px] text-zinc-400 px-0.5 font-bold">
          {Math.round(viewTransform.zoom * 100)}%
        </span>
      </div>

      {/* 3. LIENZO SVG 2D CON MALLA DE PUNTITOS VISIBLES CON PROFUNDIDAD */}
      <svg
        className="w-full h-full cursor-grab active:cursor-grabbing"
        viewBox="0 0 850 520"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Malla de puntos espaciales visible: radio 1.2px, espaciado 28px, opacidad 11% */}
          <pattern id="grid-dots-visible" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="#ffffff" fillOpacity="0.11" />
          </pattern>

          {/* Degradados orbitales de fondo */}
          <radialGradient id="glow-largo-plazo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.08" />
            <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
          </radialGradient>

          <radialGradient id="glow-tactica" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.10" />
            <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
          </radialGradient>

          <radialGradient id="glow-unclassified" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.15" />
            <stop offset="80%" stopColor="#a855f7" stopOpacity="0.0" />
          </radialGradient>
        </defs>

        {/* Fondo oscuro base */}
        <rect width="100%" height="100%" fill="#070a10" />

        {/* GRUPO CON TRANSFORMACIÓN PAN & ZOOM (MALLA DE PUNTOS SE MUEVE EN PROFUNDIDAD) */}
        <g
          transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.zoom})`}
          style={{ transformOrigin: "425px 260px", transition: isDragging.current ? "none" : "transform 0.05s ease-out" }}
        >
          {/* Malla de puntitos navegable con textura */}
          <rect x="-400" y="-300" width="1650" height="1120" fill="url(#grid-dots-visible)" />

          {/* ============================================================== */}
          {/* TERRITORIO 1: BOLSA DE LARGO PLAZO (~80% DEL PATRIMONIO)       */}
          {/* ============================================================== */}
          <g>
            <circle cx="285" cy="260" r="215" fill="url(#glow-largo-plazo)" />
            <circle
              cx="285"
              cy="260"
              r="215"
              fill="none"
              stroke="#38bdf8"
              strokeOpacity="0.25"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />

            {/* Rótulo de la Bolsa 1 */}
            <g transform="translate(130, 60)">
              <rect x="0" y="0" width="310" height="24" rx="6" fill="#0c1322" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
              <text x="12" y="16" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                BOLSA 1: LARGO PLAZO ({lpPct}%) · {formatEur(largoPlazoTotal)}
              </text>
            </g>

            {/* Sub-órbita A: EL SUELO con dinero total visible y despejado arriba */}
            <circle cx="195" cy="260" r="115" fill="none" stroke="#34d399" strokeOpacity="0.2" strokeWidth="1" />
            <g transform="translate(110, 126)">
              <rect x="0" y="0" width="170" height="18" rx="4" fill="#09181a" stroke="rgba(52,211,153,0.3)" strokeWidth="0.8" />
              <text x="10" y="12.5" fill="#34d399" fontSize="8" fontWeight="bold">
                EL SUELO · {formatEur(sueloTotal)}
              </text>
            </g>

            {/* Sub-órbita B: CONVICCIONES con dinero total visible y despejado arriba (SIN TAPAR A NFLX) */}
            <circle cx="375" cy="260" r="95" fill="none" stroke="#818cf8" strokeOpacity="0.2" strokeWidth="1" />
            <g transform="translate(290, 130)">
              <rect x="0" y="0" width="170" height="18" rx="4" fill="#111224" stroke="rgba(129,140,248,0.3)" strokeWidth="0.8" />
              <text x="10" y="12.5" fill="#818cf8" fontSize="8" fontWeight="bold">
                CONVICCIÓN · {formatEur(conviccionTotal)}
              </text>
            </g>
          </g>

          {/* ============================================================== */}
          {/* TERRITORIO 2: BOLSA TÁCTICA / SWING (~20% DEL PATRIMONIO)      */}
          {/* ============================================================== */}
          <g>
            <circle cx="650" cy="260" r="140" fill="url(#glow-tactica)" />
            <circle
              cx="650"
              cy="260"
              r="140"
              fill="none"
              stroke="#fbbf24"
              strokeOpacity="0.3"
              strokeWidth="1.2"
              strokeDasharray="5 5"
            />

            {/* Rótulo de la Bolsa 2 con anchura ampliada a 265px para no cortar el símbolo de € */}
            <g transform="translate(520, 90)">
              <rect x="0" y="0" width="265" height="24" rx="6" fill="#181308" stroke="rgba(251,191,36,0.35)" strokeWidth="1" />
              <text x="10" y="16" fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="monospace">
                BOLSA 2: TÁCTICA ({tacPct}%) · {formatEur(effTacticaTotal)}
              </text>
            </g>
          </g>

          {/* ============================================================== */}
          {/* TERRITORIO 3: ÓRBITA DE ENTRADA (PENDIENTES DE ASIGNAR)         */}
          {/* ============================================================== */}
          {unclassifiedPositions.length > 0 && (
            <g>
              <ellipse cx="460" cy="75" rx="110" ry="45" fill="url(#glow-unclassified)" />
              <ellipse
                cx="460"
                cy="75"
                rx="110"
                ry="45"
                fill="none"
                stroke="#c084fc"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                className="animate-pulse"
              />
              <text x="385" y="45" fill="#c084fc" fontSize="9" fontWeight="bold">
                NUEVAS PENDIENTES DE ASIGNAR
              </text>
            </g>
          )}

          {/* ============================================================== */}
          {/* RENDERIZADO DE BURBUJAS (CON DINERO VISIBLE EN TODAS)           */}
          {/* ============================================================== */}
          {nodes.map((node) => {
            const hasSim = simulationAmount > 0;
            const isDimmed = hasSim && !node.isSimulatedReceiver;

            let fillColor = "#0e1a2d";
            let strokeColor = "#38bdf8";
            let glowFilter = "drop-shadow(0 0 6px rgba(56, 189, 248, 0.4))";

            if (node.isTacticalReserve) {
              fillColor = "#18181b"; // Carbón metálico oscuro
              strokeColor = "#f4f4f5"; // Plata brillante
              glowFilter = "drop-shadow(0 0 10px rgba(244, 244, 245, 0.75))";
            } else if (node.bag === "suelo") {
              fillColor = "#081b1d";
              strokeColor = "#34d399";
              glowFilter = "drop-shadow(0 0 7px rgba(52, 211, 153, 0.45))";
            } else if (node.bag === "conviccion") {
              fillColor = "#14142d";
              strokeColor = node.isNearLimit ? "#f59e0b" : "#818cf8";
              glowFilter = node.isNearLimit
                ? "drop-shadow(0 0 8px rgba(245, 158, 11, 0.6))"
                : "drop-shadow(0 0 6px rgba(129, 140, 248, 0.4))";
            } else if (node.bag === "tactica") {
              fillColor = "#1f180a";
              strokeColor = "#fbbf24";
              glowFilter = "drop-shadow(0 0 7px rgba(251, 191, 36, 0.45))";
            } else if (node.bag === "unclassified") {
              fillColor = "#1c0d2b";
              strokeColor = "#c084fc";
              glowFilter = "drop-shadow(0 0 8px rgba(192, 132, 252, 0.6))";
            }

            return (
              <g
                key={`node-${node.ticker}`}
                data-testid={`node-${node.ticker}`}
                transform={`translate(${node.x}, ${node.y})`}
                className={`cursor-pointer transition-all duration-500 hover:scale-105 asset-orbit-bubble ${
                  isDimmed ? "opacity-55" : "opacity-100"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNode(node);
                  setIsClosingModal(false);
                }}
              >
                {/* Insignia flotante con la inyección simulada (+XX €) */}
                {node.isSimulatedReceiver && node.simulatedDelta && (
                  <g transform={`translate(0, -${node.r + 14})`}>
                    <rect
                      x="-22"
                      y="-8"
                      width="44"
                      height="16"
                      rx="4"
                      fill="#062e24"
                      stroke="#34d399"
                      strokeWidth="1"
                    />
                    <text
                      textAnchor="middle"
                      dy="3.5"
                      fill="#34d399"
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      +{Math.round(node.simulatedDelta)} €
                    </text>
                  </g>
                )}

                {/* Halo de aviso si supera 8-10% */}
                {node.isNearLimit && !node.isTacticalReserve && (
                  <circle
                    r={node.r + 5}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    className="animate-spin"
                    style={{ transformOrigin: "0 0", animationDuration: "10s" }}
                  />
                )}

                {/* Esfera del activo */}
                <circle
                  r={node.r}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={node.isSimulatedReceiver ? 2.5 : 1.8}
                  strokeDasharray={node.isTacticalReserve ? "4 3" : undefined}
                  style={{ filter: glowFilter }}
                />

                {/* Línea 1: Ticker */}
                <text
                  textAnchor="middle"
                  dy={node.isTacticalReserve ? "-6" : "-5"}
                  fill="#ffffff"
                  fontSize={node.r > 32 ? "11" : node.r > 24 ? "9" : "8"}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {node.isTacticalReserve ? "CASH" : node.ticker}
                </text>

                {/* Línea 2: Porcentaje de peso o subtítulo */}
                <text
                  textAnchor="middle"
                  dy={node.isTacticalReserve ? "4" : "5"}
                  fill={strokeColor}
                  fontSize={node.r > 32 ? "9" : node.r > 24 ? "8" : "7"}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {node.isTacticalReserve ? "Pólvora" : `${node.weight}%`}
                </text>

                {/* Línea 3: Importe en euros (VISIBLE EN TODAS LAS BURBUJAS) */}
                <text
                  textAnchor="middle"
                  dy={node.isTacticalReserve ? "14" : "15"}
                  fill={node.isTacticalReserve ? "#f4f4f5" : node.isSimulatedReceiver ? "#34d399" : "#a1a1aa"}
                  fontSize={node.r > 32 ? "8" : node.r > 24 ? "7.5" : "6.5"}
                  fontWeight={node.isSimulatedReceiver || node.isTacticalReserve ? "bold" : "normal"}
                  fontFamily="monospace"
                >
                  {node.isTacticalReserve ? `+${Math.round(node.val)} €` : `${Math.round(node.val + (node.simulatedDelta || 0))} €`}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* 4. MODO ENFOQUE CON DESENFOQUE GAUSSIANO AL CLICAR EN UNA BURBUJA */}
      {selectedNode && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-3 sm:p-4">
          {/* Telón de fondo con desenfoque gaussiano puro y velo ligero (sin pantalla negra pesada) */}
          <div
            className={`absolute inset-0 backdrop-blur-md bg-black/25 transition-all duration-300 pointer-events-auto ${
              isClosingModal ? "opacity-0 backdrop-blur-none" : "opacity-100"
            }`}
            onClick={handleCloseSelected}
          />

          {/* Contenedor focal: Burbuja arriba y Tarjeta abajo con animación suave de entrada y salida */}
          <div
            className={`relative z-50 flex flex-col items-center max-w-sm w-full pointer-events-none transition-all duration-300 ease-out ${
              isClosingModal ? "opacity-0 scale-95 translate-y-4" : "opacity-100 scale-100 translate-y-0"
            }`}
          >
            {/* A. La burbuja destacada centrada ARRIBA de la carta */}
            <div
              className="mb-3 flex flex-col items-center pointer-events-auto transition-transform duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: `${selectedNode.r * 2.3}px`,
                  height: `${selectedNode.r * 2.3}px`,
                  minWidth: "76px",
                  minHeight: "76px",
                }}
                className={`rounded-full flex flex-col items-center justify-center font-mono text-center p-1 border-2 transition-all duration-300 ${
                  selectedNode.isTacticalReserve
                    ? "bg-[#18181b] border-zinc-100 shadow-[0_0_28px_rgba(244,244,245,0.6)]"
                    : selectedNode.bag === "suelo"
                    ? "bg-[#081b1d] border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.5)]"
                    : selectedNode.bag === "tactica"
                    ? "bg-[#1f180a] border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.5)]"
                    : "bg-[#14142d] border-indigo-400 shadow-[0_0_24px_rgba(129,140,248,0.5)]"
                }`}
              >
                <span className="text-sm font-bold text-white">
                  {selectedNode.isTacticalReserve ? "CASH" : selectedNode.ticker}
                </span>
                <span className="text-[10px] font-bold" style={{ color: selectedNode.isTacticalReserve ? "#f4f4f5" : "#38bdf8" }}>
                  {selectedNode.isTacticalReserve ? "Pólvora Seca" : `${selectedNode.weight}%`}
                </span>
                <span className="text-[9px] text-zinc-300">
                  {selectedNode.isTacticalReserve ? `+${Math.round(selectedNode.val)} €` : `${Math.round(selectedNode.val)} €`}
                </span>
              </div>
            </div>

            {/* B. La tarjeta de especificaciones centrada DEBAJO de la burbuja */}
            <div
              className="w-full bg-[#0e1320]/95 border border-white/[0.15] rounded-2xl p-4 sm:p-5 shadow-2xl font-mono text-xs text-zinc-100 space-y-3 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div>
                  <span className="text-base font-bold text-white">
                    {selectedNode.isTacticalReserve ? "Reserva Táctica (CASH)" : selectedNode.ticker}
                  </span>
                  <span className="text-zinc-400 text-xs ml-1.5 font-sans">
                    ({selectedNode.name})
                  </span>
                </div>
                <button
                  onClick={handleCloseSelected}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {selectedNode.isTacticalReserve ? (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[11px] text-zinc-300 font-sans leading-relaxed">
                    <span className="font-bold text-white font-mono block mb-1">Pólvora Seca Acumulada</span>
                    Capital líquido del 20% reservado para operaciones swing de semanas o 1 mes. Abel aconseja acumular pólvora y no forzar compras hasta que surja un catalizador o setup claro con ratio riesgo/beneficio favorable.
                  </div>
                  <div className="p-2 rounded bg-zinc-800/40 border border-zinc-700/50 flex items-center justify-between text-xs font-bold text-zinc-200">
                    <span>Liquidez Disponible:</span>
                    <span className="text-emerald-400 font-mono">+{formatEur(selectedNode.val)}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2 rounded bg-white/[0.02] border border-white/[0.05]">
                      <span className="text-zinc-500 block">Capital Invertido</span>
                      <span className="font-bold text-zinc-100 text-xs mt-0.5 block">{formatEur(selectedNode.val)}</span>
                    </div>

                    <div className="p-2 rounded bg-white/[0.02] border border-white/[0.05]">
                      <span className="text-zinc-500 block">Peso en Cartera</span>
                      <span className={`font-bold text-xs mt-0.5 inline-flex items-center gap-1 ${selectedNode.isNearLimit ? "text-amber-400" : "text-sky-300"}`}>
                        <span>{selectedNode.weight}%</span>
                        {selectedNode.isNearLimit && (
                          <span className="inline-flex items-center gap-0.5 text-amber-400 text-[10px] font-normal">
                            <AlertCircle className="w-3 h-3" /> Tope 10%
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Selector de Reasignación Rápida */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold block">
                      Reasignar Bolsa (Abel Castro):
                    </span>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          onReassignAsset(selectedNode.ticker, "largo_plazo");
                          setSelectedNode((prev) => (prev ? { ...prev, bag: "conviccion" } : null));
                        }}
                        className={`p-2 rounded-lg border text-[10px] font-bold text-left transition-colors flex items-center gap-1.5 ${
                          selectedNode.bag === "suelo" || selectedNode.bag === "conviccion"
                            ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                            : "bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                        <span>Largo Plazo</span>
                      </button>

                      <button
                        onClick={() => {
                          onReassignAsset(selectedNode.ticker, "tactica");
                          setSelectedNode((prev) => (prev ? { ...prev, bag: "tactica" } : null));
                        }}
                        className={`p-2 rounded-lg border text-[10px] font-bold text-left transition-colors flex items-center gap-1.5 ${
                          selectedNode.bag === "tactica"
                            ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                            : "bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white"
                        }`}
                      >
                        <Zap className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        <span>Táctica</span>
                      </button>
                    </div>
                  </div>

                  {/* Botón de ver ficha técnica completa */}
                  {selectedNode.pos && onSelectAsset && (
                    <div className="pt-2 border-t border-white/[0.06] flex justify-between items-center text-[11px]">
                      <span className="text-zinc-500 font-sans">¿Ver gráfico y velas?</span>
                      <button
                        onClick={() => {
                          onSelectAsset(selectedNode.pos!);
                          setSelectedNode(null);
                        }}
                        className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
                      >
                        <span>Abrir Ficha Técnica</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
