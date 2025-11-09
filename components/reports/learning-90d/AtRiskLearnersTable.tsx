"use client";

import type { AtRiskLearner } from "@/types/learning-panel";

type Props = {
  data: AtRiskLearner[];
};

const numberFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function AtRiskLearnersTable({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Estudiantes en Riesgo de Aprendizaje (90d)
        </h3>
        <div className="flex h-32 items-center justify-center text-slate-500">
          No se encontraron estudiantes en riesgo.
        </div>
      </section>
    );
  }

  const getReasonChip = (reason: string) => {
    const configs = {
      both: { label: "Ambos", bg: "bg-rose-100", text: "text-rose-800" },
      low_lei: { label: "LEI Bajo", bg: "bg-amber-100", text: "text-amber-800" },
      long_gap: { label: "Brecha Larga", bg: "bg-slate-100", text: "text-slate-800" },
    };
    const config = configs[reason as keyof typeof configs] || configs.long_gap;
    return (
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        Estudiantes en Riesgo de Aprendizaje (90d)
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-3 pr-3">Estudiante</th>
              <th className="py-3 pr-3">Nivel</th>
              <th className="py-3 pr-3 text-right">LEI (90d)</th>
              <th className="py-3 pr-3 text-right">Días Sin Progreso</th>
              <th className="py-3">Razón</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((learner) => (
              <tr
                key={learner.student_id}
                className="hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => {
                  // Navigate to student profile
                  window.location.href = `/administracion/gestion-estudiantes/${learner.student_id}`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    window.location.href = `/administracion/gestion-estudiantes/${learner.student_id}`;
                  }
                }}
                tabIndex={0}
                role="button"
              >
                <td className="py-3 pr-3 font-medium text-slate-900">
                  {learner.full_name}
                </td>
                <td className="py-3 pr-3 text-slate-700">{learner.level}</td>
                <td className="py-3 pr-3 text-right text-slate-900">
                  {learner.lei_90d !== null ? numberFormatter.format(learner.lei_90d) : "—"}
                </td>
                <td className="py-3 pr-3 text-right text-slate-900">
                  {learner.days_since_last_completed_lesson}
                </td>
                <td className="py-3">{getReasonChip(learner.reason)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mt-4 text-xs text-slate-500">
        Students identified as at-risk based on low LEI (&lt;0.5) and/or long gap since last completion (&gt;14 days). Click to view profile. Last 90 days.
      </figcaption>
    </section>
  );
}
