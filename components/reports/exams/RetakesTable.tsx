import type { RepeatExamRow } from "@/types/reports.examenes-instructivos";

type Props = {
  data: RepeatExamRow[];
};

export function RetakesTable({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Resumen de Repitencias (90d)
        </h3>
        <div className="flex h-32 items-center justify-center text-slate-500">
          No hay datos de repitencias en los últimos 90 días.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        Resumen de Repitencias (90d)
        <span className="ml-2 text-xs font-normal text-slate-500">
          • Muestra reprobados de los últimos 90 días y sus repitencias
        </span>
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Estudiante
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Tipo de Examen
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Nivel
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Repitencias
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                ΔPromedio Puntaje
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">
                Días promedio a repetir
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={`${row.studentId ?? idx}-${row.examType}-${row.level}-${idx}`}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="px-3 py-3 text-slate-900">
                  {row.studentName || `ID ${row.studentId}`}
                </td>
                <td className="px-3 py-3 text-slate-700">{row.examType}</td>
                <td className="px-3 py-3 text-slate-700">{row.level}</td>
                <td className="px-3 py-3 text-slate-700">
                  {row.retakeCount}
                </td>
                <td className={`px-3 py-3 text-slate-700 ${
                  row.scoreDelta !== null && row.scoreDelta >= 5
                    ? "text-emerald-600"
                    : row.scoreDelta !== null && row.scoreDelta < 0
                      ? "text-rose-600"
                      : ""
                }`}>
                  {row.scoreDelta !== null ? `${row.scoreDelta.toFixed(1)} pts` : "—"}
                </td>
                <td className="px-3 py-3 text-right text-slate-700">
                  {row.daysToRetakeAvg !== null ? `${row.daysToRetakeAvg.toFixed(1)} días` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
