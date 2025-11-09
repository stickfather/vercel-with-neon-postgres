"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { SessionFrequencyBin } from "@/types/reports.engagement";

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  data: SessionFrequencyBin[];
};

export function SessionFrequencyHistogram({ data }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          Session Frequency Distribution (histograma)
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Número de sesiones promedio por alumno (últimos 30 días)
        </p>
      </header>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="bin_label" 
            tick={{ fill: "#64748b", fontSize: 12 }}
            stroke="#cbd5e1"
            label={{ value: "Sesiones", position: "insideBottom", offset: -5, style: { fill: "#64748b", fontSize: 12 } }}
          />
          <YAxis 
            tick={{ fill: "#64748b", fontSize: 12 }}
            stroke="#cbd5e1"
            label={{ value: "Alumnos", angle: -90, position: "insideLeft", style: { fill: "#64748b", fontSize: 12 } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number, name: string) => [
              `${integerFormatter.format(value)} alumnos`,
              ""
            ]}
            labelFormatter={(label) => `${label} sesiones`}
          />
          <Bar 
            dataKey="student_count" 
            fill="#3b82f6" 
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
