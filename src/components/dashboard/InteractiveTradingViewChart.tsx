"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";

export interface CandleData {
  timestamp: number;
  date: string;
  fullDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface InteractiveTradingViewChartProps {
  candles: CandleData[];
  currentPrice: number;
  chartMode: "candles" | "line";
  timeframe?: string;
  currency?: string;
  technicalLevels?: {
    support?: number | null;
    resistance?: number | null;
    source?: string;
  } | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function InteractiveTradingViewChart({
  candles,
  currentPrice,
  chartMode,
  timeframe = "1M",
  currency = "EUR",
  technicalLevels,
  isExpanded = false,
  onToggleExpand,
}: InteractiveTradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Estados de navegación tipo TradingView
  const [panOffset, setPanOffset] = useState<number>(0);
  const [verticalScale, setVerticalScale] = useState<number>(1.0);
  const [customVisibleCount, setCustomVisibleCount] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number; price: number } | null>(null);

  // Estados de arrastre con ratón / cursor
  const isDraggingChart = useRef<boolean>(false);
  const dragStartX = useRef<number>(0);
  const initialPanOffset = useRef<number>(0);

  const isDraggingScale = useRef<boolean>(false);
  const dragStartY = useRef<number>(0);
  const initialScale = useRef<number>(1.0);

  // Estados de gestos táctiles móviles (Pan con 1 dedo y Pinch-to-zoom con 2 dedos)
  const touchState = useRef<{
    mode: "none" | "pan" | "pinch";
    startX: number;
    initialPan: number;
    initialDistance: number;
    initialCount: number;
  }>({
    mode: "none",
    startX: 0,
    initialPan: 0,
    initialDistance: 0,
    initialCount: 0,
  });

  // Dimensiones dinámicas del contenedor
  const [dimensions, setDimensions] = useState({ width: 440, height: isExpanded ? 500 : 220 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [isExpanded]);

  // Al cambiar de temporalidad, resetear pan, zoom y escala para encajar el rango completo
  useEffect(() => {
    setPanOffset(0);
    setVerticalScale(1.0);
    setCustomVisibleCount(null);
    setHoverIndex(null);
    setCrosshairPos(null);
  }, [timeframe]);

  // Formateador de moneda dinámico (USD vs EUR)
  const formatPrice = (val: number | null | undefined, decimals = 2) => {
    if (val === null || val === undefined || isNaN(val)) return "N/D";
    const num = val.toFixed(decimals);
    return currency === "USD" ? `$${num}` : currency === "EUR" ? `${num} €` : `${num} ${currency}`;
  };

  const formatPriceCompact = (val: number) => {
    const num = Math.round(val);
    return currency === "USD" ? `$${num}` : currency === "EUR" ? `${num} €` : `${num} ${currency}`;
  };

  const isLandscape = dimensions.width > dimensions.height;

  // Cuántas velas mostrar a la vez (modificable con zoom táctil / rueda)
  const effectiveVisibleCount = useMemo(() => {
    if (customVisibleCount !== null) {
      return Math.max(10, Math.min(candles.length || 10, customVisibleCount));
    }
    const tf = timeframe.toUpperCase();
    if (tf === "1A" || tf === "1Y" || tf === "TODO" || tf === "ALL") {
      return candles.length || 100;
    }
    if (dimensions.width > 768) return 60;
    if (dimensions.width > 480) return 40;
    return Math.max(22, Math.min(candles.length, 35));
  }, [customVisibleCount, dimensions.width, timeframe, candles.length]);

  // Filtrado de velas visibles con panOffset
  const { visibleCandles } = useMemo(() => {
    if (!candles || candles.length === 0) return { visibleCandles: [] };
    const total = candles.length;
    const count = Math.min(total, effectiveVisibleCount);

    const maxOffset = Math.max(0, total - count);
    const clampedOffset = Math.max(0, Math.min(maxOffset, panOffset));

    const end = total - clampedOffset;
    const start = Math.max(0, end - count);

    return {
      visibleCandles: candles.slice(start, end),
    };
  }, [candles, effectiveVisibleCount, panOffset]);

  // Cálculo de rango de precios con escala vertical TradingView y ajuste en apaisado
  const { minPrice, maxPrice, priceRange, getY, getPriceFromY } = useMemo(() => {
    if (visibleCandles.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 100,
        priceRange: 100,
        getY: () => 0,
        getPriceFromY: () => 0,
      };
    }

    const baseMin = Math.min(...visibleCandles.map((c) => c.low));
    const baseMax = Math.max(...visibleCandles.map((c) => c.high));
    const mid = (baseMax + baseMin) / 2;
    const baseHalfSpan = Math.max((baseMax - baseMin) / 2, 0.5);

    // verticalScale: > 1 estira las velas, < 1 las comprime
    const scaledHalfSpan = baseHalfSpan / Math.max(0.2, verticalScale);
    const effMin = mid - scaledHalfSpan;
    const effMax = mid + scaledHalfSpan;
    const range = effMax - effMin;

    // Márgenes optimizados para evitar cortes en móvil apaisado (landscape)
    const plotTop = isLandscape ? 8 : 14;
    const plotBottom = dimensions.height - (isLandscape ? 16 : 22);
    const plotHeight = Math.max(10, plotBottom - plotTop);

    const getYCoord = (price: number) => {
      if (range <= 0) return plotTop + plotHeight / 2;
      const frac = (price - effMin) / range;
      return plotBottom - frac * plotHeight;
    };

    const getPrice = (y: number) => {
      const frac = (plotBottom - y) / plotHeight;
      return effMin + frac * range;
    };

    return {
      minPrice: effMin,
      maxPrice: effMax,
      priceRange: range,
      getY: getYCoord,
      getPriceFromY: getPrice,
    };
  }, [visibleCandles, verticalScale, dimensions.height, isLandscape]);

  // Niveles de precio para la cuadrícula y el eje
  const priceGridLevels = useMemo(() => {
    if (priceRange <= 0) return [];
    const count = isLandscape ? 4 : 5;
    const step = priceRange / (count - 1);
    const levels: number[] = [];
    for (let i = 0; i < count; i++) {
      levels.push(minPrice + i * step);
    }
    return levels;
  }, [minPrice, priceRange, isLandscape]);

  // 1. MANEJO DE RATÓN / CURSOR EN ESCRITORIO
  const handleChartPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return; // En móviles usamos touch handlers nativos
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingChart.current = true;
    dragStartX.current = e.clientX;
    initialPanOffset.current = panOffset;
  };

