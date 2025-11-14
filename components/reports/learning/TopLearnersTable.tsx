import Image from "next/image";

import type { TopLearnerRow } from "@/types/reports.learning";

const percentFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const lessonsFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

type Props = {
  rows: TopLearnerRow[];
};

export function TopLearnersTable({ rows }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">Top 10% destacado</p>
          <h3 className="text-xl font-semibold text-slate-900">Estudiantes excepcionales por nivel</h3>
        </div>
        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          {rows.length} estudiantes
        </span>
      </header>
      {rows.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-slate-500">
          Sin estudiantes destacados por ahora.
        </div>
      ) : (
        <div className="max-h-[360px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                <th className="py-3">Estudiante</th>
                <th className="py-3">Nivel</th>
                <th className="py-3">LEI 30d</th>
                <th className="py-3 text-right">Lecciones esta semana</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.studentId} className="border-t border-slate-100">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      {row.photoUrl ? (
                        <Image
                          src={row.photoUrl}
                          alt={row.fullName}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                          {row.fullName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{row.fullName}</span>
                        <span className="text-xs text-slate-500">ID {row.studentId}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {row.level}
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-emerald-700">{percentFormatter.format(row.lei30d)}</td>
                  <td className="py-3 text-right font-medium text-slate-700">
                    {lessonsFormatter.format(row.lessonsThisWeek)}
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
