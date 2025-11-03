import { DAYS_IN_LEVEL_TARGETS } from "@/src/features/reports/learning/constants";
import type { DaysInLevelRow } from "@/types/reports.learning";

const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  rows: DaysInLevelRow[];
  variant?: "light" | "dark";
};

export function DaysInLevelBars({ rows, variant = "light" }: Props) {
  if (!rows.length) {
    const emptyClasses =
      variant === "dark"
        ? "flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-800/60 bg-slate-900/60 p-6 text-center text-sm text-slate-300"
        : "flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200/70 bg-white/95 p-6 text-center text-sm text-slate-500";
    const emptyTitle = variant === "dark" ? "text-base font-semibold text-slate-200" : "text-base font-semibold text-slate-600";
    return (
      <section className={emptyClasses}>
        <h3 className={emptyTitle}>Días promedio en el nivel (mediana)</h3>
        <p>Sin datos de permanencia por nivel.</p>
      </section>
    );
  }

  const sorted = [...rows].sort((a, b) => a.level.localeCompare(b.level, "es", { numeric: true }));
  const maxValue = Math.max(...sorted.map((row) => row.median_days_in_level));

  const isDark = variant === "dark";
  const sectionClasses = isDark
    ? "flex h-full flex-col gap-5 rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-sm text-slate-100"
    : "flex h-full flex-col gap-5 rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm";
  const titleClass = isDark ? "text-lg font-semibold text-slate-100" : "text-lg font-semibold text-slate-800";
  const descriptionClass = isDark ? "text-sm text-slate-400" : "text-sm text-slate-500";
  const infoIconClass = "text-xs text-slate-400";
  const levelBadge = isDark
    ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-100"
    : "inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700";
  const labelMuted = isDark ? "text-xs uppercase tracking-[0.24em] text-slate-400" : "text-xs uppercase tracking-[0.24em] text-slate-400";
  const valueClass = isDark ? "text-base font-semibold text-slate-100" : "text-base font-semibold text-slate-800";
  const countText = isDark ? "text-right text-xs text-slate-400" : "text-right text-xs text-slate-500";
  const barBackground = isDark ? "relative h-3 rounded-full bg-slate-800/70" : "relative h-3 rounded-full bg-slate-100";
  const barFill = isDark ? "absolute left-0 top-0 h-3 rounded-full bg-slate-200/80" : "absolute left-0 top-0 h-3 rounded-full bg-slate-600/80";
  const targetMarker = isDark ? "absolute top-1/2 h-6 w-[2px] -translate-y-1/2 bg-emerald-400" : "absolute top-1/2 h-6 w-[2px] -translate-y-1/2 bg-emerald-500";
  const footerText = isDark ? "text-xs text-slate-400" : "text-xs text-slate-500";

  return (
    <section className={sectionClasses}>
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className={titleClass}>Días promedio en el nivel (mediana)</h3>
          <p className={descriptionClass}>Medición de permanencia vs. objetivo recomendado.</p>
        </div>
        <span className={infoIconClass} title="Días promedio que permanecen los estudiantes antes de subir de nivel.">
          ℹ
        </span>
      </header>
      <div className="flex flex-col gap-4">
        {sorted.map((row) => {
          const value = row.median_days_in_level;
          const target = DAYS_IN_LEVEL_TARGETS[row.level] ?? 0;
          const width = maxValue > 0 ? `${Math.min(100, (value / maxValue) * 100)}%` : "0%";
          return (
            <div key={row.level} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={levelBadge}>{row.level}</span>
                  <div className="flex flex-col leading-tight">
                    <span className={labelMuted}>Mediana</span>
                    <span className={valueClass}>{decimalFormatter.format(value)} días</span>
                  </div>
                </div>
                <div className={countText}>{integerFormatter.format(row.student_count)} estudiantes</div>
              </div>
              <div className={barBackground}>
                <div className={barFill} style={{ width }} />
                {target ? (
                  <div
                    className={targetMarker}
                    style={{ left: maxValue > 0 ? `${Math.min(100, (target / maxValue) * 100)}%` : "0%" }}
                    title={`Objetivo ${target} días`}
                  />
                ) : null}
              </div>
              <div className={footerText}>
                Promedio: {decimalFormatter.format(row.avg_days_in_level)} días · Objetivo: {target ? `${target} días` : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