  const handleChartPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const chartWidth = dimensions.width - 55;
    const mouseX = Math.max(10, Math.min(chartWidth - 5, e.clientX - rect.left));
    const mouseY = Math.max(10, Math.min(dimensions.height - 20, e.clientY - rect.top));

    if (visibleCandles.length > 0) {
      const candleStep = (chartWidth - 20) / Math.max(1, visibleCandles.length - 1);
      const idx = Math.min(
        visibleCandles.length - 1,
        Math.max(0, Math.round((mouseX - 10) / candleStep))
      );
      setHoverIndex(idx);
      setCrosshairPos({
        x: 10 + idx * candleStep,
        y: mouseY,
        price: getPriceFromY(mouseY),
      });
    }

    if (!isDraggingChart.current) return;

    const deltaX = e.clientX - dragStartX.current;
    const candleWidth = chartWidth / Math.max(1, visibleCandles.length);
    const candlesMoved = Math.round(deltaX / Math.max(3, candleWidth));

    if (candlesMoved !== 0) {
      setPanOffset(initialPanOffset.current + candlesMoved);
    }
  };

  const handleChartPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    isDraggingChart.current = false;
  };

  // 2. MANEJO TÁCTIL MÓVIL NATIVO (1 Dedo = Pan, 2 Dedos = Pinch-to-zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // 1 Dedo: Pan horizontal
      touchState.current = {
        mode: "pan",
        startX: e.touches[0].clientX,
        initialPan: panOffset,
        initialDistance: 0,
        initialCount: effectiveVisibleCount,
      };
    } else if (e.touches.length === 2) {
      // 2 Dedos: Pinch to zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchState.current = {
        mode: "pinch",
        startX: 0,
        initialPan: panOffset,
        initialDistance: Math.max(10, dist),
        initialCount: effectiveVisibleCount,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchState.current.mode === "pan" && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - touchState.current.startX;
      const chartWidth = dimensions.width - 55;
      const candleWidth = chartWidth / Math.max(1, visibleCandles.length);
      const candlesMoved = Math.round(deltaX / Math.max(3, candleWidth));

      if (candlesMoved !== 0) {
        setPanOffset(touchState.current.initialPan + candlesMoved);
      }
    } else if (touchState.current.mode === "pinch" && e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / touchState.current.initialDistance;

      // ratio > 1: zoom in (menos velas, más detalle); ratio < 1: zoom out (más velas)
      const newCount = Math.round(touchState.current.initialCount / ratio);
      setCustomVisibleCount(Math.max(10, Math.min(candles.length, newCount)));
    }
  };

  const handleTouchEnd = () => {
    touchState.current.mode = "none";
  };

  // Zoom con rueda del ratón en escritorio
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
    const newCount = Math.round(effectiveVisibleCount * zoomFactor);
    setCustomVisibleCount(Math.max(10, Math.min(candles.length, newCount)));
  };

  // 3. ARRASTRE VERTICAL EN EL EJE DE PRECIOS (TradingView Vertical Scaling)
  const handleScalePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingScale.current = true;
    dragStartY.current = e.clientY;
    initialScale.current = verticalScale;
  };

  const handleScalePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingScale.current) return;
    e.stopPropagation();
    const deltaY = e.clientY - dragStartY.current;

    const factor = 1 + (deltaY / 120);
    const newScale = Math.max(0.2, Math.min(5.0, initialScale.current * factor));
    setVerticalScale(newScale);
  };

  const handleScalePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    isDraggingScale.current = false;
  };

  const handleScaleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVerticalScale(1.0);
    setPanOffset(0);
    setCustomVisibleCount(null);
  };

  const activeCandle = hoverIndex !== null && visibleCandles[hoverIndex]
    ? visibleCandles[hoverIndex]
    : visibleCandles[visibleCandles.length - 1];

  const chartPlotWidth = dimensions.width - 55;
  const candleStep = chartPlotWidth / Math.max(1, visibleCandles.length);
  const candleBarWidth = Math.max(1.0, Math.min(12, candleStep * 0.7));

  // Ticks de fecha uniformes en el eje X con años y meses organizados (sin colisiones en TODO)
  const xDateTicks = useMemo(() => {
    if (visibleCandles.length === 0) return [];
    const count = isLandscape ? 6 : Math.min(5, visibleCandles.length);
    const step = (visibleCandles.length - 1) / (count - 1 || 1);
    const ticks = [];
    const isMultiYear = timeframe.toUpperCase() === "TODO" || timeframe.toUpperCase() === "ALL";

    for (let i = 0; i < count; i++) {
      const idx = Math.min(visibleCandles.length - 1, Math.round(i * step));
      const c = visibleCandles[idx];
      let yearLabel = "";
      let monthLabel = "";
      let defaultLabel = c.date;

      if (isMultiYear) {
        const d = new Date(c.timestamp);
        yearLabel = String(d.getFullYear());
        monthLabel = d.toLocaleString("es-ES", { month: "short" });
      }

      ticks.push({
        label: defaultLabel,
        year: yearLabel,
        month: monthLabel,
        isMultiYear,
        x: 10 + idx * ((chartPlotWidth - 20) / Math.max(1, visibleCandles.length - 1)),
      });
    }
    return ticks;
  }, [visibleCandles, chartPlotWidth, timeframe, isLandscape]);

  return (
    <div
      ref={containerRef}
      style={{ touchAction: "none" }}
      className={`w-full relative select-none rounded-xl overflow-hidden bg-[#070a10] border border-white/[0.06] ${
        isExpanded ? "h-full flex-1 min-h-0" : "h-[220px] sm:h-[260px]"
      }`}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onPointerLeave={() => {
        setHoverIndex(null);
        setCrosshairPos(null);
      }}
    >
      {/* 1. HUD Superior interactivo con OHLC: VISIBLE ÚNICAMENTE EN MODO EXPANDIDO para no tapar velas compactas */}
      {isExpanded && activeCandle && (
        <div className="absolute top-1.5 left-2 z-20 flex items-center justify-between right-[60px] pointer-events-none text-[9px] sm:text-[10px] font-mono text-zinc-400">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-white/[0.08]">
            <span className="text-zinc-300 font-bold">{activeCandle.date}</span>
            <span>O: <strong className="text-zinc-200">{formatPrice(activeCandle.open)}</strong></span>
            <span>H: <strong className="text-emerald-400">{formatPrice(activeCandle.high)}</strong></span>
            <span>L: <strong className="text-rose-400">{formatPrice(activeCandle.low)}</strong></span>
            <span>C: <strong className={activeCandle.close >= activeCandle.open ? "text-emerald-400" : "text-rose-400"}>{formatPrice(activeCandle.close)}</strong></span>
          </div>

          {(verticalScale !== 1.0 || customVisibleCount !== null || panOffset !== 0) && (
            <button
              onClick={() => {
                setVerticalScale(1.0);
                setPanOffset(0);
                setCustomVisibleCount(null);
              }}
              className="pointer-events-auto px-1.5 py-0.5 rounded bg-white/[0.08] hover:bg-white/[0.14] text-zinc-300 text-[8px] sm:text-[9px] border border-white/[0.1]"
              title="Restablecer zoom y escala"
            >
              ↺ Reset
            </button>
          )}
        </div>
      )}

      {/* 2. Lienzo SVG Principal */}
      <svg
        className="w-full h-full cursor-crosshair"
        onPointerDown={handleChartPointerDown}
        onPointerMove={handleChartPointerMove}
        onPointerUp={handleChartPointerUp}
      >
        {/* Cuadrícula gris muy tenue (Líneas horizontales de precio) */}
        {priceGridLevels.map((lvl, idx) => {
          const y = getY(lvl);
          return (
            <line
              key={`h-grid-${idx}`}
              x1={0}
              y1={y}
              x2={chartPlotWidth}
              y2={y}
              stroke="rgba(255, 255, 255, 0.04)"
              strokeDasharray="2 2"
              strokeWidth={1}
            />
          );
        })}

        {/* Cuadrícula gris muy tenue (Líneas verticales de tiempo) */}
        {xDateTicks.map((t, idx) => (
          <line
            key={`v-grid-${idx}`}
            x1={t.x}
            y1={10}
            x2={t.x}
            y2={dimensions.height - (isLandscape ? 16 : 22)}
            stroke="rgba(255, 255, 255, 0.04)"
            strokeDasharray="2 2"
            strokeWidth={1}
          />
        ))}

        {/* Eje X: Etiquetas de fechas uniformes con año destacado y mes sutil en TODO */}
        {xDateTicks.map((t, idx) => (
          <text
            key={`x-text-${idx}`}
            x={t.x}
            y={dimensions.height - (isLandscape ? 3 : 6)}
            fontFamily="monospace"
            textAnchor="middle"
            fontSize={isLandscape ? "8" : "9"}
          >
            {t.isMultiYear ? (
              <>
                <tspan fill="#f4f4f5" fontWeight="bold">{t.year}</tspan>
                <tspan fill="#71717a" fontSize={isLandscape ? "7" : "7.5"}> {t.month}</tspan>
              </>
            ) : (
              <tspan fill="#71717a">{t.label}</tspan>
            )}
          </text>
        ))}

        {/* Niveles Técnicos Institucionales Verificados */}
        {technicalLevels?.resistance && (
          <g>
            <line
              x1={0}
              y1={getY(technicalLevels.resistance)}
              x2={chartPlotWidth}
              y2={getY(technicalLevels.resistance)}
              stroke="#f43f5e"
              strokeDasharray="2 2"
              strokeWidth={1}
              strokeOpacity={0.65}
            />
            <text
              x={6}
              y={getY(technicalLevels.resistance) - 3}
              fill="#f43f5e"
              fontSize={isLandscape ? "7.5" : "8"}
              fontFamily="monospace"
            >
              Techo: {formatPrice(technicalLevels.resistance)}
            </text>
          </g>
        )}

        {technicalLevels?.support && (
          <g>
            <line
              x1={0}
              y1={getY(technicalLevels.support)}
              x2={chartPlotWidth}
              y2={getY(technicalLevels.support)}
              stroke="#34d399"
              strokeDasharray="2 2"
              strokeWidth={1}
              strokeOpacity={0.65}
            />
            <text
              x={6}
              y={getY(technicalLevels.support) + (isLandscape ? 7 : 8)}
              fill="#34d399"
              fontSize={isLandscape ? "7.5" : "8"}
              fontFamily="monospace"
            >
              Suelo: {formatPrice(technicalLevels.support)}
            </text>
          </g>
        )}

        {/* Línea horizontal del precio actual en vivo */}
        {currentPrice > 0 && (
          <line
            x1={0}
            y1={getY(currentPrice)}
            x2={chartPlotWidth}
            y2={getY(currentPrice)}
            stroke="#38bdf8"
            strokeDasharray="3 3"
            strokeWidth={1}
            strokeOpacity={0.75}
          />
        )}

        {/* MODO VELAS (OHLC) */}
        {chartMode === "candles" ? (
          visibleCandles.map((c, idx) => {
            const x = 10 + idx * ((chartPlotWidth - 20) / Math.max(1, visibleCandles.length - 1));
            const isBull = c.close >= c.open;
            const color = isBull ? "#34d399" : "#f43f5e";

            const yHigh = getY(c.high);
            const yLow = getY(c.low);
            const yOpen = getY(c.open);
            const yClose = getY(c.close);

            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1.0, Math.abs(yOpen - yClose));

            return (
              <g key={c.timestamp || idx} className="transition-opacity hover:opacity-80">
                <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth={1} />
                <rect
                  x={x - candleBarWidth / 2}
                  y={bodyTop}
                  width={candleBarWidth}
                  height={bodyHeight}
                  fill={color}
                  rx={0.5}
                />
              </g>
            );
          })
        ) : (
          /* MODO LÍNEA CON GRADIENTE */
          (() => {
            if (visibleCandles.length < 2) return null;
            const pointsStr = visibleCandles
              .map((c, idx) => {
                const x = 10 + idx * ((chartPlotWidth - 20) / Math.max(1, visibleCandles.length - 1));
                const y = getY(c.close);
                return `${x},${y}`;
              })
              .join(" ");

            const firstX = 10;
            const lastX = chartPlotWidth - 10;
            const bottomY = dimensions.height - (isLandscape ? 16 : 22);
            const areaPoints = `${firstX},${bottomY} ${pointsStr} ${lastX},${bottomY}`;

            return (
              <g>
                <defs>
                  <linearGradient id="tvLineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <polygon points={areaPoints} fill="url(#tvLineGrad)" />
                <polyline points={pointsStr} fill="none" stroke="#38bdf8" strokeWidth={2} strokeLinecap="round" />
              </g>
            );
          })()
        )}

        {/* Crosshair interactivo */}
        {crosshairPos && (
          <g pointerEvents="none">
            <line
              x1={crosshairPos.x}
              y1={10}
              x2={crosshairPos.x}
              y2={dimensions.height - (isLandscape ? 16 : 22)}
              stroke="#ffffff"
              strokeDasharray="2 2"
              strokeWidth={1}
              strokeOpacity={0.3}
            />
            <line
              x1={0}
              y1={crosshairPos.y}
              x2={chartPlotWidth}
              y2={crosshairPos.y}
              stroke="#ffffff"
              strokeDasharray="2 2"
              strokeWidth={1}
              strokeOpacity={0.3}
            />
          </g>
        )}
      </svg>

      {/* 3. EJE DE PRECIOS LATERAL DERECHO (TradingView Scale Dragging) */}
      <div
        className="absolute top-0 right-0 bottom-0 w-[55px] border-l border-white/[0.06] bg-[#080b12] cursor-ns-resize select-none flex flex-col justify-between py-2 landscape:py-1 px-1 font-mono text-[9px] landscape:text-[8px] text-zinc-400 group"
        onPointerDown={handleScalePointerDown}
        onPointerMove={handleScalePointerMove}
        onPointerUp={handleScalePointerUp}
        onDoubleClick={handleScaleDoubleClick}
        title="Arrastra verticalmente para estirar/comprimir las velas. Doble clic para restablecer."
      >
        {priceGridLevels.slice().reverse().map((lvl, idx) => (
          <div key={`scale-${idx}`} className="truncate tabular-nums text-right text-zinc-400 group-hover:text-zinc-200">
            {formatPriceCompact(lvl)}
          </div>
        ))}

        {/* Badge del precio actual en el eje */}
        {currentPrice > 0 && (
          <div
            className="absolute right-0 px-1 py-0.5 bg-sky-500 text-white font-bold rounded-l text-[8px] tabular-nums pointer-events-none transition-all shadow-md"
            style={{
              top: `${Math.max(6, Math.min(dimensions.height - (isLandscape ? 24 : 30), getY(currentPrice) - 7))}px`,
            }}
          >
            {formatPrice(currentPrice, 1)}
          </div>
        )}

        {/* Badge del crosshair en el eje */}
        {crosshairPos && (
          <div
            className="absolute right-0 px-1 py-0.5 bg-zinc-200 text-zinc-950 font-bold rounded-l text-[8px] tabular-nums pointer-events-none shadow-md"
            style={{
              top: `${Math.max(6, Math.min(dimensions.height - (isLandscape ? 24 : 30), crosshairPos.y - 7))}px`,
            }}
          >
            {formatPrice(crosshairPos.price, 1)}
          </div>
        )}
      </div>

      {/* Botón de maximizar si está en modo compacto */}
      {!isExpanded && onToggleExpand && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="absolute bottom-2 right-[62px] p-1.5 rounded-lg bg-black/60 hover:bg-black/90 border border-white/[0.1] text-zinc-300 hover:text-white transition-colors z-20"
          title="Vista Expandida TradingView"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      )}
    </div>
  );
}
