import type { VarianceRow } from "@/types/reports.learning";

const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  rows: VarianceRow[];
  variant?: "light" | "dark";
};

export function DurationVariance({ rows, variant = "light" }: Props) {
  // Limit to top 20 by variance (descending)
  const topRows = [...rows]
    .sort((a, b) => (b.lesson_minutes_stddev ?? 0) - (a.lesson_minutes_stddev ?? 0))
    .slice(0, 20);

  if (!topRows.length) {
    const emptyClasses =
      variant === "dark"
        ? "flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-800/60 bg-slate-900/60 p-6 text-center text-sm text-slate-300"
        : "flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200/70 bg-white/95 p-6 text-center text-sm text-slate-500";
    const emptyTitle = variant === "dark" ? "text-base font-semibold text-slate-200" : "text-base font-semibold text-slate-600";
    return (
      <section className={emptyClasses}>
        <h3 className={emptyTitle}>Varianza en duración de lecciones (30 días)</h3>
        <p>No hay suficientes datos de sesiones para mostrar.</p>
      </section>
    );
  }

  const isDark = variant === "dark";
  const sectionClasses = isDark
    ? "flex h-full flex-col gap-5 rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-sm text-slate-100"
    : "flex h-full flex-col gap-5 rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm";
  const titleClass = isDark ? "text-lg font-semibold text-slate-100" : "text-lg font-semibold text-slate-800";
  const descriptionClass = isDark ? "text-sm text-slate-400" : "text-sm text-slate-500";
  const infoIconClass = "text-xs text-slate-400";
  const tableDivider = isDark ? "divide-y divide-slate-800/60" : "divide-y divide-slate-100";
  const tableBodyDivider = isDark ? "divide-y divide-slate-800/60" : "divide-y divide-slate-100/80";
  const rowClass = isDark ? "text-slate-200" : "text-slate-700";

  return (
    <section className={sectionClasses}>
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className={titleClass}>Varianza en duración de lecciones (30 días)</h3>
          <p className={descriptionClass}>Top 20 estudiantes por irregularidad en duración de sesiones.</p>
        </div>
        <span className={infoIconClass} title="Desviación estándar de minutos por lección.">
          ℹ
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className={`min-w-full ${tableDivider} text-sm`}>
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              <th className="py-2 pr-3">Estudiante</th>
              <th className="py-2 pr-3 text-right">Varianza (min)</th>
              <th className="py-2 pr-3 text-right">Promedio (min)</th>
              <th className="py-2 text-right">Sesiones</th>
            </tr>
          </thead>
          <tbody className={tableBodyDivider}>
            {topRows.map((row) => (
              <tr key={row.student_id} className={rowClass}>
                <td className="py-2 pr-3 font-medium">{row.full_name}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{decimalFormatter.format(row.lesson_minutes_stddev)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{decimalFormatter.format(row.avg_minutes_per_lesson)}</td>
                <td className="py-2 text-right tabular-nums">{integerFormatter.format(row.lessons_completed_30d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
