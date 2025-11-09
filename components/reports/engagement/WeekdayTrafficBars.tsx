"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { DailyActivityPoint } from "@/types/reports.engagement";

const integerFormatter = new Intl.NumberFormat("es-EC");
const percentFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Props = {
  data: DailyActivityPoint[];
};

const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const barColors = ["#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function WeekdayTrafficBars({ data }: Props) {
  const weekdayData = useMemo(() => {
    // Aggregate by weekday (1=Mon, 7=Sun)
    const weekdayMap = new Map<number, number>();
    
    data.forEach((point) => {
      const date = new Date(point.d);
      const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const isoWeekday = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert to 1=Mon, 7=Sun
      
      const current = weekdayMap.get(isoWeekday) || 0;
      weekdayMap.set(isoWeekday, current + point.total_minutes);
    });

    const total = Array.from(weekdayMap.values()).reduce((sum, val) => sum + val, 0);
    
    // Create array with all weekdays
    const result = [];
    for (let i = 1; i <= 7; i++) {
      const minutes = weekdayMap.get(i) || 0;
      result.push({
        weekday: weekdayLabels[i - 1],
        minutes,
        percent: total > 0 ? (minutes / total) * 100 : 0,
        color: barColors[i - 1],
      });
    }

    // Sort by minutes descending
    return result.sort((a, b) => b.minutes - a.minutes);
  }, [data]);

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          Día de la Semana con Mayor Tráfico
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Distribución de minutos por día (últimos 90 días)
        </p>
      </header>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={weekdayData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            type="number"
            tick={{ fill: "#64748b", fontSize: 12 }}
            stroke="#cbd5e1"
            label={{ value: "Minutos", position: "insideBottom", offset: -5, style: { fill: "#64748b", fontSize: 12 } }}
          />
          <YAxis 
            type="category"
            dataKey="weekday"
            tick={{ fill: "#64748b", fontSize: 12 }}
            stroke="#cbd5e1"
            width={60}
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
            {weekdayData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
