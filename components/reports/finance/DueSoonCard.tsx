"use client";

import type { DueSoonSummary, DueSoonPoint } from "@/types/reports.finance";
import { useState } from "react";

const currencyFormatter = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  summary: DueSoonSummary;
  series: DueSoonPoint[];
  onViewListClick?: () => void;
  variant?: "light" | "dark";
};

export function DueSoonCard({ summary, series, onViewListClick, variant = "light" }: Props) {
  const isDark = variant === "dark";
  const cardClasses = isDark
    ? "rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm";
  const titleClasses = isDark ? "text-slate-100" : "text-slate-900";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const hintText = "text-slate-400";
  const tileClasses = isDark
    ? "rounded-lg border border-slate-700/60 bg-slate-800/70 p-3"
    : "rounded-lg border border-slate-200/70 bg-slate-50 p-3";

  const hasData = summary.invoices_due_7d > 0 || summary.amount_due_7d > 0;
  const maxAmount = Math.max(...series.map((p) => p.amount), 1);
  const barColor = "#3b82f6"; // blue
  const gridColor = isDark ? "#334155" : "#e2e8f0";

  return (
    <section className={cardClasses}>
      <header className="mb-4 flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${titleClasses}`}>Vence pronto (7 días)</h3>
        <span title="Facturas y montos que vencen en los próximos 7 días." className={`text-xs ${hintText}`}>
          ℹ
        </span>
      </header>

      {/* Summary tiles */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className={tileClasses}>
          <div className={`text-xs uppercase tracking-wider ${secondaryText}`}>Total 7 días</div>
          <div className={`text-lg font-semibold ${titleClasses}`}>
            {currencyFormatter.format(summary.amount_due_7d)}
          </div>
        </div>
        <div className={tileClasses}>
          <div className={`text-xs uppercase tracking-wider ${secondaryText}`}>Hoy</div>
          <div className={`text-lg font-semibold ${titleClasses}`}>
            {currencyFormatter.format(summary.amount_due_today)}
          </div>
        </div>
        <div className={tileClasses}>
          <div className={`text-xs uppercase tracking-wider ${secondaryText}`}>Facturas 7 días</div>
          <div className={`text-lg font-semibold ${titleClasses}`}>
            {integerFormatter.format(summary.invoices_due_7d)}
          </div>
        </div>
        <div className={tileClasses}>
          <div className={`text-xs uppercase tracking-wider ${secondaryText}`}>Alumnos 7 días</div>
          <div className={`text-lg font-semibold ${titleClasses}`}>
            {integerFormatter.format(summary.students_due_7d)}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      {!hasData || series.length === 0 ? (
        <div className={`flex h-40 items-center justify-center ${secondaryText} text-sm`}>
          Sin vencimientos próximos (7 días)
        </div>
      ) : (
        <div className="mb-4 relative" style={{ height: "160px" }}>
          <svg width="100%" height="100%" viewBox="0 0 800 160" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map((i) => {
              const y = (i / 4) * 160;
              return <line key={`grid-${i}`} x1="0" y1={y} x2="800" y2={y} stroke={gridColor} strokeWidth="1" strokeDasharray="4 4" />;
            })}

            {/* Bars */}
            {series.map((point, i) => {
              const barWidth = 800 / Math.max(series.length, 1) - 10;
              const x = (i / Math.max(series.length, 1)) * 800 + 5;
              const heightPercent = maxAmount > 0 ? (point.amount / maxAmount) : 0;
              const barHeight = heightPercent * 140;
              const y = 160 - barHeight;

              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={barColor}
                    opacity="0.85"
                    rx="3"
                  />
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Button */}
      <button
        onClick={onViewListClick}
        disabled={!hasData}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
          hasData
            ? isDark
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-blue-600 text-white hover:bg-blue-700"
            : "cursor-not-allowed bg-slate-300 text-slate-500"
        }`}
      >
        Ver lista
      </button>
    </section>
  );
}
