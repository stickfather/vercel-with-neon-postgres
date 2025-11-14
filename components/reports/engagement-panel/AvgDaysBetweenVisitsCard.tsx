import type { AvgDaysBetweenVisits } from "@/types/reports.engagement";

export function AvgDaysBetweenVisitsCard({ metric }: { metric: AvgDaysBetweenVisits }) {
  const value = metric.value;
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        Ritmo promedio
      </p>
      <h3 className="mt-2 text-2xl font-semibold text-slate-900">Días entre visitas</h3>
      <p className="mt-6 text-5xl font-black text-slate-900">
        {value === null ? "—" : value.toFixed(1)}
        <span className="ml-2 text-base font-semibold text-slate-500">días</span>
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Calculado con base en la media de los últimos 30 días.
      </p>
    </article>
  );
}
