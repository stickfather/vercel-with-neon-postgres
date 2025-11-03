import type { VarianceRow } from "@/types/reports.learning";

const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  rows: VarianceRow[];
};

export function DurationVariance({ rows }: Props) {
  if (!rows.length) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200/70 bg-white/95 p-6 text-center text-sm text-slate-500">
        <h3 className="text-base font-semibold text-slate-600">Varianza en duración de lecciones (30 días)</h3>
        <p>No hay suficientes datos de sesiones para mostrar.</p>
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col gap-5 rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-slate-800">Varianza en duración de lecciones (30 días)</h3>
          <p className="text-sm text-slate-500">Irregularidad en duración de sesiones.</p>
        </div>
        <span className="text-xs text-slate-400" title="Irregularidad en duración de sesiones.">
          ℹ
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              <th className="py-2 pr-3">Nombre</th>
              <th className="py-2 pr-3">Lecciones (30 d)</th>
              <th className="py-2 pr-3">Min promedio</th>
              <th className="py-2">Desviación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {rows.map((row) => (
              <tr key={row.student_id} className="text-slate-700">
                <td className="py-2 pr-3 font-medium">{row.full_name}</td>
                <td className="py-2 pr-3">{integerFormatter.format(row.lessons_completed_30d)}</td>
                <td className="py-2 pr-3">{decimalFormatter.format(row.avg_minutes_per_lesson)} min</td>
                <td className="py-2">{decimalFormatter.format(row.lesson_minutes_stddev)} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
