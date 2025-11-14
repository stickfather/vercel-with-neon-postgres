import type { InstructivosSummary } from "@/types/reports.examenes-instructivos";

type Props = {
  summary: InstructivosSummary;
};

export function InstructiveComplianceCard({ summary }: Props) {
  const assigned = summary.assigned90d ?? null;
  const completionRate = summary.completionRate90d ?? null;
  const medianDays = summary.medianCompletionDays ?? null;

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Instructivos (últimos 90 días)
        </h3>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-100/80 bg-slate-50/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Asignados</p>
          <p className="text-2xl font-semibold text-slate-900">
            {assigned !== null ? assigned.toLocaleString("es-EC") : "—"}
          </p>
          <p className="text-[11px] text-slate-500">Tras exámenes reprobados</p>
        </article>
        <article className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
          <p className="text-xs uppercase tracking-wide text-emerald-600">Tasa de cumplimiento</p>
          <p className="text-2xl font-semibold text-emerald-700">
            {completionRate !== null ? `${completionRate.toFixed(1)}%` : "—"}
          </p>
          <p className="text-[11px] text-emerald-700/80">Dentro de 90 días</p>
        </article>
        <article className="rounded-xl border border-sky-100 bg-sky-50/70 p-3">
          <p className="text-xs uppercase tracking-wide text-sky-600">Mediana de días</p>
          <p className="text-2xl font-semibold text-sky-700">
            {medianDays !== null ? Math.round(medianDays) : "—"}
            <span className="ml-1 text-xs font-medium text-slate-500">días</span>
          </p>
          <p className="text-[11px] text-slate-500">De asignación a cierre</p>
        </article>
      </div>
    </section>
  );
}
