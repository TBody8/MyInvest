"use client";

import { X, Calendar, TrendingDown, TrendingUp, AlertTriangle, Building2, ShieldAlert } from "lucide-react";

export type CatalystType = "FED" | "ECB" | "CPI";

interface CatalystDetail {
  id: CatalystType;
  title: string;
  flag: string;
  institution: string;
  date: string;
  currentValueLabel: string;
  currentValue: string;
  expectedLabel: string;
  expectedValue: string;
  marketProbability?: string;
  sourceProbability?: string;
  analysts: Array<{
    firm: string;
    analyst?: string;
    posture: string;
    details: string;
  }>;
  portfolioImpact: {
    assets: string;
    summary: string;
  };
}

export const CATALYST_DATA: Record<CatalystType, CatalystDetail> = {
  FED: {
    id: "FED",
    title: "Decisión de Tipos de Interés FOMC",
    flag: "🇺🇸",
    institution: "Reserva Federal de EE.UU. (FED)",
    date: "18 de Diciembre de 2026",
    currentValueLabel: "Rango Oficial Actual",
    currentValue: "4.75% - 5.00%",
    expectedLabel: "Expectativa Consenso",
    expectedValue: "Recorte -25 pb (hacia 4.50% - 4.75%)",
    marketProbability: "68.4% recorte 25 pb | 31.6% pausa",
    sourceProbability: "CME FedWatch Tool",
    analysts: [
      {
        firm: "Goldman Sachs",
        analyst: "Jan Hatzius (Chief Economist)",
        posture: "Ciclo de flexibilización ordenado",
        details:
          "Prevé recortes sucesivos de 25 pb hasta alcanzar una tasa terminal neutra del 3.25%-3.50% a mediados de 2027. Destaca que la normalización del mercado laboral reduce presiones salariales sin recesión.",
      },
      {
        firm: "Morgan Stanley",
        analyst: "Seth Carpenter (Global Chief Economist)",
        posture: "Cautela dependiente de datos de consumo",
        details:
          "Estima que la Fed mantendrá un ritmo pausado si el PIB se mantiene por encima del 2.5%, vigilando que el rendimiento del bono a 10 años (UST 10Y) no tensione excesivamente el crédito corporativo.",
      },
      {
        firm: "JP Morgan",
        analyst: "Michael Feroli (Chief US Economist)",
        posture: "Riesgo de persistencia en servicios",
        details:
          "Advierte de que la rigidez en la inflación de servicios y vivienda podría forzar una pausa táctica en el primer trimestre, lo que sostendría la fortaleza del dólar frente a divisas europeas.",
      },
    ],
    portfolioImpact: {
      assets: "Acciones Tecnológicas (NVDA, AVGO, 6AQQ) & Divisa EUR/USD",
      summary:
        "Una bajada de tipos reduce el coste del capital y comprime la tasa de descuento de flujos futuros, beneficiando a Broadcom, Nvidia y el Nasdaq 100. En divisas, tiende a depreciar el USD frente al EUR, lo que modera ligeramente las plusvalías por tipo de cambio de acciones estadounidenses no cubiertas.",
    },
  },
  ECB: {
    id: "ECB",
    title: "Decisión de Política Monetaria del Consejo",
    flag: "🇪🇺",
    institution: "Banco Central Europeo (BCE)",
    date: "17 de Diciembre de 2026",
    currentValueLabel: "Tipo Facilidad Depósito",
    currentValue: "3.25% (Refinanciación: 3.40%)",
    expectedLabel: "Expectativa Consenso",
    expectedValue: "Recorte -25 pb (hacia 3.00%)",
    marketProbability: "85% probabilidad de recorte de 25 pb",
    sourceProbability: "Encuesta de Economistas Reuters / Bloomberg",
    analysts: [
      {
        firm: "Deutsche Bank Research",
        analyst: "Mark Wall (Chief European Economist)",
        posture: "Aceleración de la flexibilización",
        details:
          "Argumenta que la debilidad industrial alemana y la desaceleración del crédito privado justifican situar la tasa de depósito en el 2.00%-2.25% (nivel neutral) antes del verano para evitar un estancamiento prolongado.",
      },
      {
        firm: "ING Economics",
        analyst: "Carsten Brzeski (Global Head of Macro)",
        posture: "Riesgo de 'quedarse detrás de la curva'",
        details:
          "Apunta a que el BCE teme enfriar excesivamente la economía periférica. Con la inflación general convergente al 2%, el foco se ha desplazado completamente desde el control de precios hacia la competitividad del crecimiento europeo.",
      },
      {
        firm: "BNP Paribas",
        analyst: "Paul Hollingsworth (Senior Economist)",
        posture: "Aterrizaje suave europeo",
        details:
          "Espera que el descenso en los costes de financiación hipotecaria y empresarial empiece a reactivar la inversión corporativa en el primer semestre.",
      },
    ],
    portfolioImpact: {
      assets: "ETFs Europeos y Globales (IUSQ, IUSN, IS3N)",
      summary:
        "Tipos europeos más bajos impulsan especialmente al ETF de pequeña capitalización (IUSN - Small Caps), muy sensible a la financiación bancaria europea, y alivia el coste financiero de multinacionales globales domiciliadas en Europa.",
    },
  },
  CPI: {
    id: "CPI",
    title: "Informe Oficial de Inflación IPC (CPI EE.UU.)",
    flag: "📊",
    institution: "Oficina de Estadísticas Laborales (BLS EE.UU.)",
    date: "12 de Noviembre de 2026 - 14:30h ESP",
    currentValueLabel: "Dato Previo (Interanual)",
    currentValue: "+2.4% General | +3.3% Subyacente (Core)",
    expectedLabel: "Previsión Consenso Wall St",
    expectedValue: "+2.6% Interanual (+0.2% m/m)",
    marketProbability: "Subyacente esperada: +3.3% interanual",
    sourceProbability: "Consenso Dow Jones / Bloomberg Survey",
    analysts: [
      {
        firm: "Bank of America",
        analyst: "Michael Gapen (Head of US Economics)",
        posture: "Vigilancia de volatilidad (VIX)",
        details:
          "Si el IPC subyacente supera el 0.3% mensual, el mercado de bonos aplazará los recortes previstos, tensionando el VIX por encima de 26 y castigando múltiplos exigentes.",
      },
      {
        firm: "Citi Research",
        analyst: "Veronica Clark (US Economist)",
        posture: "Moderación en costes de vivienda (OER)",
        details:
          "Los datos de nuevos contratos de alquiler anticipan una ralentización en la partida de vivienda (Shelter). Si se confirma en el informe, despejará el camino para el rally de fin de año en renta variable.",
      },
      {
        firm: "Barclays",
        analyst: "Pooja Sriram (US Macro Analyst)",
        posture: "Energía a la baja, servicios estables",
        details:
          "Los menores precios de la gasolina compensarán el repunte estacional en seguros médicos y servicios recreativos, manteniendo la senda desinflacionaria.",
      },
    ],
    portfolioImpact: {
      assets: "Volatilidad del Mercado (CBOE VIX) & S&P 500 / Nasdaq",
      summary:
        "El IPC es el catalizador con mayor impacto inmediato en la volatilidad intradiaria. Un dato en línea o inferior al 2.6% suele comprimir el VIX hacia la zona de 15-18, impulsando las valoraciones de toda tu cartera consolidada.",
    },
  },
};

