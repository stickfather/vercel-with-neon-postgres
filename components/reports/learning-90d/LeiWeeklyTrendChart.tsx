"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { LeiWeeklyData } from "@/types/learning-panel";

type Props = {
  data: LeiWeeklyData[];
};

const numberFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function LeiWeeklyTrendChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <figure className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          LEI Weekly Trend (90d)
        </h3>
        <div className="flex h-64 items-center justify-center text-slate-500">
          No data available for the last 90 days.
        </div>
      </figure>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    weekLabel: format(parseISO(item.week_start), "dd MMM", { locale: es }),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const weekDate = parseISO(data.week_start);
    const formattedDate = format(weekDate, "dd MMM", { locale: es });

    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p className="mb-2 text-xs font-semibold text-slate-700">
          Week of Mon {formattedDate}
        </p>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">LEI:</span>
            <span className="font-semibold text-emerald-600">
              {data.lei_week.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <figure className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        LEI Weekly Trend (90d)
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="weekLabel"
            stroke="#64748b"
            style={{ fontSize: 12 }}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: 12 }}
            label={{ value: "LEI", angle: -90, position: "insideLeft" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="lei_week"
            stroke="#10b981"
            strokeWidth={2}
            name="LEI"
            dot={{ r: 4, fill: "#10b981" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <figcaption className="mt-2 text-xs text-slate-500">
        Learning Efficiency Index (lessons/hour) by week. Last 90 days.
      </figcaption>
    </figure>
  );
}
