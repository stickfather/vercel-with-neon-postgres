import type { StudentActivityRow } from "@/types/reports.engagement";

const integerFormatter = new Intl.NumberFormat("es-EC");
const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Props = {
  data: StudentActivityRow[];
};

export function HighEngagementStudentsTable({ data }: Props) {
  // Take top 50 by consistency score or sessions
  const topEngaged = data.slice(0, 50);

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          Estudiantes con Alta Consistencia de Engagement (Top 10%)
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Alumnos con alta consistencia que pueden impulsar la comunidad
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Alumno
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">
                Asistencias 30d
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">
                Días sin visitar
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">
                Consistencia Score
              </th>
            </tr>
          </thead>
          <tbody>
            {topEngaged.map((row) => {
              const isPotentialAmbassador = (row.consistency_score ?? 0) >= 85;
              return (
                <tr key={row.student_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900">
                        {row.full_name || `Alumno ${row.student_id}`}
                      </span>
                      {isPotentialAmbassador && (
                        <span className="inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          Embajador potencial
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {integerFormatter.format(row.sessions_30d)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {row.days_since_last_checkin !== null
                      ? decimalFormatter.format(row.days_since_last_checkin)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.consistency_score !== null ? (
                      <span
                        className={`inline-block font-semibold ${
                          row.consistency_score >= 85
                            ? "text-emerald-600"
                            : row.consistency_score >= 70
                            ? "text-sky-600"
                            : "text-slate-900"
                        }`}
                      >
                        {integerFormatter.format(row.consistency_score)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
