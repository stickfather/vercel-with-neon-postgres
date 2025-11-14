"use client";

import { useEffect, useState } from "react";

import type { EngagementReportResponse } from "@/types/reports.engagement";

import { ActiveSummaryCards } from "./ActiveSummaryCards";
import { AvgDaysBetweenVisitsCard } from "./AvgDaysBetweenVisitsCard";
import { DeclineIndexChart } from "./DeclineIndexChart";
import { FrequencyScoreCard } from "./FrequencyScoreCard";
import { HourSplitCard } from "./HourSplitCard";
import { InactivityTables } from "./InactivityTables";
import { ZeroAttendanceTable } from "./ZeroAttendanceTable";

export function EngagementPanelClient() {
  const [data, setData] = useState<EngagementReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/reports/engagement", { cache: "no-store" });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "No pudimos cargar el reporte de engagement.");
        }
        const payload = (await response.json()) as EngagementReportResponse;
        if (!cancelled) {
          setData(payload);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Engagement report request failed", err);
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
        {[...Array(5)].map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
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
            <ul className="mt-2 list-disc pl-4 text-xs text-amber-800">
              {data.fallbackReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <ActiveSummaryCards summary={data.activeSummary} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <InactivityTables tables={data.inactivityTables} />
        <div className="flex flex-col gap-6">
          <AvgDaysBetweenVisitsCard metric={data.avgDaysBetweenVisits} />
          <FrequencyScoreCard score={data.frequencyScore} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DeclineIndexChart points={data.declineIndex} />
        <HourSplitCard buckets={data.hourSplit} />
      </div>

      <ZeroAttendanceTable rows={data.zeroAttendance} />
    </div>
  );
}
