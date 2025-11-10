"use client";

import { format, parseISO } from "date-fns";
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
import type { ExamWeeklyKpi } from "@/types/exams";

type Props = {
  data: ExamWeeklyKpi[];
  onBarClick: (params: { title: string; weekStart: string }) => void;
};

export function WeeklyTrendChart({ data, onBarClick }: Props) {
  if (!data || data.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Tendencia Semanal de Aprobación/Reprobación + Tasa
        </h3>
        <div className="flex h-64 items-center justify-center text-slate-500">
          No hay datos disponibles de los últimos 90 días.
        </div>
      </section>
    );
  }

  const chartData = data.map((item) => ({
    week_start: item.week_start,
    weekLabel: format(parseISO(item.week_start), "dd MMM"),
    passed_count: item.passed_count,
    failed_count: item.failed_count,
    completed_count: item.completed_count,
    pass_rate: item.pass_rate !== null ? item.pass_rate * 100 : null,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const weekDate = parseISO(data.week_start);
    const formattedDate = format(weekDate, "EEE, dd MMM yyyy");

    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p className="mb-2 text-xs font-semibold text-slate-700">
          Semana del Lun, {formattedDate}
        </p>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-emerald-500" />
            <span className="text-slate-600">Aprobados:</span>
            <span className="font-semibold text-slate-900">
              {data.passed_count}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-rose-500" />
            <span className="text-slate-600">Reprobados:</span>
            <span className="font-semibold text-slate-900">
              {data.failed_count}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Completados:</span>
            <span className="font-semibold text-slate-900">
              {data.completed_count}
            </span>
          </div>
          {data.pass_rate !== null && (
            <div className="mt-1 flex items-center gap-2 border-t pt-1">
              <span className="text-slate-600">Tasa de Aprobación:</span>
              <span className="font-semibold text-slate-900">
                {data.pass_rate.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleClick = (data: any) => {
    if (data && data.week_start) {
      const weekDate = parseISO(data.week_start);
      const formattedDate = format(weekDate, "dd MMM");
      onBarClick({
        title: `Semana del ${formattedDate}`,
        weekStart: data.week_start,
      });
    }
  };

  return (
    <figure className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <figcaption className="mb-4 text-lg font-semibold text-slate-900">
        Tendencia Semanal de Aprobación/Reprobación + Tasa
        <span className="ml-2 text-xs font-normal text-slate-500">
          (últimos 90 días)
        </span>
      </figcaption>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 12, fill: "#64748b" }}
            stroke="#cbd5e1"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12, fill: "#64748b" }}
            stroke="#cbd5e1"
            label={{
              value: "Count",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12, fill: "#64748b" },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12, fill: "#64748b" }}
            stroke="#cbd5e1"
            label={{
              value: "Pass Rate (%)",
              angle: 90,
              position: "insideRight",
              style: { fontSize: 12, fill: "#64748b" },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconType="square"
          />
          <Bar
            yAxisId="left"
            dataKey="passed_count"
            stackId="a"
            fill="#10b981"
            name="Passed"
            onClick={handleClick}
            cursor="pointer"
          />
          <Bar
            yAxisId="left"
            dataKey="failed_count"
            stackId="a"
            fill="#ef4444"
            name="Failed"
            onClick={handleClick}
            cursor="pointer"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="pass_rate"
            stroke="#64748b"
            strokeWidth={2}
            dot={{ r: 4, fill: "#64748b" }}
            name="Pass Rate (%)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </figure>
  );
}
