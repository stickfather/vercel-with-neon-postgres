"use client";

import type { HourlyHeatmapCell } from "@/types/reports.engagement";

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  data: HourlyHeatmapCell[];
};

const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

function getColorForMinutes(minutes: number, maxMinutes: number): string {
  if (minutes === 0) return "bg-slate-50";
  const intensity = minutes / maxMinutes;
  if (intensity >= 0.8) return "bg-sky-600";
  if (intensity >= 0.6) return "bg-sky-500";
  if (intensity >= 0.4) return "bg-sky-400";
  if (intensity >= 0.2) return "bg-sky-300";
  return "bg-sky-200";
}

export function HourlyHeatmap({ data }: Props) {
  // Create a map for quick lookup
  const heatmapMap = new Map<string, number>();
  data.forEach((cell) => {
    const key = `${cell.iso_weekday}-${cell.hour_local}`;
    heatmapMap.set(key, cell.minutes);
  });

  const maxMinutes = Math.max(...data.map((cell) => cell.minutes), 1);

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          Tráfico por Hora — Heatmap (últimos 90 días)
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Demanda por día de semana y hora
        </p>
      </header>

      {/* Legend */}
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <span>Minutos (90d):</span>
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 bg-slate-50 border border-slate-200" title="0" />
          <div className="h-4 w-4 bg-sky-200" title="Bajo" />
          <div className="h-4 w-4 bg-sky-400" title="Medio" />
          <div className="h-4 w-4 bg-sky-600" title="Alto" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Hour labels */}
          <div className="flex">
            <div className="w-12" /> {/* spacer for weekday labels */}
            {hours.map((hour) => (
              <div key={hour} className="w-12 text-center text-xs text-slate-500 font-medium">
                {hour}:00
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {weekdayLabels.map((label, weekdayIndex) => {
            const isoWeekday = weekdayIndex + 1; // 1=Mon, 7=Sun
            return (
              <div key={isoWeekday} className="flex items-center mt-1">
                <div className="w-12 text-xs text-slate-600 font-medium pr-2">
                  {label}
                </div>
                {hours.map((hour) => {
                  const key = `${isoWeekday}-${hour}`;
                  const minutes = heatmapMap.get(key) || 0;
                  const colorClass = getColorForMinutes(minutes, maxMinutes);
                  
                  return (
                    <div
                      key={key}
                      className={`w-12 h-12 ${colorClass} border border-slate-200 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-sky-500 transition-all`}
                      title={`${label} ${hour}:00 — ${integerFormatter.format(minutes)} min`}
                    >
                      <span className="text-[10px] text-slate-700 font-medium">
                        {minutes > 0 ? integerFormatter.format(minutes) : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
