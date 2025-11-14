"use client";

import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

import type { LeiTrendSeries } from "@/types/reports.learning";

const dateFormatter = new Intl.DateTimeFormat("es-EC", { month: "short", day: "numeric" });

type Props = {
  data: LeiTrendSeries;
};

export function LeiTrendChart({ data }: Props) {
  const levelKeys = useMemo(() => Object.keys(data.byLevel).sort(), [data.byLevel]);
  const [selectedLevel, setSelectedLevel] = useState<string>("overall");

  const series = useMemo(() => {
    if (selectedLevel === "overall") {
      return data.overall.map((point) => ({
        weekStart: point.weekStart,
        label: dateFormatter.format(new Date(point.weekStart)),
        value: Number(point.avgLei.toFixed(2)),
      }));
    }
    const levelSeries = data.byLevel[selectedLevel] ?? [];
    return levelSeries.map((point) => ({
      weekStart: point.weekStart,
      label: dateFormatter.format(new Date(point.weekStart)),
      value: Number(point.avgLei.toFixed(2)),
    }));
  }, [data, selectedLevel]);

  const isEmpty = series.length === 0;

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Tendencia de eficiencia
          </span>
          <h2 className="text-2xl font-bold text-slate-900">Learning Efficiency Index</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => setSelectedLevel("overall")}
            className={`rounded-full border px-3 py-1 font-medium transition ${
              selectedLevel === "overall"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            General
          </button>
          {levelKeys.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setSelectedLevel(level)}
              className={`rounded-full border px-3 py-1 font-medium transition ${
                selectedLevel === level
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </header>

      {isEmpty ? (
        <div className="flex h-72 items-center justify-center text-sm text-slate-500">
          No hay datos de LEI en las últimas semanas.
        </div>
      ) : (
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={[0, "auto"]} />
              <Tooltip
                formatter={(value: number) => [`LEI ${value.toFixed(2)}`, selectedLevel === "overall" ? "General" : `Nivel ${selectedLevel}`]}
                labelFormatter={(label: string) => `Semana de ${label}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0f9d58"
                strokeWidth={3}
                dot={{ r: 4, fill: "#0f9d58" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-500">
        Promedio ponderado semanal de lecciones completadas por hora de estudio. Basado en las últimas {series.length} semanas.
      </p>
    </section>
  );
}
