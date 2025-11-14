import type { InactivityTables } from "@/types/reports.engagement";

const TABLE_CONFIG: Array<{
  key: keyof InactivityTables;
  title: string;
  accent: string;
  description: string;
}> = [
  {
    key: "inactive7d",
    title: "7+ días sin asistir",
    accent: "border-sky-200 bg-sky-50",
    description: "Contactar en las próximas 24 horas",
  },
  {
    key: "inactive14d",
    title: "14+ días sin asistir",
    accent: "border-amber-200 bg-amber-50",
    description: "Escalar a llamada del coordinador",
  },
  {
    key: "dormant30d",
    title: "30+ días sin asistir",
    accent: "border-rose-200 bg-rose-50",
    description: "Preparar plan de reactivación",
  },
  {
    key: "longTerm180d",
    title: "180+ días sin asistir",
    accent: "border-slate-200 bg-slate-50",
    description: "Revisión para depuración",
  },
];

function formatDays(value: number | null): string {
  if (value === null) return "—";
  return `${value} d`; // d = días
}

export function InactivityTables({ tables }: { tables: InactivityTables }) {
  return (
    <div className="flex flex-col gap-4">
      {TABLE_CONFIG.map((config) => {
        const rows = tables[config.key];
        return (
          <section
            key={config.key}
            className={`rounded-2xl border ${config.accent} p-4`}
          >
            <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{config.title}</h3>
                <p className="text-xs text-slate-500">{config.description}</p>
              </div>
              <span className="text-sm font-semibold text-slate-600">
                {rows.length} estudiantes
              </span>
            </header>

            {rows.length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-2 pr-3 font-semibold">Estudiante</th>
                      <th className="pb-2 pr-3 font-semibold">Teléfono</th>
                      <th className="pb-2 pr-3 font-semibold">Última visita</th>
                      <th className="pb-2 font-semibold text-right">Días</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row) => (
                      <tr key={`${config.key}-${row.studentId}`} className="border-t border-white/40">
                        <td className="py-2 pr-3 font-medium text-slate-900">{row.fullName}</td>
                        <td className="py-2 pr-3 text-slate-600">{row.phone ?? "—"}</td>
                        <td className="py-2 pr-3 text-slate-600">{row.lastVisitDate ?? "Sin registro"}</td>
                        <td className="py-2 text-right font-semibold text-slate-900">{formatDays(row.daysSinceLastVisit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No hay estudiantes en este grupo.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