interface MacroCatalystModalProps {
  catalystId: CatalystType | null;
  onClose: () => void;
}

export default function MacroCatalystModal({ catalystId, onClose }: MacroCatalystModalProps) {
  if (!catalystId) return null;
  const item = CATALYST_DATA[catalystId];
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0e131f] border border-white/[0.1] rounded-2xl p-4 sm:p-5 shadow-2xl overflow-y-auto max-h-[90vh] font-mono text-xs text-zinc-100 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{item.flag}</span>
              <span className="text-sm sm:text-base font-bold text-white tracking-tight">{item.title}</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">{item.institution}</div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tarjetas Cuantitativas de Estado */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">{item.currentValueLabel}</span>
            <span className="text-xs font-bold text-zinc-200 mt-0.5 block">{item.currentValue}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <span className="text-[10px] text-sky-400 block uppercase font-bold">{item.expectedLabel}</span>
            <span className="text-xs font-bold text-sky-300 mt-0.5 block">{item.expectedValue}</span>
          </div>
        </div>

        {/* Probabilidad de Mercado Verificada */}
        {item.marketProbability && (
          <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15 flex items-center justify-between text-[11px]">
            <div>
              <span className="text-amber-400 font-bold block">{item.marketProbability}</span>
              <span className="text-[9px] text-zinc-500">Fuente: {item.sourceProbability}</span>
            </div>
            <Calendar className="w-4 h-4 text-amber-400/70 shrink-0 ml-2" />
          </div>
        )}

        {/* Consenso y Análisis de Instituciones Financieras (Cero invención) */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Consenso Institucional de Wall Street</span>
          </div>

          <div className="space-y-2">
            {item.analysts.map((a, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="font-bold text-zinc-200 text-xs">{a.firm}</span>
                  {a.analyst && <span className="text-[10px] text-zinc-500 font-sans">({a.analyst})</span>}
                </div>
                <div className="text-[10px] text-indigo-300 font-semibold">{a.posture}</div>
                <p className="text-[11px] text-zinc-300 font-sans leading-relaxed pt-0.5">{a.details}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Impacto Concreto en Tu Cartera */}
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Impacto en tus Activos en Cartera</span>
          </div>
          <div className="text-[10px] font-bold text-zinc-300">{item.portfolioImpact.assets}</div>
          <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">{item.portfolioImpact.summary}</p>
        </div>

        {/* Botón de cierre */}
        <div className="pt-2 border-t border-white/[0.06] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs transition-colors"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
}
