import type { AttentionStudentRow } from "@/types/reports.examenes-instructivos";

type Props = {
  data: AttentionStudentRow[];
};

export function StrugglingStudentsTable({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Estudiantes que Requieren Atención (últimos 180 días)
        </h3>
        <div className="flex h-32 items-center justify-center text-slate-500">
          No hay estudiantes que requieran atención en este momento.
        </div>
      </section>
    );
  }

  const getSeverityChip = (row: AttentionStudentRow) => {
    const overdue = row.overdueInstructivos > 0;
    const pending = row.pendingInstructivos > 0;
    const fails = row.fails90d >= 2;

    if (overdue) {
      return (
        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
          Instructivo vencido
        </span>
      );
    }
    if (pending && fails) {
      return (
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
          Reprobaciones + instructivos
        </span>
      );
    }
    if (fails) {
      return (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
          Múltiples reprobaciones
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
        Seguimiento
      </span>
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        Estudiantes que Requieren Atención (últimos 180 días)
        <span className="ml-2 text-xs font-normal text-slate-500">
          • Top 20 por factores de riesgo
        </span>
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Estudiante
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Nivel × Examen
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">
                Reprobados (90d)
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">
                Instructivos pendientes
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">
                Instructivos vencidos
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Último examen
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Riesgo
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((student, idx) => (
              <tr
                key={`${student.studentId ?? idx}`}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="px-3 py-3 font-medium text-slate-900">
                  {student.studentName || `Student #${student.studentId}`}
                </td>
                <td className="px-3 py-3 text-slate-700">
                  {student.level || "—"} · {student.examType || "General"}
                </td>
                <td className="px-3 py-3 text-right text-slate-700">
                  {student.fails90d}
                </td>
                <td className="px-3 py-3 text-right text-slate-700">
                  {student.pendingInstructivos}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-rose-600">
                  {student.overdueInstructivos}
                </td>
                <td className="px-3 py-3 text-slate-700">
                  {student.lastExamDate
                    ? new Date(student.lastExamDate).toLocaleDateString("es-EC", {
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </td>
                <td className="px-3 py-3">{getSeverityChip(student)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
