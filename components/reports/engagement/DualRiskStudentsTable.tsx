import type { DualRiskStudent } from "@/types/reports.engagement";

const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Props = {
  data: DualRiskStudent[];
};

export function DualRiskStudentsTable({ data }: Props) {
  // Sort by dual-risk severity (higher days_since_last_checkin first)
  const sortedData = [...data].sort((a, b) => {
    const aVal = a.days_since_last_checkin ?? 0;
    const bVal = b.days_since_last_checkin ?? 0;
    return bVal - aVal;
  });

  return (
    <section className="rounded-2xl border border-rose-200/70 bg-rose-50/30 p-6 shadow-sm">
      <header className="mb-6">
        <h3 className="text-lg font-semibold text-rose-900">
          Estudiantes que Necesitan Apoyo en Engagement y Aprendizaje
        </h3>
        <p className="mt-1 text-xs text-rose-700">
          Alumnos con riesgo dual: compromiso bajo + aprendizaje lento/estancado
        </p>
      </header>

      {data.length === 0 ? (
        <div className="py-8 text-center text-sm text-rose-600">
          No hay alumnos con riesgo dual identificados
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rose-200">
                <th className="px-4 py-3 text-left font-semibold text-rose-900">
                  Alumno
                </th>
                <th className="px-4 py-3 text-left font-semibold text-rose-900">
                  Problema de engagement
                </th>
                <th className="px-4 py-3 text-left font-semibold text-rose-900">
                  Problema de aprendizaje
                </th>
                <th className="px-4 py-3 text-left font-semibold text-rose-900">
                  Último nivel
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row) => (
                <tr key={row.student_id} className="border-b border-rose-100 hover:bg-rose-50">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-rose-900">
                        {row.full_name || `Alumno ${row.student_id}`}
                      </span>
                      {row.days_since_last_checkin !== null && (
                        <span className="text-xs text-rose-600">
                          {decimalFormatter.format(row.days_since_last_checkin)} días sin visitar
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-rose-200 px-3 py-1 text-xs font-medium text-rose-800">
                      {row.engagement_issue}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-amber-200 px-3 py-1 text-xs font-medium text-amber-800">
                      {row.learning_issue}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-rose-700">
                    {row.level || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
