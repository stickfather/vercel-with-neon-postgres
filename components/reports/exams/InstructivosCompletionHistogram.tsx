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
import type { CompletionHistogramBin } from "@/types/reports.examenes-instructivos";

type Props = {
  bins: CompletionHistogramBin[];
};

export function InstructivosCompletionHistogram({ bins }: Props) {
  if (!bins || bins.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Tiempo de cumplimiento de instructivos</h3>
        <p className="text-sm text-slate-500">No hay datos suficientes para mostrar la distribución.</p>
      </section>
    );
  }

  const data = bins.map((bin) => ({
    label: bin.bucketLabel,
    count: bin.count,
  }));

  return (
    <figure className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <figcaption className="mb-4 text-lg font-semibold text-slate-900">
        Histograma de días para completar instructivos
        <span className="ml-2 text-xs font-normal text-slate-500">• Ventana de 90 días</span>
      </figcaption>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barCategoryGap={12}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#475569" }}
            stroke="#cbd5e1"
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#475569" }}
            stroke="#cbd5e1"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const item = payload[0]?.payload;
              return (
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  <p className="text-slate-600">{item.count} instructivos</p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#38bdf8" />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}
