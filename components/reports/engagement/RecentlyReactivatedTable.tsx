import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { ReactivatedStudentRow } from "@/types/reports.engagement";

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  data: ReactivatedStudentRow[];
};

export function RecentlyReactivatedTable({ data }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          Recently Reactivated Students
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Alumnos que regresaron tras 14+ días de inactividad (últimos 14 días)
        </p>
      </header>

      {data.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500">
          No hay reactivaciones recientes en los últimos 14 días
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Alumno
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">
                  Días sin visitar antes de volver
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Fecha de retorno
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.student_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900">
                    {row.full_name || `Alumno ${row.student_id}`}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                      {integerFormatter.format(row.days_inactive_before_return)} días
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {format(parseISO(row.return_date), "d MMM yyyy", { locale: es })}
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
