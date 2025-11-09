"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { LessonDurationStat, DrillDownSlice } from "@/types/learning-panel";

type Props = {
  data: LessonDurationStat[];
  onBarClick: (slice: DrillDownSlice) => void;
};

export function DurationVarianceChart({ data, onBarClick }: Props) {
  if (!data || data.length === 0) {
    return (
      <figure className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Lesson Duration Variance (Top 20, 90d)
        </h3>
        <div className="flex h-64 items-center justify-center text-slate-500">
          No data available.
        </div>
      </figure>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    label: `${item.level} • ${item.lesson_name.replace("Lesson ", "L")}`,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p className="mb-2 text-xs font-semibold text-slate-900">
          {data.level} • {data.lesson_name}
        </p>
        <div className="flex flex-col gap-1 text-xs text-slate-600">
          <p>
            Variance: <span className="font-semibold text-slate-900">{data.variance_minutes.toFixed(1)} min²</span>
          </p>
          <p>
            Avg: <span className="font-semibold">{data.avg_minutes.toFixed(1)} min</span>
          </p>
          <p>
            n = <span className="font-semibold">{data.n_sessions}</span>
          </p>
        </div>
      </div>
    );
  };

  const handleClick = (data: any) => {
    if (data) {
      onBarClick({
        type: "duration_variance",
        level: data.level,
        lesson_name: data.lesson_name,
      });
    }
  };

  return (
    <figure className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        Lesson Duration Variance (Top 20, 90d)
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" stroke="#64748b" style={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="label"
            stroke="#64748b"
            style={{ fontSize: 11 }}
            width={75}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
          <Bar
            dataKey="variance_minutes"
            fill="#64748b"
            radius={[0, 4, 4, 0]}
            onClick={handleClick}
            style={{ cursor: "pointer" }}
            onKeyDown={(e: any) => {
              if (e.key === "Enter" && e.payload) {
                handleClick(e.payload);
              }
            }}
          />
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="mt-2 text-xs text-slate-500">
        Top 20 lessons by duration variance. Click bars to view session details. Last 90 days.
      </figcaption>
    </figure>
  );
}
