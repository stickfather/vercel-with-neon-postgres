import type { AtRiskLearnerRow } from "@/types/reports.learning";

const leiFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const daysFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  rows: AtRiskLearnerRow[];
};

export function AtRiskLearnersTable({ rows }: Props) {
  return (
    <section className="rounded-2xl border border-rose-200/60 bg-white/95 p-6 shadow-sm">
      <header className="mb-4 flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-600">Alumnos en riesgo</p>
        <h3 className="text-xl font-semibold text-rose-900">Bottom 20% por nivel</h3>
        <p className="text-sm text-rose-800">
          Revisar estos estudiantes de inmediato para evitar estancamiento o abandono.
        </p>
      </header>
      {rows.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-rose-700">
          Ningún estudiante aparece en la zona de riesgo.
        </div>
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-rose-500">
                <th className="py-3">Estudiante</th>
                <th className="py-3">Nivel</th>
                <th className="py-3">LEI 30d</th>
                <th className="py-3">Días sin visitar</th>
                <th className="py-3">Acción recomendada</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.studentId} className="border-t border-rose-100/70">
                  <td className="py-3 font-semibold text-rose-900">{row.fullName}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                      {row.level}
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-rose-800">{leiFormatter.format(row.lei30d)}</td>
                  <td className="py-3 text-rose-800">
                    {row.daysSinceLastVisit === null ? "—" : `${daysFormatter.format(row.daysSinceLastVisit)} días`}
                  </td>
                  <td className="py-3 font-medium text-rose-900">{row.recommendedAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
