"use client";

import type { StuckHeatmapCell, DrillDownSlice } from "@/types/learning-panel";

type Props = {
  data: StuckHeatmapCell[];
  onCellClick: (slice: DrillDownSlice) => void;
};

export function StuckHeatmap({ data, onCellClick }: Props) {
  if (data.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Estudiantes Estancados por Lección (90d)
        </h3>
        <div className="flex h-64 items-center justify-center text-slate-500">
          No se encontraron estudiantes estancados.
        </div>
      </section>
    );
  }

  // Build matrix structure
  const levels = [...new Set(data.map((d) => d.level))].sort();
  const lessons = [...new Set(data.map((d) => d.lesson_name))].sort();
  
  const matrix = new Map<string, number>();
  data.forEach((cell) => {
    matrix.set(`${cell.level}|${cell.lesson_name}`, cell.stuck_count);
  });

  const maxCount = Math.max(...data.map((d) => d.stuck_count), 1);

  const getColorIntensity = (count: number) => {
    const intensity = count / maxCount;
    if (intensity === 0) return "bg-slate-50";
    if (intensity < 0.2) return "bg-rose-100";
    if (intensity < 0.4) return "bg-rose-200";
    if (intensity < 0.6) return "bg-rose-300";
    if (intensity < 0.8) return "bg-rose-400";
    return "bg-rose-600 text-white";
  };

  const handleCellClick = (level: string, lesson_name: string, count: number) => {
    if (count > 0) {
      onCellClick({ type: "stuck_heatmap", level, lesson_name });
    }
  };

  return (
    <figure className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        Estudiantes Estancados por Lección (90d)
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white p-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Level
              </th>
              {lessons.map((lesson) => (
                <th
                  key={lesson}
                  className="p-2 text-center text-xs font-semibold text-slate-700"
                >
                  {lesson.replace("Lesson ", "L")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {levels.map((level) => (
              <tr key={level}>
                <td className="sticky left-0 z-10 bg-white p-2 font-medium text-slate-900">
                  {level}
                </td>
                {lessons.map((lesson) => {
                  const key = `${level}|${lesson}`;
                  const count = matrix.get(key) || 0;
                  const colorClass = getColorIntensity(count);
                  const isClickable = count > 0;

                  return (
                    <td key={key} className="p-1">
                      <button
                        type="button"
                        onClick={() => handleCellClick(level, lesson, count)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && isClickable) {
                            handleCellClick(level, lesson, count);
                          }
                        }}
                        disabled={!isClickable}
                        className={`flex h-12 w-full min-w-[3rem] items-center justify-center rounded-lg font-medium transition-all ${colorClass} ${
                          isClickable
                            ? "cursor-pointer hover:ring-2 hover:ring-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            : "cursor-default"
                        }`}
                        aria-label={`${level} ${lesson}: ${count} stuck students`}
                        title={`${level} • ${lesson} — Stuck ${count} (Active 7d, No completion 14d+)`}
                      >
                        {count > 0 ? count : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mt-4 text-xs text-slate-500">
        Students active in last 7 days but no lesson completion in 14+ days. Click cells to view details. Last 90 days.
      </figcaption>
    </figure>
  );
}
