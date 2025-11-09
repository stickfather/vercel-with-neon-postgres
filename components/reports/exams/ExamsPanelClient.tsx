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
import { DrillDownDrawer } from "./DrillDownDrawer";
import type {
  ExamPassRate90d,
  ExamAverageScore90d,
  ExamFirstAttemptPassRate,
  ExamInstructiveCompliance,
  ExamWeeklyKpi,
  ExamScoreDistribution,
  ExamCompletedExam,
  ExamRetake,
  ExamStrugglingStudentDetail,
  ExamUpcoming30dCount,
  ExamUpcoming30dEntry,
} from "@/types/exams";

type ExamsPanelData = {
  passRate90d: ExamPassRate90d | null;
  averageScore90d: ExamAverageScore90d | null;
  firstAttemptPassRate: ExamFirstAttemptPassRate;
  instructiveCompliance: ExamInstructiveCompliance | null;
  weeklyKpis: ExamWeeklyKpi[];
  scoreDistribution: ExamScoreDistribution[];
  completedExams: ExamCompletedExam[];
  retakes: ExamRetake[];
  strugglingStudents: ExamStrugglingStudentDetail[];
  upcomingCount: ExamUpcoming30dCount | null;
  upcomingList: ExamUpcoming30dEntry[];
};

type DrillDownState = {
  isOpen: boolean;
  title: string;
  weekStart?: string;
  level?: string;
  examType?: string;
};

export function ExamsPanelClient() {
  const [data, setData] = useState<ExamsPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<DrillDownState>({
    isOpen: false,
    title: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/reports/exams");
        if (!response.ok) {
          throw new Error("Failed to fetch exams data");
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

  const handleOpenDrillDown = (params: {
    title: string;
    weekStart?: string;
    level?: string;
    examType?: string;
  }) => {
    setDrillDown({
      isOpen: true,
      ...params,
    });
  };

  const handleCloseDrillDown = () => {
    setDrillDown({ isOpen: false, title: "" });
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drillDown.isOpen) {
        handleCloseDrillDown();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [drillDown.isOpen]);

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
      {/* KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PassRateCard data={data.passRate90d} />
        <AverageScoreCard data={data.averageScore90d} />
        <FirstAttemptPassCard data={data.firstAttemptPassRate} />
        <InstructiveComplianceCard data={data.instructiveCompliance} />
      </div>

      {/* Weekly Trend Chart */}
      <WeeklyTrendChart
        data={data.weeklyKpis}
        onBarClick={handleOpenDrillDown}
      />

      {/* Score Distribution & Volume */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ScoreDistributionChart
          data={data.scoreDistribution}
          completedExams={data.completedExams}
        />
        <WeeklyVolumeChart data={data.weeklyKpis} />
      </div>

      {/* Level × Exam Type Heatmap */}
      <LevelExamTypeHeatmap
        data={data.completedExams}
        onCellClick={handleOpenDrillDown}
      />

      {/* Tables */}
      <RetakesTable data={data.retakes} />
      <StrugglingStudentsTable data={data.strugglingStudents} />

      {/* Upcoming Exams Agenda */}
      <UpcomingExamsAgenda
        count={data.upcomingCount}
        list={data.upcomingList}
      />

      {/* Drill-Down Drawer */}
      <DrillDownDrawer
        isOpen={drillDown.isOpen}
        title={drillDown.title}
        weekStart={drillDown.weekStart}
        level={drillDown.level}
        examType={drillDown.examType}
        onClose={handleCloseDrillDown}
      />
    </div>
  );
}
