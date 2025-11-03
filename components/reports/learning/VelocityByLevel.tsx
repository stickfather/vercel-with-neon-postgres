import { VELOCITY_TARGETS } from "@/src/features/reports/learning/constants";
import type { VelocityLevel } from "@/types/reports.learning";

const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

type Props = {
  rows: VelocityLevel[];
};

function resolveColor(level: string, value: number) {
  const target = VELOCITY_TARGETS[level] ?? 1.2;
  if (value >= target) return "bg-emerald-500";
  if (value >= target * 0.85) return "bg-amber-400";
  return "bg-rose-500";
}

export function VelocityByLevel({ rows }: Props) {
  if (!rows.length) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200/70 bg-white/95 p-6 text-center text-sm text-slate-500">
        <h3 className="text-base font-semibold text-slate-600">
          Velocidad de finalización por nivel (lecciones/semana)
        </h3>
        <p>Sin datos para mostrar velocidad por nivel.</p>
      </section>
    );
  }

  const maxValue = Math.max(...rows.map((row) => row.lessons_per_week_per_student));

  return (
    <section className="flex h-full flex-col gap-5 rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-slate-800">
            Velocidad de finalización por nivel (lecciones/semana)
          </h3>
          <p className="text-sm text-slate-500">Promedio de lecciones completadas por semana.</p>
        </div>
        <span className="text-xs text-slate-400" title="Promedio de lecciones completadas por semana.">
          ℹ
        </span>
      </header>
      <div className="flex flex-col gap-4">
        {rows.map((row) => {
          const value = row.lessons_per_week_per_student;
          const target = VELOCITY_TARGETS[row.level] ?? 0;
          const width = maxValue > 0 ? `${Math.min(100, (value / maxValue) * 100)}%` : "0%";
          const barColor = resolveColor(row.level, value);
          return (
            <div key={row.level} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                    {row.level}
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Promedio / estudiante</span>
                    <span className="text-base font-semibold text-slate-800">
                      {decimalFormatter.format(value)}
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  Meta: {target ? `${decimalFormatter.format(target)}` : "—"}
                </div>
              </div>
              <div className="relative h-3 rounded-full bg-slate-100">
                <div className={`absolute left-0 top-0 h-3 rounded-full ${barColor}`} style={{ width }} />
                {target ? (
                  <div
                    className="absolute top-1/2 h-6 w-[2px] -translate-y-1/2 bg-slate-400/70"
                    style={{
                      left: maxValue > 0 ? `${Math.min(100, (target / maxValue) * 100)}%` : "0%",
                    }}
                  />
                ) : null}
              </div>
              <div className="text-xs text-slate-500">
                {decimalFormatter.format(row.lessons_per_week_total)} lecciones totales / semana · {row.active_students_level_30d} alumnos activos
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
