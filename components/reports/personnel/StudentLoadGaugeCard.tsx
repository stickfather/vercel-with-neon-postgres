import type { StudentLoadGauge } from "@/types/personnel";

const numberFormatter = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });

function getProgressColor(progress: number): string {
  if (progress <= 90) return "bg-emerald-500";
  if (progress <= 120) return "bg-amber-500";
  return "bg-rose-500";
}

export function StudentLoadGaugeCard({ gauge }: { gauge: StudentLoadGauge }) {
  const avg = gauge.avgStudentsPerTeacher;
  const target = gauge.targetStudentsPerTeacher;
  const progress = avg && target ? Math.min(160, (avg / target) * 100) : 0;
  const colorClass = getProgressColor(progress);

  return (
    <section className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <header>
        <p className="text-sm font-semibold text-slate-900">Carga promedio por profesor</p>
        <p className="text-xs text-slate-500">Estudiantes activos por bloque horario</p>
      </header>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-slate-900">
            {avg !== null ? numberFormatter.format(avg) : "—"}
          </span>
          <span className="text-sm font-medium text-slate-500">estudiantes / profesor</span>
        </div>
        <div className="text-xs text-slate-500">
          Meta sugerida: {target ? `${numberFormatter.format(target)} estudiantes` : "—"}
        </div>
        <div className="h-4 w-full rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${colorClass}`}
            style={{ width: `${Math.max(0, Math.min(160, progress))}%` }}
          />
        </div>
        <p className="text-xs text-slate-500">
          Profesores activos analizados: {gauge.teacherCount}
        </p>
      </div>
    </section>
  );
}
