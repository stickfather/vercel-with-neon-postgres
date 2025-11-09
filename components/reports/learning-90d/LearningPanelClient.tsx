"use client";

import { useEffect, useState } from "react";
import { LeiKpiCard } from "./LeiKpiCard";
import { SpeedBucketsCard } from "./SpeedBucketsCard";
import { DaysInLevelCard } from "./DaysInLevelCard";
import { DaysSinceProgressCard } from "./DaysSinceProgressCard";
import { MicroKpiStrip } from "./MicroKpiStrip";
import { StuckHeatmap } from "./StuckHeatmap";
import { DurationVarianceChart } from "./DurationVarianceChart";
import { VelocityByLevelChart } from "./VelocityByLevelChart";
import { LeiWeeklyTrendChart } from "./LeiWeeklyTrendChart";
import { AtRiskLearnersTable } from "./AtRiskLearnersTable";
import { DrillDownDrawer } from "./DrillDownDrawer";
import type { LearningPanelData, DrillDownSlice } from "@/types/learning-panel";

export function LearningPanelClient() {
  const [data, setData] = useState<LearningPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<DrillDownSlice>({ type: "none" });

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/reports/learning-90d");
        if (!response.ok) {
          throw new Error("Failed to fetch learning data");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleOpenDrillDown = (slice: DrillDownSlice) => {
    setDrillDown(slice);
  };

  const handleCloseDrillDown = () => {
    setDrillDown({ type: "none" });
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drillDown.type !== "none") {
        handleCloseDrillDown();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [drillDown.type]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {/* Micro KPI Strip Skeleton */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
        {/* KPI Cards Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
        {/* Charts Skeleton */}
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-sm text-rose-800">
          We couldn't load this data. Try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* MODULE 11: Micro KPI Strip (7-day operational) */}
      <MicroKpiStrip data={data.micro_kpi_7d} />

      {/* KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LeiKpiCard data={data.lei_kpi} />
        <SpeedBucketsCard data={data.speed_buckets} />
        <DaysInLevelCard data={data.days_in_level} />
        <DaysSinceProgressCard data={data.days_since_progress} />
      </div>

      {/* MODULE 9: LEI Weekly Trend (full width) */}
      <LeiWeeklyTrendChart data={data.lei_weekly_trend} />

      {/* MODULE 6: Stuck Students Heatmap */}
      <StuckHeatmap
        data={data.stuck_heatmap}
        onCellClick={handleOpenDrillDown}
      />

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DurationVarianceChart
          data={data.duration_variance}
          onBarClick={handleOpenDrillDown}
        />
        <VelocityByLevelChart data={data.velocity_by_level} />
      </div>

      {/* MODULE 10: At-Risk Learners Table */}
      <AtRiskLearnersTable data={data.at_risk_learners} />

      {/* MODULE 12: Drill-Down Drawer */}
      <DrillDownDrawer
        slice={drillDown}
        onClose={handleCloseDrillDown}
      />
    </div>
  );
}
