"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { HourSplitRow } from "@/types/reports.engagement";

const integerFormatter = new Intl.NumberFormat("es-EC");
const percentFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Props = {
  rows: HourSplitRow[];
};

const daypartLabels: Record<HourSplitRow["daypart"], string> = {
  morning_08_12: "Mañana (08–12)",
  afternoon_12_17: "Tarde (12–17)",
  evening_17_20: "Noche (17–20)",
};

const daypartColors: Record<HourSplitRow["daypart"], string> = {
  morning_08_12: "#fbbf24",
  afternoon_12_17: "#3b82f6",
  evening_17_20: "#8b5cf6",
};

export function HourSplitBarsCard({ rows }: Props) {
  const total = rows.reduce((sum, row) => sum + row.total_minutes, 0);
  
  const chartData = rows.map((row) => ({
    daypart: daypartLabels[row.daypart],
    minutes: row.total_minutes,
    percent: total > 0 ? (row.total_minutes / total) * 100 : 0,
    color: daypartColors[row.daypart],
  }));

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          Hour Split 08–12 / 12–17 / 17–20
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Distribución de minutos por franja horaria
        </p>
      </header>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            type="number"
            tick={{ fill: "#64748b", fontSize: 12 }}
            stroke="#cbd5e1"
            label={{ value: "Minutos", position: "insideBottom", offset: -5, style: { fill: "#64748b", fontSize: 12 } }}
          />
          <YAxis 
            type="category"
            dataKey="daypart"
            tick={{ fill: "#64748b", fontSize: 12 }}
            stroke="#cbd5e1"
            width={150}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number, _name: string, props: any) => {
              const percent = props.payload.percent;
              return [
                `${integerFormatter.format(value)} min (${percentFormatter.format(percent)}%)`,
                ""
              ];
            }}
            labelFormatter={(label) => label}
          />
          <Bar dataKey="minutes" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
