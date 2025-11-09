"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { MauRollingPoint } from "@/types/reports.engagement";

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  data: MauRollingPoint[];
};

export function MauRollingTrend({ data }: Props) {
  const chartData = data.map((point) => ({
    dateLabel: format(parseISO(point.snapshot_date), "d MMM", { locale: es }),
    mauRolling30d: point.mau_rolling_30d,
  }));

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          Rolling 30-Day Active User Trend
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Activos 30d evaluados diariamente (últimos 90 días)
        </p>
      </header>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="dateLabel" 
            tick={{ fill: "#64748b", fontSize: 12 }}
            stroke="#cbd5e1"
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fill: "#64748b", fontSize: 12 }}
            stroke="#cbd5e1"
            label={{ value: "Activos 30d", angle: -90, position: "insideLeft", style: { fill: "#64748b", fontSize: 12 } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [integerFormatter.format(value), "Activos 30d"]}
            labelFormatter={(label) => label}
          />
          <Line 
            type="monotone" 
            dataKey="mauRolling30d" 
            stroke="#10b981" 
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
