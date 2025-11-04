import type { InactiveCounts } from "@/types/reports.engagement";

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  counts: InactiveCounts;
  variant?: "light" | "dark";
};

export function InactiveCohortsCard({ counts, variant = "light" }: Props) {
  const isDark = variant === "dark";
  const cardClasses = isDark
    ? "rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm";
  const titleClasses = isDark ? "text-slate-100" : "text-slate-900";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const hintText = "text-slate-400";

  const cohorts = [
    { label: "Inactivos 7+ días", value: counts.inactive_7d_count, color: "#f59e0b", bucket: "inactive_7d" },
    { label: "Inactivos 14+ días", value: counts.inactive_14d_count, color: "#f97316", bucket: "inactive_14d" },
    { label: "Dormidos 30+ días", value: counts.dormant_30d_count, color: "#ef4444", bucket: "dormant_30d" },
    { label: "Inactivos 180+ días", value: counts.inactive_180d_count, color: "#991b1b", bucket: "long_term_inactive_180d" },
  ];

  const maxCount = Math.max(
    counts.inactive_7d_count,
    counts.inactive_14d_count,
    counts.dormant_30d_count,
    counts.inactive_180d_count,
    1
  );

  return (
    <section className={cardClasses}>
      <header className="mb-4 flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${titleClasses}`}>Inactivos</h3>
        <span title="Alumnos sin asistencias recientes (7+ / 14+ / 30+ / 180+)." className={`text-xs ${hintText}`}>
          ℹ
        </span>
      </header>

      <div className="space-y-4">
        {cohorts.map((cohort) => {
          const widthPct = (cohort.value / maxCount) * 100;
          return (
            <div key={cohort.bucket} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${secondaryText}`}>{cohort.label}</span>
                <span className={`text-sm font-bold ${titleClasses}`}>{integerFormatter.format(cohort.value)}</span>
              </div>
              <div className="relative h-8 rounded-lg bg-slate-200 dark:bg-slate-700 cursor-pointer hover:opacity-80 transition-opacity">
                <div
                  className="absolute left-0 top-0 h-full rounded-lg flex items-center justify-end pr-3"
                  style={{ width: `${widthPct}%`, backgroundColor: cohort.color }}
                >
                  <span className="text-xs font-semibold text-white">{integerFormatter.format(cohort.value)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`mt-4 pt-4 border-t text-xs ${secondaryText}`} style={{ borderColor: isDark ? "#334155" : "#e2e8f0" }}>
        Haz clic en una barra para ver el roster detallado (próximamente)
      </div>
    </section>
  );
}
