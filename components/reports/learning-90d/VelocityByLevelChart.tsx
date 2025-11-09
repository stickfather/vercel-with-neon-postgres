"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { VelocityByLevel } from "@/types/learning-panel";

type Props = {
  data: VelocityByLevel[];
};

const LEVEL_COLORS: Record<string, string> = {
  A1: "#0ea5e9",
  A2: "#06b6d4",
  B1: "#8b5cf6",
  B2: "#a855f7",
  C1: "#ec4899",
};

export function VelocityByLevelChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <figure className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Lesson Completion Velocity per Level (90d)
        </h3>
        <div className="flex h-64 items-center justify-center text-slate-500">
          No data available.
        </div>
      </figure>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p className="text-xs font-semibold text-slate-900">
          Level {data.level}
        </p>
        <p className="mt-1 text-xs text-slate-600">
          {data.lessons_per_week.toFixed(1)} lessons/week
        </p>
      </div>
    );
  };

  return (
    <figure className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        Lesson Completion Velocity per Level (90d)
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" stroke="#64748b" style={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="level"
            stroke="#64748b"
            style={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="lessons_per_week" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={LEVEL_COLORS[entry.level] || "#64748b"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="mt-2 text-xs text-slate-500">
        Average lessons completed per week by level. Last 90 days.
      </figcaption>
    </figure>
  );
}
