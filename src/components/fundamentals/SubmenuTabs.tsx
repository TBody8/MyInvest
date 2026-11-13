"use client";

import { FundamentalSubmenuTab } from "@/types/fundamentals";

interface SubmenuTabsProps {
  activeTab: FundamentalSubmenuTab;
  onChangeTab: (tab: FundamentalSubmenuTab) => void;
}

const TABS: { id: FundamentalSubmenuTab; label: string }[] = [
  { id: "growth", label: "Crecimiento" },
  { id: "margins", label: "Márgenes" },
  { id: "cashflow", label: "Flujo de Caja" },
  { id: "balance", label: "Balance y Deuda" },
  { id: "valuation", label: "Valoración" },
];

export default function SubmenuTabs({
  activeTab,
  onChangeTab,
}: SubmenuTabsProps) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-0.5">
      <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-[#080b11]/80 border border-white/[0.08] backdrop-blur-md min-w-full sm:min-w-0 font-mono">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-white/[0.12] text-white border border-white/[0.2] shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
