import type { ZeroAttendanceRow } from "@/types/reports.engagement";

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-EC", { day: "2-digit", month: "short" });
}

export function ZeroAttendanceTable({ rows }: { rows: ZeroAttendanceRow[] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Onboarding</p>
          <h3 className="text-2xl font-semibold text-slate-900">Nunca asistieron</h3>
        </div>
        <span className="text-sm font-semibold text-slate-600">{rows.length} estudiantes</span>
      </div>
      {rows.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-3 font-semibold">Estudiante</th>
                <th className="pb-2 pr-3 font-semibold">Teléfono</th>
                <th className="pb-2 font-semibold">Inscripción</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 15).map((row) => (
                <tr key={row.studentId} className="border-t border-slate-100">
                  <td className="py-2 pr-3 font-medium text-slate-900">{row.fullName}</td>
                  <td className="py-2 pr-3 text-slate-600">{row.phone ?? "—"}</td>
                  <td className="py-2 text-slate-600">{formatDate(row.enrollmentDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Sin estudiantes pendientes de primera asistencia.</p>
      )}
    </section>
  );
}
