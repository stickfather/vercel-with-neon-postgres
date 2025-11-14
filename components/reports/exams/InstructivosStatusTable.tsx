import type { InstructivoStatusRow } from "@/types/reports.examenes-instructivos";

type Props = {
  title: string;
  subtitle: string;
  rows: InstructivoStatusRow[];
  accent: "rose" | "amber";
};

const accentClasses: Record<Props["accent"], string> = {
  rose: "border-rose-200 bg-rose-50/80 text-rose-700",
  amber: "border-amber-200 bg-amber-50/80 text-amber-700",
};

export function InstructivosStatusTable({ title, subtitle, rows, accent }: Props) {
  const accentClass = accentClasses[accent];

  if (!rows || rows.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
        <p className="mt-4 text-sm text-slate-500">Sin registros en este momento.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-4">
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${accentClass}`}>
          <span>{title}</span>
        </div>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-600">
              <th className="px-3 py-2 font-semibold">Estudiante</th>
              <th className="px-3 py-2 font-semibold">Nivel</th>
              <th className="px-3 py-2 font-semibold">Tipo examen</th>
              <th className="px-3 py-2 font-semibold">Asignado</th>
              <th className="px-3 py-2 font-semibold">Vence</th>
              <th className="px-3 py-2 font-semibold">Días abierto</th>
              <th className="px-3 py-2 font-semibold">Días atraso</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.instructivoId ?? row.studentId}-${index}`} className="border-b border-slate-100 text-slate-700">
                <td className="px-3 py-3 font-medium text-slate-900">{row.studentName || `ID ${row.studentId}`}</td>
                <td className="px-3 py-3">{row.level ?? "—"}</td>
                <td className="px-3 py-3">{row.examType ?? "—"}</td>
                <td className="px-3 py-3">{row.assignedAt ? new Date(row.assignedAt).toLocaleDateString("es-EC") : "—"}</td>
                <td className="px-3 py-3">{row.dueDate ? new Date(row.dueDate).toLocaleDateString("es-EC") : "—"}</td>
                <td className="px-3 py-3 text-right">{row.daysOpen ?? "—"}</td>
                <td className="px-3 py-3 text-right">{row.daysOverdue ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
