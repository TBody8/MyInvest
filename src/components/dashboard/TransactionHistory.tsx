"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { T212Transaction } from "@/types/trading212";
import { formatEur } from "@/lib/utils";

interface TransactionHistoryProps {
  transactions?: T212Transaction[];
}

export default function TransactionHistory({
  transactions = [],
}: TransactionHistoryProps) {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "DEPOSIT":
        return "Depósito de fondos";
      case "WITHDRAW":
        return "Retirada";
      case "INTEREST":
        return "Interés por efectivo";
      default:
        return type;
    }
  };

  return (
    <section className="border-t border-white/[0.06] pt-4 pb-4">
      <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
        Movimientos Recientes
      </div>

      <div className="divide-y divide-white/[0.03]">
        {safeTransactions.slice(0, 8).map((tx) => {
          if (!tx) return null;
          const isDeposit = tx.type === "DEPOSIT" || tx.type === "INTEREST";
          const txDate = new Date(tx.dateTime);
          const formattedDate = !isNaN(txDate.getTime())
            ? format(txDate, "d MMM yyyy", { locale: es })
            : tx.dateTime;

          return (
            <div
              key={tx.id}
              className="flex items-center justify-between py-2.5 text-xs font-mono"
            >
              <div>
                <div className="text-zinc-200 font-medium">
                  {getTypeLabel(tx.type)}
                </div>
                <div className="text-[10px] text-zinc-500">{formattedDate}</div>
              </div>

              <div className="text-right">
                <span
                  className={`font-semibold tabular-nums ${
                    isDeposit ? "text-profit" : "text-loss"
                  }`}
                >
                  {isDeposit ? `+${formatEur(tx.amount)}` : `-${formatEur(tx.amount)}`}
                </span>
              </div>
            </div>
          );
        })}

        {safeTransactions.length === 0 && (
          <div className="py-4 text-center text-xs text-zinc-600 font-mono">
            No hay movimientos registrados.
          </div>
        )}
      </div>
    </section>
  );
}
