const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  a7: number;
  a14: number;
  a30: number;
  a180: number;
  variant?: "light" | "dark";
};

export function ActiveFunnelCard({ a7, a14, a30, a180, variant = "light" }: Props) {
  const isDark = variant === "dark";
  const cardClasses = isDark
    ? "rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm";
  const titleClasses = isDark ? "text-slate-100" : "text-slate-900";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const hintText = "text-slate-400";

  const maxCount = Math.max(a7, a14, a30, a180, 1);

  const cohorts = [
    { label: "7 días", value: a7, color: "#10b981" },
    { label: "14 días", value: a14, color: "#3b82f6" },
    { label: "30 días", value: a30, color: "#8b5cf6" },
    { label: "180 días", value: a180, color: "#f59e0b" },
  ];

  return (
    <section className={cardClasses}>
      <header className="mb-4 flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${titleClasses}`}>Cohortes activas</h3>
        <span title="Alumnos activos en 7 / 14 / 30 / 180 días." className={`text-xs ${hintText}`}>
          ℹ
        </span>
      </header>

      <div className="space-y-4">
        {cohorts.map((cohort) => {
          const widthPct = (cohort.value / maxCount) * 100;
          return (
            <div key={cohort.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${secondaryText}`}>{cohort.label}</span>
                <span className={`text-sm font-bold ${titleClasses}`}>{integerFormatter.format(cohort.value)}</span>
              </div>
              <div className="relative h-8 rounded-lg bg-slate-200 dark:bg-slate-700">
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
        Mayor cohorte = {integerFormatter.format(maxCount)} alumnos
      </div>
    </section>
  );
}
