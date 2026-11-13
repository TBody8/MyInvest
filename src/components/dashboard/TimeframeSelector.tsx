"use client";

import { Timeframe } from "@/types/trading212";

interface TimeframeSelectorProps {
  selected: Timeframe;
  onChange: (tf: Timeframe) => void;
  isLoading?: boolean;
}

const TIMEFRAMES: Array<{ id: Timeframe; label: string }> = [
  { id: "D", label: "1D" },
  { id: "W", label: "1S" },
  { id: "M", label: "1M" },
  { id: "Y", label: "1A" },
  { id: "ALL", label: "TODO" },
];

export default function TimeframeSelector({
  selected,
  onChange,
  isLoading = false,
}: TimeframeSelectorProps) {
  return (
    <div className="flex justify-center w-full">
      <div className="inline-flex items-center gap-0.5 p-0.5 bg-white/[0.03] border border-white/[0.06] rounded-lg">
        {TIMEFRAMES.map((tf) => {
          const isSelected = selected === tf.id;
          return (
            <button
              key={tf.id}
              onClick={() => onChange(tf.id)}
              disabled={isLoading}
              className={`px-3.5 sm:px-4 py-1 text-xs font-mono font-medium rounded-md transition-all text-center min-w-[42px] min-h-[30px] flex items-center justify-center ${
                isSelected
                  ? "bg-white/[0.1] text-zinc-100 font-bold shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
              }`}
            >
              <span>{tf.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
