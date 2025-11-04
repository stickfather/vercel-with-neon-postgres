"use client";

import { useEffect, useState } from "react";
import type { LearningReport, SpeedBucketRow } from "@/types/reports.learning";

const numberFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const percentileFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const DONUT_COLORS = {
  fast: "#059669",
  typical: "#0ea5e9",
  slow: "#f97316",
} as const;

type Props = {
  buckets: LearningReport["speed_buckets"];
  variant?: "light" | "dark";
};

function formatLei(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return numberFormatter.format(value);
}

function formatDays(value: unknown) {
  if (value === null || value === undefined) return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return `${Math.round(parsed)} d`;
}

function sortBucket(rows: SpeedBucketRow[]) {
  return [...rows].sort((a, b) => (b.lei_30d_plan ?? 0) - (a.lei_30d_plan ?? 0));
}

const STORAGE_KEY = "salc.learning.ritmo.openKeys";

function loadOpenState(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // ignore parse errors
  }
  return new Set();
}

function saveOpenState(keys: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    // ignore storage errors
  }
}

export function SpeedBuckets({ buckets, variant = "light" }: Props) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => loadOpenState());

  useEffect(() => {
    saveOpenState(openKeys);
  }, [openKeys]);

  const toggleOpen = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  const totalRows = buckets.fast.length + buckets.typical.length + buckets.slow.length;
  if (totalRows === 0) {
    const emptyClasses =
      variant === "dark"
        ? "flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-800/60 bg-slate-900/60 p-6 text-center text-sm text-slate-300"
        : "flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200/70 bg-white/95 p-6 text-center text-sm text-slate-500";
    const emptyTitle = variant === "dark" ? "text-base font-semibold text-slate-200" : "text-base font-semibold text-slate-600";
    return (
      <section className={emptyClasses}>
        <h3 className={emptyTitle}>Ritmo de aprendizaje (Rápidos / Típicos / Lentos)</h3>
        <p>No hay datos suficientes para mostrar los grupos de velocidad.</p>
      </section>
    );
  }

  const segments = [
    { key: "fast", value: buckets.proportions.fast_pct, label: "Rápidos" },
    { key: "typical", value: buckets.proportions.typical_pct, label: "Típicos" },
    { key: "slow", value: buckets.proportions.slow_pct, label: "Lentos" },
  ] as const;

  const circumference = 2 * Math.PI * 45;
  let offset = circumference * 0.25;

  const hasDaysColumn = [buckets.fast, buckets.typical, buckets.slow].some((group) =>
    group.some((row) => {
      const enriched = row as SpeedBucketRow & { days_since_progress?: number | null };
      return "days_since_progress" in enriched && enriched.days_since_progress != null;
    }),
  );

  const groups = [
    {
      key: "fast" as const,
      title: `Rápidos (${buckets.fast.length})`,
      subtitle: "≥75%",
      description: "Alumnos en percentil igual o superior a 75.",
      rows: sortBucket(buckets.fast),
    },
    {
      key: "typical" as const,
      title: `Típicos (${buckets.typical.length})`,
      subtitle: "25–74%",
      description: "Alumnos en percentiles medios.",
      rows: sortBucket(buckets.typical),
    },
    {
      key: "slow" as const,
      title: `Lentos (${buckets.slow.length})`,
      subtitle: "<25%",
      description: "Alumnos que necesitan apoyo adicional.",
      rows: sortBucket(buckets.slow),
    },
  ];

  const isDark = variant === "dark";
  const cardClasses = isDark
    ? "flex h-full flex-col gap-6 rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-sm text-slate-100"
    : "flex h-full flex-col gap-6 rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm";
  const titleClass = isDark ? "text-lg font-semibold text-slate-100" : "text-lg font-semibold text-slate-800";
  const descriptionClass = isDark ? "text-sm text-slate-400" : "text-sm text-slate-500";
  const infoIconClass = isDark ? "text-xs text-slate-400" : "text-xs text-slate-400";
  const legendTextClass = isDark ? "text-slate-200" : "text-slate-700";
  const legendStrongClass = isDark ? "text-slate-100" : "text-slate-800";
  const accordionClasses = isDark
    ? "group overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/60 shadow-sm transition-all duration-200"
    : "group overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 shadow-sm transition-all duration-200";
  const accordionTitle = isDark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-slate-800";
  const accordionSubtitle = isDark ? "text-xs font-medium text-slate-400" : "text-xs font-medium text-slate-500";
  const accordionDescription = isDark ? "text-xs text-slate-400" : "text-xs text-slate-500";
  const accordionChevron = isDark ? "text-slate-500 transition-transform duration-200" : "text-slate-400 transition-transform duration-200";
  const tableDivider = isDark ? "divide-y divide-slate-800/60" : "divide-y divide-slate-100";
  const tableBodyDivider = isDark ? "divide-y divide-slate-800/60" : "divide-y divide-slate-100/80";
  const tableHeader = isDark
    ? "text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400"
    : "text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400";
  const tableRow = isDark ? "text-slate-200" : "text-slate-700";
  const tableEmptyText = isDark ? "py-4 text-center text-xs text-slate-500" : "py-4 text-center text-xs text-slate-400";
  const tableCell = isDark ? "py-2 pr-3" : "py-2 pr-3";
  const tableLeiClass = isDark ? "py-2 pr-3 text-slate-100" : "py-2 pr-3";
  const tableDaysClass = isDark ? "py-2 text-slate-200" : "py-2";
  const donutOuter = isDark ? "#111827" : "#f8fafc";
  const donutInner = isDark ? "#0b1220" : "white";
  const donutText = isDark ? "fill-slate-100" : "fill-slate-700";

  return (
    <section className={cardClasses}>
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className={titleClass}>Ritmo de aprendizaje (Rápidos / Típicos / Lentos)</h3>
          <p className={descriptionClass}>Distribución de alumnos por percentil LEI reciente.</p>
        </div>
        <span className={infoIconClass} title="LEI reciente por percentil. Rápidos = ≥ 75%.">
          ℹ
        </span>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
        <div className="flex flex-col items-center gap-4">
          <svg viewBox="0 0 120 120" className="h-44 w-44">
            <circle cx="60" cy="60" r="45" fill={donutOuter} />
            {segments.map((segment) => {
              const dash = (segment.value / 100) * circumference;
              const circle = (
                <circle
                  key={segment.key}
                  cx="60"
                  cy="60"
                  r="45"
                  fill="transparent"
                  stroke={DONUT_COLORS[segment.key]}
                  strokeWidth={16}
                  strokeDasharray={`${dash} ${circumference}`}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              );
              offset -= dash;
              return circle;
            })}
            <circle cx="60" cy="60" r="32" fill={donutInner} />
            <text x="60" y="64" textAnchor="middle" className={`${donutText} text-lg font-semibold`}>
              {percentileFormatter.format(
                buckets.proportions.fast_pct + buckets.proportions.typical_pct + buckets.proportions.slow_pct,
              )}%
            </text>
          </svg>
          <div className={`flex items-center gap-4 text-sm ${legendTextClass}`}>
            {segments.map((segment) => (
              <div key={segment.key} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: DONUT_COLORS[segment.key] }}
                />
                <span>{segment.label}</span>
                <strong className={legendStrongClass}>{percentileFormatter.format(segment.value)}%</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-4">
          {groups.map((group) => {
            const isOpen = openKeys.has(group.key);
            return (
              <div key={group.key} className={accordionClasses}>
                <button
                  type="button"
                  onClick={() => toggleOpen(group.key)}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className={accordionTitle}>{group.title}</span>
                      <span className={accordionSubtitle}>{group.subtitle}</span>
                    </div>
                  </div>
                  <span className={`${accordionChevron} ${isOpen ? "rotate-180" : ""}`}>
                    ⌃
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all duration-200"
                  style={{
                    maxHeight: isOpen ? "1000px" : "0px",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div className="px-4 pb-4">
                    <p className={`${accordionDescription} mb-3`}>{group.description}</p>
                    <div className="overflow-x-auto">
                      <table className={`min-w-full ${tableDivider} text-sm`}>
                        <thead>
                          <tr className={tableHeader}>
                            <th className="py-2 pr-3">Nombre</th>
                            <th className="py-2 pr-3">Nivel</th>
                            <th className="py-2 pr-3">Lección</th>
                            <th className="py-2 pr-3">LEI</th>
                            {hasDaysColumn ? <th className="py-2">Días sin progreso</th> : null}
                          </tr>
                        </thead>
                        <tbody className={tableBodyDivider}>
                          {group.rows.length === 0 ? (
                            <tr>
                              <td colSpan={hasDaysColumn ? 5 : 4} className={tableEmptyText}>
                                Sin alumnos en este grupo.
                              </td>
                            </tr>
                          ) : (
                            group.rows.map((row) => {
                              const lessonLabel = row.current_seq != null ? `L${row.current_seq}` : "—";
                              const daysSince =
                                hasDaysColumn && "days_since_progress" in row
                                  ? formatDays((row as SpeedBucketRow & { days_since_progress?: number | null }).days_since_progress)
                                  : "";
                              return (
                                <tr key={`${row.student_id}-${row.speed_bucket}`} className={tableRow}>
                                  <td className={`${tableCell} font-medium`}>{row.full_name ?? "Sin nombre"}</td>
                                  <td className={tableCell}>{row.level ?? "—"}</td>
                                  <td className={tableCell}>{lessonLabel}</td>
                                  <td className={tableLeiClass}>{formatLei(row.lei_30d_plan)}</td>
                                  {hasDaysColumn ? <td className={tableDaysClass}>{daysSince || "—"}</td> : null}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
