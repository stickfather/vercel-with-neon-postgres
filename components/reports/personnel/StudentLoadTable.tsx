import type { StudentLoadPerTeacherRow } from "@/types/personnel";

const numberFormatter = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });

export function StudentLoadTable({ rows }: { rows: StudentLoadPerTeacherRow[] }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Carga por profesor</p>
          <p className="text-xs text-slate-500">Promedio de estudiantes atendidos por hora y por día</p>
        </div>
        <span className="text-xs text-slate-500">Top 25</span>
      </header>

      {!rows.length ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          No hay profesores con registros activos en el período consultado.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Profesor</th>
                <th className="px-4 py-3 text-right">Estudiantes / hora</th>
                <th className="px-4 py-3 text-right">Estudiantes / día</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.slice(0, 25).map((row) => (
                <tr key={row.teacherId}>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.teacherName}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {row.avgStudentsPerHour !== null ? `${numberFormatter.format(row.avgStudentsPerHour)} est.` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {row.avgStudentsPerDay !== null ? `${numberFormatter.format(row.avgStudentsPerDay)} est.` : "—"}
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
