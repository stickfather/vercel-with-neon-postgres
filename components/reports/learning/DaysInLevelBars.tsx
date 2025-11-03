import { DAYS_IN_LEVEL_TARGETS } from "@/src/features/reports/learning/constants";
import type { DaysInLevelRow } from "@/types/reports.learning";

const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  rows: DaysInLevelRow[];
};

export function DaysInLevelBars({ rows }: Props) {
  if (!rows.length) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200/70 bg-white/95 p-6 text-center text-sm text-slate-500">
        <h3 className="text-base font-semibold text-slate-600">Días promedio en el nivel (mediana)</h3>
        <p>Sin datos de permanencia por nivel.</p>
      </section>
    );
  }

  const sorted = [...rows].sort((a, b) => a.level.localeCompare(b.level, "es", { numeric: true }));
  const maxValue = Math.max(...sorted.map((row) => row.median_days_in_level));

  return (
    <section className="flex h-full flex-col gap-5 rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-slate-800">Días promedio en el nivel (mediana)</h3>
          <p className="text-sm text-slate-500">Medición de permanencia vs. objetivo recomendado.</p>
        </div>
        <span className="text-xs text-slate-400" title="Días promedio que permanecen los estudiantes antes de subir de nivel.">
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
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                    {row.level}
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Mediana</span>
                    <span className="text-base font-semibold text-slate-800">
                      {decimalFormatter.format(value)} días
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {integerFormatter.format(row.student_count)} estudiantes
                </div>
              </div>
              <div className="relative h-3 rounded-full bg-slate-100">
                <div className="absolute left-0 top-0 h-3 rounded-full bg-slate-600/80" style={{ width }} />
                {target ? (
                  <div
                    className="absolute top-1/2 h-6 w-[2px] -translate-y-1/2 bg-emerald-500"
                    style={{ left: maxValue > 0 ? `${Math.min(100, (target / maxValue) * 100)}%` : "0%" }}
                    title={`Objetivo ${target} días`}
                  />
                ) : null}
              </div>
              <div className="text-xs text-slate-500">
                Promedio: {decimalFormatter.format(row.avg_days_in_level)} días · Objetivo: {target ? `${target} días` : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
