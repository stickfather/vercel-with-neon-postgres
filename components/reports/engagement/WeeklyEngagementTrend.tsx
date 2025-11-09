"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { WeeklyEngagementPoint } from "@/types/reports.engagement";

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  data: WeeklyEngagementPoint[];
};

export function WeeklyEngagementTrend({ data }: Props) {
  const chartData = data.map((point) => ({
    weekLabel: format(parseISO(point.week_start), "d MMM", { locale: es }),
    maxDailyActives: point.max_daily_actives,
    totalMinutes: point.total_minutes,
  }));

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          Weekly Engagement Trend (12 semanas)
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Pico de activos diarios y minutos totales por semana
        </p>
      </header>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="weekLabel" 
            tick={{ fill: "#64748b", fontSize: 12 }}
            stroke="#cbd5e1"
          />
          <YAxis 
            yAxisId="left"
            tick={{ fill: "#64748b", fontSize: 12 }}
            stroke="#cbd5e1"
            label={{ value: "Activos", angle: -90, position: "insideLeft", style: { fill: "#64748b", fontSize: 12 } }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#64748b", fontSize: 12 }}
            stroke="#cbd5e1"
            label={{ value: "Minutos", angle: 90, position: "insideRight", style: { fill: "#64748b", fontSize: 12 } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number, name: string) => {
              if (name === "maxDailyActives") {
                return [integerFormatter.format(value), "Activos pico"];
              }
              return [integerFormatter.format(value), "Minutos"];
            }}
            labelFormatter={(label) => `Semana de ${label}`}
          />
          <Legend 
            wrapperStyle={{ fontSize: "12px" }}
            formatter={(value) => value === "maxDailyActives" ? "Activos pico" : "Minutos totales"}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="maxDailyActives" 
            stroke="#0ea5e9" 
            strokeWidth={2.5}
            dot={{ fill: "#0ea5e9", r: 4 }}
          />
          <Bar 
            yAxisId="right"
            dataKey="totalMinutes" 
            fill="#94a3b8" 
            opacity={0.3}
            radius={[4, 4, 0, 0]}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
