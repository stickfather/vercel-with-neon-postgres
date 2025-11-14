"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ScoreDistributionBin } from "@/types/reports.examenes-instructivos";

type Props = {
  data: ScoreDistributionBin[];
};

function parseBinStart(label: string): number {
  const match = label.match(/^(\d{1,3})/);
  return match ? Number(match[1]) : 0;
}

function estimateMedian(bins: { bin: string; count: number }[]): number | null {
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  if (!total) return null;
  const midpoint = total / 2;
  let running = 0;
  for (const bin of bins) {
    running += bin.count;
    if (running >= midpoint) {
      const [start, end] = bin.bin.split(/-|–/);
      const startNum = Number(start ?? 0);
      const endNum = Number(end ?? startNum + 5);
      return (startNum + endNum) / 2;
    }
  }
  return null;
}

export function ScoreDistributionChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Distribución de Puntuaciones (90d)
        </h3>
        <div className="flex h-64 items-center justify-center text-slate-500">
          No hay datos de puntuaciones disponibles.
        </div>
      </section>
    );
  }

  const chartData = data
    .map((item) => ({
      bin: item.binLabel,
      count: item.count,
      binStart: parseBinStart(item.binLabel),
    }))
    .sort((a, b) => a.binStart - b.binStart);

  const median = estimateMedian(chartData);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p className="text-xs text-slate-600">
          Rango de Puntuación: <span className="font-semibold text-slate-900">{data.bin}</span>
        </p>
        <p className="text-xs text-slate-600">
          Cantidad: <span className="font-semibold text-slate-900">{data.count}</span>
        </p>
      </div>
    );
  };

  return (
    <figure className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <figcaption className="mb-4 text-lg font-semibold text-slate-900">
        Distribución de Puntuaciones (90d)
        {median !== null && (
          <span className="ml-2 text-xs font-normal text-slate-500">
            • Median: {median.toFixed(1)}
          </span>
        )}
      </figcaption>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="bin"
            tick={{ fontSize: 10, fill: "#64748b" }}
            stroke="#cbd5e1"
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#64748b" }}
            stroke="#cbd5e1"
            label={{
              value: "Count",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12, fill: "#64748b" },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          {median !== null && (
            <ReferenceLine
              x={`${Math.floor(median / 5) * 5}-${Math.floor(median / 5) * 5 + 5}`}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={2}
              label={{
                value: `Median ${median.toFixed(0)}`,
                position: "top",
                fill: "#f59e0b",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          )}
          <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}
