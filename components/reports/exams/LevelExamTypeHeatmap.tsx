"use client";

import { useMemo } from "react";
import type { HeatmapCell } from "@/types/reports.examenes-instructivos";

type Props = {
  data: HeatmapCell[];
  onCellClick?: (params: {
    title: string;
    level: string;
    examType: string;
  }) => void;
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

export function LevelExamTypeHeatmap({ data, onCellClick }: Props) {
  const examTypes = useMemo(() => Array.from(new Set(data.map((row) => row.examType))).sort(), [data]);

  if (examTypes.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Mapa de calor: Nivel × Tipo de examen (90 días)
        </h3>
        <div className="flex h-64 items-center justify-center text-slate-500">
          No exam data available.
        </div>
      </section>
    );
  }

  const getColorClass = (score: number | null) => {
    if (score === null) return "bg-slate-100 text-slate-400";
    if (score >= 90) return "bg-emerald-600 text-white";
    if (score >= 80) return "bg-emerald-500 text-white";
    if (score >= 70) return "bg-emerald-400 text-white";
    if (score >= 60) return "bg-amber-400 text-slate-900";
    if (score >= 50) return "bg-rose-300 text-slate-900";
    return "bg-rose-600 text-white";
  };

  const getCellData = (level: string, examType: string): HeatmapCell | null => {
    return data.find((cell) => cell.level === level && cell.examType === examType) || null;
  };

  return (
    <figure className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <figcaption className="mb-4 text-lg font-semibold text-slate-900">
        Mapa de calor: Nivel × Tipo de examen (90 días)
        <span className="ml-2 text-xs font-normal text-slate-500">
          • Promedio de puntuaciones por nivel y tipo
        </span>
      </figcaption>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header Row */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `120px repeat(${examTypes.length}, minmax(100px, 1fr))` }}>
            <div className="flex items-center justify-center p-2 text-xs font-semibold text-slate-600">
              Level
            </div>
            {examTypes.map((type) => (
              <div
                key={type}
                className="flex items-center justify-center p-2 text-xs font-semibold text-slate-600"
              >
                {type}
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {LEVELS.map((level) => (
            <div
              key={level}
              className="grid gap-2 mt-2"
              style={{ gridTemplateColumns: `120px repeat(${examTypes.length}, minmax(100px, 1fr))` }}
            >
              <div className="flex items-center justify-center rounded-lg bg-slate-100 p-2 text-sm font-semibold text-slate-700">
                {level}
              </div>
              {examTypes.map((type) => {
                const cellData = getCellData(level, type);
                const tooltip = cellData
                  ? `${type} / ${level} — Avg ${cellData.avgScore ?? "—"} (n=${cellData.examsCount}${
                      cellData.passRatePct !== null ? `, Pass ${cellData.passRatePct.toFixed(1)}%` : ""
                    })`
                  : "No data";

                return (
                  <button
                    key={`${level}-${type}`}
                    onClick={() => {
                      if (cellData && onCellClick) {
                        onCellClick({
                          title: `${type} / ${level}`,
                          level,
                          examType: type,
                        });
                      }
                    }}
                    className={`flex flex-col items-center justify-center rounded-lg p-3 text-center transition-transform hover:scale-105 ${
                      cellData
                        ? getColorClass(cellData.avgScore ?? null) + " cursor-pointer"
                        : "bg-slate-100 text-slate-400 cursor-default"
                    }`}
                    disabled={!cellData}
                    title={tooltip}
                  >
                    {cellData ? (
                      <>
                        <span className="text-xl font-bold">{cellData.avgScore ?? "—"}</span>
                        <span className="text-xs opacity-80">n={cellData.examsCount}</span>
                      </>
                    ) : (
                      <span className="text-lg">–</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs">
        <span className="font-semibold text-slate-600">Color scale:</span>
        <div className="flex items-center gap-1">
          <div className="h-4 w-8 rounded bg-rose-600" />
          <span className="text-slate-600">&lt;50</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-8 rounded bg-rose-300" />
          <span className="text-slate-600">50-59</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-8 rounded bg-amber-400" />
          <span className="text-slate-600">60-69</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-8 rounded bg-emerald-400" />
          <span className="text-slate-600">70-79</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-8 rounded bg-emerald-500" />
          <span className="text-slate-600">80-89</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-8 rounded bg-emerald-600" />
          <span className="text-slate-600">90+</span>
        </div>
      </div>
    </figure>
  );
}
