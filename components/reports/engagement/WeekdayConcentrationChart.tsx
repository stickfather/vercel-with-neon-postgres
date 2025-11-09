"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { DailyActivityPoint } from "@/types/reports.engagement";

const percentFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Props = {
  data: DailyActivityPoint[];
};

const weekdayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const colors = ["#ef4444", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export function WeekdayConcentrationChart({ data }: Props) {
  const weekdayData = useMemo(() => {
    // Aggregate by weekday
    const weekdayMap = new Map<number, number>();
    
    data.forEach((point) => {
      const date = new Date(point.d);
      const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      
      const current = weekdayMap.get(dayOfWeek) || 0;
      weekdayMap.set(dayOfWeek, current + point.total_minutes);
    });

    const total = Array.from(weekdayMap.values()).reduce((sum, val) => sum + val, 0);
    
    // Create array for all weekdays
    const result = [];
    for (let i = 0; i < 7; i++) {
      const minutes = weekdayMap.get(i) || 0;
      result.push({
        name: weekdayLabels[i],
        value: minutes,
        percent: total > 0 ? (minutes / total) * 100 : 0,
      });
    }

    return result;
  }, [data]);

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          Attendance Concentration by Day of Week
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Distribución de minutos por día (últimos 90 días)
        </p>
      </header>

      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={weekdayData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry: any) => `${entry.name} ${percentFormatter.format(entry.percent as number)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {weekdayData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number, _name: string, props: any) => {
              const percent = props.payload.percent as number;
              return [`${percentFormatter.format(percent)}%`, ""];
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: "12px" }}
            formatter={(value, entry: any) => `${value} — ${percentFormatter.format(entry.payload.percent as number)}%`}
          />
        </PieChart>
      </ResponsiveContainer>
    </section>
  );
}
