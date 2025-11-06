"use client";

import type { AgingBuckets } from "@/types/reports.finance";
import { useState } from "react";

const currencyFormatter = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  aging: AgingBuckets;
  onSegmentClick?: (segment: string) => void;
  variant?: "light" | "dark";
};

export function AgingBucketsCard({ aging, onSegmentClick, variant = "light" }: Props) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const isDark = variant === "dark";
  const cardClasses = isDark
    ? "rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm";
  const titleClasses = isDark ? "text-slate-100" : "text-slate-900";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const hintText = "text-slate-400";

  const segments = [
    { key: "0-30", label: "0-30d", amount: aging.amt_0_30, count: aging.cnt_0_30, color: "#10b981" },
    { key: "31-60", label: "31-60d", amount: aging.amt_31_60, count: aging.cnt_31_60, color: "#3b82f6" },
    { key: "61-90", label: "61-90d", amount: aging.amt_61_90, count: aging.cnt_61_90, color: "#f59e0b" },
    { key: "90+", label: ">90d", amount: aging.amt_over_90, count: aging.cnt_over_90, color: "#ef4444" },
  ];

  const maxAmount = Math.max(...segments.map((s) => s.amount), 1);

  return (
    <section className={cardClasses}>
      <header className="mb-4 flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${titleClasses}`}>Envejecimiento de saldos</h3>
        <span title="Distribución de saldos vencidos por antigüedad." className={`text-xs ${hintText}`}>
          ℹ
        </span>
      </header>

      <div className="mb-6 space-y-3">
        {segments.map((segment) => {
          const widthPercent = maxAmount > 0 ? (segment.amount / maxAmount) * 100 : 0;
          const isHovered = hoveredSegment === segment.key;

          return (
            <div
              key={segment.key}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredSegment(segment.key)}
              onMouseLeave={() => setHoveredSegment(null)}
              onClick={() => onSegmentClick?.(segment.key)}
            >
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className={secondaryText}>{segment.label}</span>
                <span className={`text-xs ${secondaryText}`}>
                  {currencyFormatter.format(segment.amount)} · {integerFormatter.format(segment.count)} facturas
                </span>
              </div>
              <div className="relative h-8 overflow-hidden rounded-lg bg-slate-100" style={isDark ? { backgroundColor: "#1e293b" } : {}}>
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: segment.color,
                    opacity: isHovered ? 1 : 0.85,
                    transform: isHovered ? "scaleY(1.05)" : "scaleY(1)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: isDark ? "#334155" : "#e2e8f0" }}>
        <div>
          <div className={`text-xs uppercase tracking-wider ${secondaryText}`}>Total vencido</div>
          <div className={`text-xl font-semibold ${titleClasses}`}>
            {currencyFormatter.format(aging.amt_total)}
          </div>
        </div>
        <div>
          <div className={`text-xs uppercase tracking-wider ${secondaryText}`}>Facturas vencidas</div>
          <div className={`text-xl font-semibold ${titleClasses}`}>
            {integerFormatter.format(aging.cnt_total)}
          </div>
        </div>
      </div>
    </section>
  );
}
