"use client";

import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ExamWeeklyKpi } from "@/types/exams";

type Props = {
  data: ExamWeeklyKpi[];
};

export function WeeklyVolumeChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Volumen semanal de exámenes (90 días)
        </h3>
        <div className="flex h-64 items-center justify-center text-slate-500">
          No data available.
        </div>
      </section>
    );
  }

  const chartData = data.map((item) => ({
    week_start: item.week_start,
    weekLabel: format(parseISO(item.week_start), "dd MMM"),
    completed_count: item.completed_count,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const weekDate = parseISO(data.week_start);
    const formattedDate = format(weekDate, "EEE, dd MMM");

    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p className="text-xs text-slate-600">
          Week of Mon, {formattedDate}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-900">
          Completed: {data.completed_count}
        </p>
      </div>
    );
  };

  return (
    <figure className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <figcaption className="mb-4 text-lg font-semibold text-slate-900">
        Volumen semanal de exámenes (90 días)
      </figcaption>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 12, fill: "#64748b" }}
            stroke="#cbd5e1"
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#64748b" }}
            stroke="#cbd5e1"
            label={{
              value: "Completed",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12, fill: "#64748b" },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="completed_count"
            stroke="#475569"
            strokeWidth={2}
            dot={{ r: 5, fill: "#475569" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
