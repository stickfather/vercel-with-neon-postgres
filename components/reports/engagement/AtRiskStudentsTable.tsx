import type { StudentActivityRow } from "@/types/reports.engagement";

const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Props = {
  data: StudentActivityRow[];
};

export function AtRiskStudentsTable({ data }: Props) {
  // Take top 50, sorted by days_since_last_checkin desc
  const topRisk = data.slice(0, 50);

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          Estudiantes en Riesgo (baja actividad)
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          50 alumnos con mayor riesgo de abandono
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
                Días sin visitar
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">
                Prom. días entre visitas
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Último nivel
              </th>
            </tr>
          </thead>
          <tbody>
            {topRisk.map((row) => {
              const isHighRisk = (row.days_since_last_checkin ?? 0) >= 30;
              return (
                <tr key={row.student_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900">
                    {row.full_name || `Alumno ${row.student_id}`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-block ${
                        isHighRisk ? "font-semibold text-rose-600" : "text-slate-900"
                      }`}
                    >
                      {row.days_since_last_checkin !== null
                        ? decimalFormatter.format(row.days_since_last_checkin)
                        : "—"}
                    </span>
                    {isHighRisk && (
                      <span className="ml-2 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                        Alto riesgo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {row.avg_days_between_visits !== null
                      ? decimalFormatter.format(row.avg_days_between_visits)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.level || "—"}
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
