import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Formateador de moneda Euro (€) con convención española/europea
export function formatEur(value: number, includeSign: boolean = false): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0,00 €";
  }

  const formatted = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  if (value > 0 && includeSign) {
    return `+${formatted}`;
  }
  if (value < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

// Formateador de porcentaje
export function formatPct(value: number, includeSign: boolean = true): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0,00 %";
  }

  const formatted = new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  if (value > 0 && includeSign) {
    return `+${formatted} %`;
  }
  if (value < 0) {
    return `-${formatted} %`;
  }
  return `${formatted} %`;
}

// Formatear números compactos (ej: 1,2k €)
export function formatCompactEur(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(".", ",")}M €`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(".", ",")}k €`;
  }
  return formatEur(value);
}

// Formateador de moneda Dólar ($) con formato estándar
export function formatUsd(value: number, includeSign: boolean = false): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "$0.00";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  if (value > 0 && includeSign) {
    return `+${formatted}`;
  }
  if (value < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

// Comprobar si un activo es un ETF (cotizado en EUR en Europa)
export function isETF(position: { ticker: string; name?: string }): boolean {
  const ticker = cleanTicker(position.ticker).toUpperCase();
  const name = (position.name || "").toUpperCase();
  if (["IUSQ", "6AQQ", "IS3N", "IUSN"].includes(ticker)) return true;
  return /\bETF\b/.test(name) || /\bUCITS\b/.test(name);
}

// Limpiar nombres de tickers o añadir nombre legible
export function cleanTicker(ticker: string): string {
  // Ej: "AAPL_US_EQ" -> "AAPL"
  return ticker.split("_")[0] || ticker;
}
