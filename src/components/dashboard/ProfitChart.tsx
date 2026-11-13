"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { ChartPoint, Timeframe, ChartView, BrokerFilter } from "@/types/trading212";
import { formatEur, formatPct, formatCompactEur } from "@/lib/utils";
import TimeframeSelector from "./TimeframeSelector";
import ChartViewSelector from "./ChartViewSelector";

interface ProfitChartProps {
  data?: Record<Timeframe, ChartPoint[]>;
  currentProfit?: number;
  currentBroker?: BrokerFilter;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartPoint & { inactiveVal?: number | null; activeVal?: number | null };
  }>;
  view: ChartView;
  metricColor: string;
  isInteracting?: boolean;
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}

function RenderTradeDot(props: DotProps) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload || !payload.tradeEvent) return null;

  const isBuy = payload.tradeEvent.type === "BUY";

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={7}
        fill={isBuy ? "#10b981" : "#f43f5e"}
        fillOpacity={0.3}
      />
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={isBuy ? "#10b981" : "#f43f5e"}
        stroke="#080b11"
        strokeWidth={1.5}
      />
    </g>
  );
}

function CustomTooltip({ active, payload, view, metricColor, isInteracting }: CustomTooltipProps) {
  if (!active || !isInteracting || !payload || !payload.length) return null;
  // Buscar el payload correspondiente al punto activo o general
  const point = payload[0].payload;
  if (!point) return null;

  const isInactive = (point.totalInvested === 0 || point.totalInvested === undefined) &&
                     (point.totalValue === 0 || point.totalValue === undefined);

  return (
    <div className="bg-[#0e131f]/95 border border-white/[0.1] rounded-lg p-2.5 shadow-2xl backdrop-blur-md text-xs font-mono min-w-[190px]">
      {/* Evento de compra o venta con formato exacto */}
      {point.tradeEvent && (
        <div className="mb-2 px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold">
          {point.tradeEvent.label}
        </div>
      )}

      <p className="text-zinc-400 text-[10px] mb-1.5 pb-1 border-b border-white/[0.06]">
        {point.fullDate}
      </p>

      {isInactive ? (
        <div className="py-1 text-zinc-400 text-[11px] italic">
          Sin fondos / Cartera inactiva
        </div>
      ) : (
        <div className="space-y-1.5">
          {view === "profit" && (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Beneficio:</span>
                <span
                  className="font-bold tabular-nums"
                  style={{ color: point.realProfit < 0 ? "#f43f5e" : metricColor }}
                >
                  {formatEur(point.realProfit, true)} ({formatPct(point.realProfitPct, true)})
                </span>
              </div>

              {/* Valor en acción dinámico: varía con cada posición en el gráfico */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Valor en acción:</span>
                <span className="font-bold text-zinc-100 tabular-nums">
                  {formatEur(point.totalValue)}
                </span>
              </div>
            </>
          )}

          {view === "value" && (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Valor Cartera:</span>
                <span className="font-bold text-amber-300 tabular-nums">
                  {formatEur(point.totalValue)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-zinc-400">Beneficio:</span>
                <span
                  className="font-medium tabular-nums"
                  style={{ color: point.realProfit < 0 ? "#f43f5e" : metricColor }}
                >
                  {formatEur(point.realProfit, true)}
                </span>
              </div>
            </>
          )}

          {view === "returnPct" && (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Rentabilidad:</span>
                <span
                  className={`font-bold tabular-nums ${
                    point.realProfitPct < 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {formatPct(point.realProfitPct, true)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Valor en acción:</span>
                <span className="font-bold text-zinc-100 tabular-nums">
                  {formatEur(point.totalValue)}
                </span>
              </div>
            </>
          )}

          {/* Coste de compra / invertido inicial */}
          <div className="flex items-center justify-between gap-3 text-[10px] pt-1 text-zinc-500 border-t border-white/[0.04]">
            <span>Coste invertido:</span>
            <span className="text-zinc-300 tabular-nums">{formatEur(point.totalInvested)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfitChart({
  data,
  currentBroker = "all",
}: ProfitChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("M");
  const [currentView, setCurrentView] = useState<ChartView>("profit");
  const [isInteracting, setIsInteracting] = useState(false);
  const [isTouchActive, setIsTouchActive] = useState(false);

  // Escuchar soltado de toque o ratón global para que al levantar el dedo en móvil el tooltip se quite de inmediato
  useEffect(() => {
    const handleGlobalRelease = () => {
      setIsInteracting(false);
      setIsTouchActive(false);
    };
    window.addEventListener("touchend", handleGlobalRelease, { passive: true });
    window.addEventListener("mouseup", handleGlobalRelease);
    window.addEventListener("touchcancel", handleGlobalRelease, { passive: true });
    window.addEventListener("blur", handleGlobalRelease);
    return () => {
      window.removeEventListener("touchend", handleGlobalRelease);
      window.removeEventListener("mouseup", handleGlobalRelease);
      window.removeEventListener("touchcancel", handleGlobalRelease);
      window.removeEventListener("blur", handleGlobalRelease);
    };
  }, []);

  // Bloquear scroll de la página y selección de texto accidental SOLO mientras el usuario se desliza por el gráfico
  useEffect(() => {
    if (isTouchActive) {
      const origUserSelect = document.body.style.userSelect;
      const origWebkit = document.body.style.getPropertyValue("-webkit-user-select");
      document.body.style.userSelect = "none";
      document.body.style.setProperty("-webkit-user-select", "none");

      return () => {
        document.body.style.userSelect = origUserSelect;
        if (origWebkit) document.body.style.setProperty("-webkit-user-select", origWebkit);
        else document.body.style.removeProperty("-webkit-user-select");
      };
    }
  }, [isTouchActive]);

  const safeData = data || ({} as Record<Timeframe, ChartPoint[]>);
  const chartPoints = safeData && safeData[timeframe] ? safeData[timeframe] : [];

  // 1. PALETA DE COLORES SEGÚN BROKER Y VISTA
  let dataKey: keyof ChartPoint = "realProfit";
  let baseColor = "#38bdf8"; // Trading 212 original sky blue
  let reddishColor = "#987cf7"; // Tono original con matiz cálido/rojizo (NO rojo puro)

  if (currentView === "profit") {
    dataKey = "realProfit";
    if (currentBroker === "t212") {
      baseColor = "#38bdf8"; // Azul cielo T212 original
      reddishColor = "#987cf7"; // El azul original hecho ligeramente más rojizo/cálido
    } else if (currentBroker === "revolut") {
      baseColor = "#e4e4e7"; // Plata Revolut
      reddishColor = "#e8cad2"; // Plata con matiz cálido/rosáceo
    } else {
      baseColor = "#818cf8"; // Índigo Consolidado
      reddishColor = "#b87cf8"; // Índigo con matiz cálido/rojizo
    }
  } else if (currentView === "value") {
    dataKey = "totalValue";
    baseColor = "#fbbf24"; // Oro / Ámbar financiero
    reddishColor = "#fbbf24";
  } else if (currentView === "returnPct") {
    dataKey = "realProfitPct";
    baseColor = "#34d399"; // Verde esmeralda
    reddishColor = "#987cf7";
  }

  // 2. DETECCIÓN DEL MOMENTO DEL PRIMER DEPÓSITO (Separación pre-cartera gris vs activa)
  const firstActiveIndex = chartPoints.findIndex(
    (p) => (p.totalInvested !== undefined && p.totalInvested > 0) || (p.totalValue !== undefined && p.totalValue > 0)
  );

  const hasInactivePoints = firstActiveIndex > 0 || firstActiveIndex === -1;

  // 3. GENERAR PUNTOS CON inactiveVal (Gris sobre el 0€) Y activeVal (Curva activa)
  const processedPoints = chartPoints.map((point, idx) => {
    const rawVal = point[dataKey] as number;
    let inactiveVal: number | null = null;
    let activeVal: number | null = null;

    if (firstActiveIndex === -1) {
      // Todo el histórico es anterior al primer depósito
      inactiveVal = 0;
      activeVal = null;
    } else if (firstActiveIndex === 0) {
      // Todo el histórico tiene fondos
      inactiveVal = null;
      activeVal = rawVal;
    } else {
      if (idx < firstActiveIndex) {
        // Antes del depósito: línea gris en 0.00 €
        inactiveVal = 0;
        activeVal = null;
      } else if (idx === firstActiveIndex) {
        // En el día del depósito: unión exacta sin corte
        inactiveVal = 0;
        activeVal = rawVal;
      } else {
        // Posterior al depósito: curva activa
        inactiveVal = null;
        activeVal = rawVal;
      }
    }

    return {
      ...point,
      inactiveVal,
      activeVal,
    };
  });

  // 4. CÁLCULO DE MÍNIMOS Y MÁXIMOS DE LA CURVA ACTIVA
  const activeValues = processedPoints
    .map((p) => p.activeVal)
    .filter((v): v is number => typeof v === "number" && !isNaN(v));

  const activeMin = activeValues.length > 0 ? Math.min(...activeValues) : 0;
  const activeMax = activeValues.length > 0 ? Math.max(...activeValues) : 0;

  // Todos los valores para el dominio del eje Y (incluyendo la línea gris en 0)
  const allValues = processedPoints
    .flatMap((p) => [p.inactiveVal, p.activeVal])
    .filter((v): v is number => typeof v === "number" && !isNaN(v));

  const minVal = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 0;

  // Offset del 0 € para el degradado del área y trazo
  let zeroOffset = 0;
  if (activeMax > 0 && activeMin < 0) {
    zeroOffset = Math.max(0, Math.min(100, Number(((activeMax / (activeMax - activeMin)) * 100).toFixed(1))));
  } else if (activeMax <= 0) {
    zeroOffset = 0;
  } else {
    zeroOffset = 100;
  }

  // 5. DETERMINAR EL COLOR DEL TRAZO DE LA CURVA ACTIVA
  // En zonas positivas (>0€) -> baseColor (azul cielo original)
  // En zonas negativas (<0€) -> reddishColor (azul original con matiz cálido/rojizo)
  let activeStroke = baseColor;
  let activeDotColor = baseColor;

  if (currentView === "profit" || currentView === "returnPct") {
    if (activeMin < 0 && activeMax > 0) {
      // Cruza el 0€: usa degradado SVG vertical
      activeStroke = `url(#stroke-split-${currentView}-${timeframe}-${currentBroker})`;
      activeDotColor = reddishColor;
    } else if (activeMin < 0 && activeMax === 0) {
      // Arranca en 0€ y cae en terreno negativo
      activeStroke = `url(#stroke-split-${currentView}-${timeframe}-${currentBroker})`;
      activeDotColor = reddishColor;
    } else if (activeMax < 0) {
      // Toda la curva activa está en terreno negativo
      activeStroke = reddishColor;
      activeDotColor = reddishColor;
    } else {
      activeStroke = baseColor;
      activeDotColor = baseColor;
    }
  }

  // CÁLCULO DE ZOOM DINÁMICO DEL EJE Y (Curvas pronunciadas)
  const getYAxisDomain = (): [number | string, number | string] => {
    if (processedPoints.length === 0) return ["auto", "auto"];
    const diff = maxVal - minVal;

    if (currentView === "value") {
      const padding = diff > 0 ? Math.max(0.08, diff * 0.1) : Math.max(0.2, minVal * 0.01);
      return [
        Number((minVal - padding).toFixed(2)),
        Number((maxVal + padding).toFixed(2)),
      ];
    }

    if (currentView === "returnPct") {
      const padding = Math.max(0.15, diff * 0.1);
      return [
        Number((minVal - padding).toFixed(1)),
        Number((maxVal + padding).toFixed(1)),
      ];
    }

    const padding = Math.max(0.08, diff * 0.12);
    return [
      Number((minVal - padding).toFixed(2)),
      Number((maxVal + padding).toFixed(2)),
    ];
  };

  // ESTADO DE MERCADO: Automatizado en tiempo real con temporizador cada 30 segundos
  const [marketStatus, setMarketStatus] = useState<{ isOpen: boolean; text: string }>({
    isOpen: false,
    text: "Mercado Cerrado",
  });
  const [showHoursTooltip, setShowHoursTooltip] = useState(false);

  useEffect(() => {
    function evaluateMarketStatus() {
      const now = new Date();
      // Evaluar hora oficial en España (CET / Europe/Madrid)
      const madridStr = now.toLocaleString("en-US", { timeZone: "Europe/Madrid" });
      const madridDate = new Date(madridStr);
      const day = madridDate.getDay(); // 0 = Dom, 6 = Sáb
      const totalMinutes = madridDate.getHours() * 60 + madridDate.getMinutes();

      // Fines de semana: Bolsa cerrada
      if (day === 0 || day === 6) {
        setMarketStatus({ isOpen: false, text: "Mercado Cerrado" });
        return;
      }

      // Sesión regular Wall Street (EE.UU.): 15:30 a 22:00 CET
      const isUSOpen = totalMinutes >= 15 * 60 + 30 && totalMinutes < 22 * 60;
      // Pre-Market oficial (Trading 212 opera desde las 10:00 CET)
      const isPreMarket = totalMinutes >= 10 * 60 && totalMinutes < 15 * 60 + 30;
      // Bolsas europeas (ETFs de Revolut en Fráncfort/París): 09:00 a 17:30 CET
      const isEuropeanOpen = totalMinutes >= 9 * 60 && totalMinutes < 17 * 60 + 30;

      if (isUSOpen || (currentBroker === "revolut" && isEuropeanOpen)) {
        setMarketStatus({ isOpen: true, text: "Mercado Abierto" });
      } else if (isPreMarket) {
        setMarketStatus({ isOpen: true, text: "Pre-Market" });
      } else {
        setMarketStatus({ isOpen: false, text: "Mercado Cerrado" });
      }
    }

    evaluateMarketStatus();
    const interval = setInterval(evaluateMarketStatus, 30000);
    return () => clearInterval(interval);
  }, [currentBroker]);

  return (
    <section className="border-t border-white/[0.06] pt-3 pb-2">
      {/* Header del gráfico: Desplegable a la izquierda, Estado de Mercado a la derecha */}
      <div className="flex items-center justify-between mb-2">
        <ChartViewSelector
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        {/* Indicador de Mercado minimalista con micro-menú flotante de horarios */}
        <div className="relative inline-flex items-center">
          {showHoursTooltip && (
            <div className="absolute bottom-full right-0 mb-1.5 z-50 bg-[#0e131f]/95 border border-white/[0.12] rounded-md px-2.5 py-1.5 shadow-2xl backdrop-blur-md text-[9px] font-mono whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between gap-3 text-zinc-300">
                <span className="text-zinc-500">Pre-Market</span>
                <span className="font-medium text-zinc-200">10:00 - 15:30</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-zinc-300">
                <span className="text-zinc-500">Apertura</span>
                <span className="font-medium text-zinc-200">15:30 - 22:00</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-zinc-300 border-t border-white/[0.04] pt-0.5 mt-0.5">
                <span className="text-zinc-500">After-Market</span>
                <span className="font-medium text-zinc-200">22:00 - 02:00</span>
              </div>
            </div>
          )}

          <span
            onMouseEnter={() => setShowHoursTooltip(true)}
            onMouseLeave={() => setShowHoursTooltip(false)}
            onMouseDown={() => setShowHoursTooltip(true)}
            onMouseUp={() => setShowHoursTooltip(false)}
            onTouchStart={() => setShowHoursTooltip(true)}
            onTouchEnd={() => setShowHoursTooltip(false)}
            onTouchCancel={() => setShowHoursTooltip(false)}
            className="cursor-pointer select-none inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.03] border border-white/[0.06] text-zinc-300 hover:bg-white/[0.06] transition-colors"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                marketStatus.isOpen ? "bg-emerald-400" : "bg-amber-400/90"
              }`}
            />
            <span>{marketStatus.text}</span>
          </span>
        </div>
      </div>

      {/* Gráfico Recharts con línea gris en inactivo y curva activa condicional */}
      <div
        className="w-full h-[220px] sm:h-[280px] touch-none select-none"
        data-testid="portfolio-chart"
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => setIsInteracting(false)}
        onTouchStart={() => { setIsTouchActive(true); setIsInteracting(true); }}
        onTouchEnd={() => setIsInteracting(false)}
        onTouchCancel={() => setIsInteracting(false)}
      >
        {processedPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={processedPoints}
              margin={{ top: 8, right: 8, left: 6, bottom: 0 }}
              onMouseMove={() => setIsInteracting(true)}
              onMouseLeave={() => setIsInteracting(false)}
            >
              <defs>
                {/* 1. Degradado vertical del TRAZO: Azul original arriba de 0€, y azul con matiz cálido/rojizo al entrar en zona roja */}
                <linearGradient
                  id={`stroke-split-${currentView}-${timeframe}-${currentBroker}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  {activeMin < 0 && activeMax > 0 ? (
                    <>
                      <stop offset="0%" stopColor={baseColor} />
                      <stop offset={`${Math.max(0, zeroOffset - 1)}%`} stopColor={baseColor} />
                      <stop offset={`${Math.min(100, zeroOffset + 1)}%`} stopColor={reddishColor} />
                      <stop offset="100%" stopColor={reddishColor} />
                    </>
                  ) : activeMin < 0 && activeMax === 0 ? (
                    <>
                      <stop offset="0%" stopColor={baseColor} />
                      <stop offset="6%" stopColor={reddishColor} />
                      <stop offset="100%" stopColor={reddishColor} />
                    </>
                  ) : activeMax < 0 ? (
                    <>
                      <stop offset="0%" stopColor={reddishColor} />
                      <stop offset="100%" stopColor={reddishColor} />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor={baseColor} />
                      <stop offset="100%" stopColor={baseColor} />
                    </>
                  )}
                </linearGradient>

                {/* 2. Degradado vertical del ÁREA: Rojo suave en negativo, azul en positivo */}
                <linearGradient
                  id={`gradient-${currentView}-${timeframe}-${currentBroker}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  {currentView === "profit" || currentView === "returnPct" ? (
                    activeMin < 0 && activeMax > 0 ? (
                      <>
                        <stop offset="0%" stopColor={baseColor} stopOpacity={0.25} />
                        <stop offset={`${Math.max(0, zeroOffset - 5)}%`} stopColor={baseColor} stopOpacity={0.10} />
                        <stop offset={`${zeroOffset}%`} stopColor={baseColor} stopOpacity={0.02} />
                        <stop offset={`${zeroOffset}%`} stopColor="#f43f5e" stopOpacity={0.05} />
                        <stop offset={`${Math.min(100, zeroOffset + 6)}%`} stopColor="#f43f5e" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                      </>
                    ) : activeMin < 0 ? (
                      <>
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                      </>
                    ) : (
                      <>
                        <stop offset="0%" stopColor={baseColor} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={baseColor} stopOpacity={0.02} />
                      </>
                    )
                  ) : (
                    <>
                      <stop offset="0%" stopColor={baseColor} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={baseColor} stopOpacity={0.0} />
                    </>
                  )}
                </linearGradient>

                {/* 3. Degradado vertical del ÁREA INACTIVA: Gris elegante antes de la primera compra */}
                <linearGradient
                  id={`gradient-inactive-${timeframe}-${currentBroker}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#71717a" stopOpacity={0.22} />
                  <stop offset="50%" stopColor="#71717a" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#71717a" stopOpacity={0.01} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="date"
                stroke="#a1a1aa"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={6}
                interval={timeframe === "M" ? 3 : timeframe === "D" ? 3 : 0}
                minTickGap={4}
                tick={{ fill: "#a1a1aa" }}
              />

              <YAxis
                domain={getYAxisDomain()}
                width={64}
                stroke="#a1a1aa"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#a1a1aa" }}
                tickFormatter={(val) => {
                  if (currentView === "returnPct") {
                    return `${val > 0 ? "+" : ""}${val.toFixed(1)}%`;
                  }
                  if (Math.abs(val) < 100) {
                    return `${val >= 0 ? "" : "-"}${Math.abs(val).toFixed(2)} €`;
                  }
                  return formatCompactEur(val);
                }}
                dx={-2}
              />

              <Tooltip
                content={<CustomTooltip view={currentView} metricColor={baseColor} isInteracting={isInteracting} />}
                cursor={isInteracting ? { stroke: "#ffffff", strokeWidth: 1, strokeDasharray: "3 3", opacity: 0.25 } : false}
              />

              {/* Línea horizontal 0 de referencia */}
              {currentView !== "value" && (
                <ReferenceLine
                  y={0}
                  stroke="#3f3f46"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              )}

              {/* A. Línea gris horizontal con degradado gris para el periodo pre-compras (0€) */}
              {hasInactivePoints && (
                <Area
                  key={`inactive-line-${timeframe}-${currentBroker}`}
                  type="monotone"
                  dataKey="inactiveVal"
                  stroke="#71717a"
                  strokeWidth={2.5}
                  fill={`url(#gradient-inactive-${timeframe}-${currentBroker})`}
                  fillOpacity={1}
                  baseValue="dataMin"
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={300}
                  connectNulls={false}
                />
              )}

              {/* B. Curva activa con degradado condicional */}
              <Area
                key={`active-area-${currentView}-${timeframe}-${currentBroker}`}
                type="monotone"
                dataKey="activeVal"
                stroke={activeStroke}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#gradient-${currentView}-${timeframe}-${currentBroker})`}
                baseValue="dataMin"
                dot={processedPoints.length === 1 ? { r: 4 } : false}
                isAnimationActive={true}
                animationDuration={380}
                animationEasing="ease-out"
                connectNulls={false}
                activeDot={
                  isInteracting
                    ? {
                        r: 4.5,
                        fill: activeDotColor,
                        stroke: "#080b11",
                        strokeWidth: 2,
                      }
                    : false
                }
              />

              {/* C. Puntos de compra (🟢) y venta (🔴) reales en el gráfico */}
              {processedPoints.map((pt, idx) => {
                if (!pt.tradeEvent) return null;
                const isBuy = pt.tradeEvent.type === "BUY";
                const dotColor = isBuy ? "#10b981" : "#f43f5e";
                const yCoord =
                  pt.activeVal !== null && pt.activeVal !== undefined
                    ? pt.activeVal
                    : (pt.inactiveVal ?? 0);

                return (
                  <ReferenceDot
                    key={`ref-dot-${pt.date}-${idx}`}
                    x={pt.date}
                    y={yCoord}
                    r={5.5}
                    fill={dotColor}
                    stroke="#080b11"
                    strokeWidth={2}
                    isFront={true}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-mono">
            Cargando histórico...
          </div>
        )}
      </div>

      {/* Selector Temporal Debajo */}
      <div className="mt-3">
        <TimeframeSelector
          selected={timeframe}
          onChange={setTimeframe}
        />
      </div>
    </section>
  );
}
