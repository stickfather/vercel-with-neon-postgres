import type { PersonnelKpiSnapshot } from "@/types/personnel";

type KpiStripProps = {
  kpiSnapshot: PersonnelKpiSnapshot;
};

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}×`;
}

export function KpiStrip({ kpiSnapshot }: KpiStripProps) {
  const { bestCoveredHour, worstLoadHour, hoursAtRisk } = kpiSnapshot;

  return (
    <figure>
      <figcaption className="sr-only">
        Vista rápida que muestra la mejor hora cubierta, la peor hora de carga y las
        horas en riesgo con ratio de carga superior a 3.0×
      </figcaption>
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Best Covered Hour */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Mejor Hora Cubierta
          </span>
          <div className="flex items-baseline gap-2">
            {bestCoveredHour ? (
              <>
                <span className="text-2xl font-black text-slate-900">
                  {formatHour(bestCoveredHour.hour)}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                  {formatRatio(bestCoveredHour.ratio)}
                </span>
              </>
            ) : (
              <span className="text-2xl font-black text-slate-400">—</span>
            )}
          </div>
          <p className="text-xs text-slate-600">
            Hora con el ratio de carga docente más bajo
          </p>
        </div>

        {/* Worst Load Hour */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Peor Hora de Carga
          </span>
          <div className="flex items-baseline gap-2">
            {worstLoadHour ? (
              <>
                <span className="text-2xl font-black text-slate-900">
                  {formatHour(worstLoadHour.hour)}
                </span>
                <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">
                  {formatRatio(worstLoadHour.ratio)}
                </span>
              </>
            ) : (
              <span className="text-2xl font-black text-slate-400">—</span>
            )}
          </div>
          <p className="text-xs text-slate-600">
            Hora con el ratio de carga docente más alto
          </p>
        </div>

        {/* Hours at Risk */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Horas en Riesgo (&gt;3×)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {hoursAtRisk.toLocaleString("es-EC")}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                hoursAtRisk === 0
                  ? "bg-emerald-100 text-emerald-700"
                  : hoursAtRisk <= 2
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
              }`}
            >
              {hoursAtRisk === 0
                ? "Ninguna"
                : hoursAtRisk === 1
                  ? "1 hora"
                  : `${hoursAtRisk} horas`}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Horas con ratio de carga superior a 3.0×
          </p>
        </div>
      </div>
    </figure>
  );
}
