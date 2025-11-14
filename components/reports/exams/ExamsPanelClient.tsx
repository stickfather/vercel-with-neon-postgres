"use client";

import { useEffect, useState } from "react";
import { PassRateCard } from "./PassRateCard";
import { AverageScoreCard } from "./AverageScoreCard";
import { FirstAttemptPassCard } from "./FirstAttemptPassCard";
import { InstructiveComplianceCard } from "./InstructiveComplianceCard";
import { WeeklyTrendChart } from "./WeeklyTrendChart";
import { ScoreDistributionChart } from "./ScoreDistributionChart";
import { LevelExamTypeHeatmap } from "./LevelExamTypeHeatmap";
import { WeeklyVolumeChart } from "./WeeklyVolumeChart";
import { RetakesTable } from "./RetakesTable";
import { StrugglingStudentsTable } from "./StrugglingStudentsTable";
import { UpcomingExamsAgenda } from "./UpcomingExamsAgenda";
import { InstructivosCompletionHistogram } from "./InstructivosCompletionHistogram";
import { InstructivosStatusTable } from "./InstructivosStatusTable";
import type { ExamenesInstructivosReportResponse } from "@/types/reports.examenes-instructivos";

export function ExamsPanelClient() {
  const [report, setReport] = useState<ExamenesInstructivosReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/reports/examenes-y-instructivos");
        if (!response.ok) {
          throw new Error("Failed to fetch Exámenes y Instructivos data");
        }
        const result: ExamenesInstructivosReportResponse = await response.json();
        setReport(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
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

  if (error || !report) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-sm text-rose-800">
          No pudimos cargar los datos de exámenes e instructivos. Intenta nuevamente.
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

  const {
    summary,
    instructivosSummary,
    weeklyTrend,
    scoreDistribution,
    heatmap,
    repeatExams,
    studentsNeedingAttention,
    upcomingExams,
    instructivosStatus,
  } = report;

  return (
    <div className="flex flex-col gap-6">
      {report.fallback && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Algunos datos están en modo seguro mientras las vistas `final.*` se recalculan.
        </div>
      )}
      {/* KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PassRateCard valuePct={summary.passRatePct} />
        <AverageScoreCard avgScore={summary.avgScore} sparkline={summary.avgScoreSparkline} />
        <FirstAttemptPassCard valuePct={summary.firstAttemptPassRatePct} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <InstructiveComplianceCard summary={instructivosSummary} />
        <InstructivosCompletionHistogram bins={instructivosSummary.completionHistogram} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InstructivosStatusTable
          title="Instructivos vencidos"
          subtitle="Zona de penalización"
          rows={instructivosStatus.overdue}
          accent="rose"
        />
        <InstructivosStatusTable
          title="Instructivos pendientes"
          subtitle="Asignados sin completar"
          rows={instructivosStatus.pending}
          accent="amber"
        />
      </div>

      <WeeklyTrendChart data={weeklyTrend} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ScoreDistributionChart data={scoreDistribution} />
        <WeeklyVolumeChart data={weeklyTrend} />
      </div>

      <LevelExamTypeHeatmap data={heatmap} />

      <RetakesTable data={repeatExams} />

      <div className="grid gap-6 lg:grid-cols-2">
        <StrugglingStudentsTable data={studentsNeedingAttention} />
        <UpcomingExamsAgenda list={upcomingExams} />
      </div>
    </div>
  );
}
