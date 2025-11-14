"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TeacherUtilizationRow } from "@/types/personnel";

const percentFormatter = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 0 });
const minutesFormatter = new Intl.NumberFormat("es-EC");

export function TeacherUtilizationChart({ rows }: { rows: TeacherUtilizationRow[] }) {
  const chartRows = rows.slice(0, 12);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Utilización de profesores</p>
          <p className="text-xs text-slate-500">Minutos con estudiantes vs minutos trabajados</p>
        </div>
        <p className="text-xs text-slate-500">Fuente: final.personnel_teacher_utilization_mv</p>
      </header>

      {!rows.length ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-16 text-center text-sm text-slate-500">
          No hay registros de utilización recientes.
        </p>
      ) : (
        <>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ top: 10, right: 20, left: -10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="teacherName"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }}
                  formatter={(value: number) => `${percentFormatter.format(value)}%`}
                />
                <Bar dataKey="utilizationPct" fill="#4f46e5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 divide-y divide-slate-100">
            {rows.slice(0, 6).map((row) => (
              <div key={row.teacherId} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{row.teacherName}</p>
                  <p className="text-xs text-slate-500">
                    {minutesFormatter.format(row.minutesWithStudents)} min con estudiantes • {minutesFormatter.format(row.minutesClockedIn)} min trabajados
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    row.utilizationPct !== null && row.utilizationPct < 50
                      ? "text-rose-600"
                      : row.utilizationPct !== null && row.utilizationPct > 85
                        ? "text-emerald-600"
                        : "text-slate-700"
                  }`}
                >
                  {row.utilizationPct !== null ? `${percentFormatter.format(row.utilizationPct)}%` : "—"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
