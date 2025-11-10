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
import type { ExamScoreDistribution, ExamCompletedExam } from "@/types/exams";

type Props = {
  data: ExamScoreDistribution[];
  completedExams: ExamCompletedExam[];
};

export function ScoreDistributionChart({ data, completedExams }: Props) {
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

  // Compute median from completed exams
  const scores = completedExams
    .map((e) => e.score)
    .filter((s): s is number => s !== null)
    .sort((a, b) => a - b);

  let median: number | null = null;
  if (scores.length > 0) {
    const mid = Math.floor(scores.length / 2);
    median =
      scores.length % 2 === 0
        ? (scores[mid - 1] + scores[mid]) / 2
        : scores[mid];
  }

  // Ensure we have all 20 bins (0-5, 5-10, ..., 95-100)
  const bins = new Map<string, number>();
  for (let i = 0; i < 20; i++) {
    const start = i * 5;
    const end = start + 5;
    bins.set(`${start}-${end}`, 0);
  }

  data.forEach((item) => {
    bins.set(item.bin_5pt, item.n);
  });

  const chartData = Array.from(bins.entries()).map(([bin, n]) => ({
    bin,
    n,
    binStart: parseInt(bin.split("-")[0]),
  }));

  chartData.sort((a, b) => a.binStart - b.binStart);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p className="text-xs text-slate-600">
          Rango de Puntuación: <span className="font-semibold text-slate-900">{data.bin}</span>
        </p>
        <p className="text-xs text-slate-600">
          Cantidad: <span className="font-semibold text-slate-900">{data.n}</span>
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
          <Bar dataKey="n" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}
