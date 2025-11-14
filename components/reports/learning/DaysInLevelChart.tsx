import type { DaysInLevelRow } from "@/types/reports.learning";

const daysFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const thresholds: Record<string, number> = {
  A1: 45,
  A2: 50,
  B1: 55,
  B2: 60,
  C1: 60,
};

type Props = {
  rows: DaysInLevelRow[];
};

export function DaysInLevelChart({ rows }: Props) {
  const sorted = [...rows].sort((a, b) => a.level.localeCompare(b.level, "es", { numeric: true }));
  const maxValue = sorted.length ? Math.max(...sorted.map((row) => row.medianDays)) : 0;

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-4 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Permanencia por nivel</p>
        <h3 className="text-xl font-semibold text-slate-900">Días promedio en cada nivel</h3>
      </header>
      {!sorted.length ? (
        <div className="flex h-32 items-center justify-center text-sm text-slate-500">
          No tenemos datos de permanencia en los niveles todavía.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map((row) => {
            const barWidth = maxValue > 0 ? Math.min(100, (row.medianDays / maxValue) * 100) : 0;
            const threshold = thresholds[row.level];
            const thresholdWidth = threshold && maxValue > 0 ? Math.min(100, (threshold / maxValue) * 100) : 0;
            return (
              <div key={row.level} className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                      {row.level}
                    </span>
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Mediana</span>
                      <span className="text-base font-semibold text-slate-900">
                        {daysFormatter.format(row.medianDays)} días
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{row.studentCount} estudiantes activos</div>
                </div>
                <div className="relative h-3 rounded-full bg-slate-100">
                  <div className="absolute left-0 top-0 h-3 rounded-full bg-slate-700/80" style={{ width: `${barWidth}%` }} />
                  {threshold ? (
                    <div
                      className="absolute top-1/2 h-6 w-[2px] -translate-y-1/2 bg-emerald-500"
                      style={{ left: `${thresholdWidth}%` }}
                      title={`Objetivo ${threshold} días`}
                    />
                  ) : null}
                </div>
                <div className="text-xs text-slate-500">
                  Promedio: {daysFormatter.format(row.avgDays)} días · Objetivo: {threshold ? `${threshold} días` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
