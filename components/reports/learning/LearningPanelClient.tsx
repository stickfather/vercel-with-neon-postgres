"use client";

import { useEffect, useState } from "react";

import type { LearningReportResponse } from "@/types/reports.learning";

import { AtRiskLearnersTable } from "./AtRiskLearnersTable";
import { DaysInLevelChart } from "./DaysInLevelChart";
import { LeiTrendChart } from "./LeiTrendChart";
import { StuckHeatmap } from "./StuckHeatmap";
import { TopLearnersTable } from "./TopLearnersTable";
import { VelocityCards } from "./VelocityCards";

export function LearningPanelClient() {
  const [data, setData] = useState<LearningReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/reports/learning", { cache: "no-store" });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "No pudimos cargar el reporte de aprendizaje.");
        }
        const payload = (await response.json()) as LearningReportResponse;
        if (!cancelled) {
          setData(payload);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Learning report request failed", err);
          setError(err instanceof Error ? err.message : "Error desconocido");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200/60 bg-rose-50 p-6 text-rose-900">
        <h3 className="mb-2 text-xl font-semibold">No pudimos cargar el reporte</h3>
        <p className="mb-4 text-sm">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {data.fallback ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="text-sm font-medium">
            Algunos indicadores usan datos de respaldo mientras se reconstruyen las vistas finales.
          </p>
          {data.fallbackReasons.length ? (
            <ul className="mt-2 list-disc pl-5 text-xs text-amber-700">
              {data.fallbackReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <LeiTrendChart data={data.leiTrend} />

      <div className="grid gap-6 lg:grid-cols-2">
        <TopLearnersTable rows={data.top10} />
        <AtRiskLearnersTable rows={data.bottom20} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DaysInLevelChart rows={data.daysInLevel} />
        <VelocityCards cards={data.velocityByLevel} />
      </div>

      <StuckHeatmap cells={data.stuckHeatmap} />
    </div>
  );
}
