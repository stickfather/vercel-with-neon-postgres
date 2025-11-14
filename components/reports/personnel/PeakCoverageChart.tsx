"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { PeakCoveragePoint } from "@/types/personnel";

const minutesFormatter = new Intl.NumberFormat("es-EC");

function formatTooltipValue(value?: number | string): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${minutesFormatter.format(value)} min`;
  }
  return "—";
}

export function PeakCoverageChart({ data }: { data: PeakCoveragePoint[] }) {
  const hasData = data.some((point) => point.studentMinutes || point.staffMinutes);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Cobertura en horas pico</p>
          <p className="text-xs text-slate-500">Comparación de minutos estudiantes vs personal</p>
        </div>
        <p className="text-xs text-slate-500">Fuente: final.personnel_staffing_mix_hour_mv</p>
      </header>

      {!data.length || !hasData ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-16 text-center text-sm text-slate-500">
          No hay datos suficientes para la curva de cobertura.
        </p>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
              <XAxis dataKey="hourLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${minutesFormatter.format(value)}m`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }}
                formatter={(value, name) => [formatTooltipValue(value as number), name === "studentMinutes" ? "Estudiantes" : "Personal"]}
                labelFormatter={(label) => `${label} h`}
              />
              <Legend formatter={(value) => (value === "studentMinutes" ? "Estudiantes" : "Personal")} />
              <Line type="monotone" dataKey="studentMinutes" stroke="#2563eb" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="staffMinutes" stroke="#10b981" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
