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
import type { ExamenesInstructivosReportResponse } from "@/types/reports.examenes-instructivos";

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

function toRatio(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    return null;
  }
  return normalized / 100;
}

function adaptReportResponse(report: ExamenesInstructivosReportResponse): ExamsPanelData {
  const passRate = toRatio(report.summary.passRatePct);
  const avgScore = report.summary.avgScore;
  const firstAttemptRatio = toRatio(report.summary.firstAttemptPassRatePct);
  const completionRatio = toRatio(report.instructivosSummary.completionRate90d);

  const weeklyKpis: ExamWeeklyKpi[] = report.weeklyTrend.map((point) => ({
    week_start: point.weekStart,
    passed_count: point.passCount,
    failed_count: point.failCount,
    completed_count: point.examsCount,
    pass_rate: toRatio(point.passRatePct) ?? null,
  }));

  const scoreDistribution: ExamScoreDistribution[] = report.scoreDistribution.map((bin) => ({
    bin_5pt: bin.binLabel,
    n: bin.count,
  }));

  const retakes: ExamRetake[] = report.repeatExams.map((row) => ({
    student_id: row.studentId ?? 0,
    exam_type: row.examType,
    level: row.level,
    first_fail_at: "",
    first_score: null,
    retake_at: null,
    retake_score: null,
    retake_passed: null,
    days_to_retake: row.daysToRetakeAvg,
  }));

  const strugglingStudents: ExamStrugglingStudentDetail[] = report.studentsNeedingAttention.map((row) => ({
    student_id: row.studentId ?? 0,
    full_name: row.studentName,
    failed_exam_count: row.fails90d,
    max_consecutive_fails: row.fails90d,
    min_score_180d: null,
    open_instructivos: row.pendingInstructivos + row.overdueInstructivos,
    reason: row.overdueInstructivos > 0 ? "instructivo_overdue" : "multiple_failed_exams",
  }));

  const upcomingList: ExamUpcoming30dEntry[] = report.upcomingExams.map((row) => {
    const timeScheduled = row.scheduledAt;
    const local = row.scheduledLocal ?? timeScheduled;
    const examDate = local?.split("T")[0] ?? "";
    return {
      student_id: row.studentId ?? 0,
      full_name: row.studentName,
      time_scheduled: timeScheduled,
      time_scheduled_local: row.scheduledLocal ?? "",
      exam_date: examDate,
      exam_type: row.examType,
      level: row.level,
      status: row.status,
    };
  });

  return {
    passRate90d: passRate === null ? null : { pass_rate_90d: passRate },
    averageScore90d: avgScore === null || avgScore === undefined ? null : { average_score_90d: avgScore },
    firstAttemptPassRate: { first_attempt_pass_rate: firstAttemptRatio },
    instructiveCompliance:
      completionRatio === null
        ? null
        : {
            assigned_pct: null,
            completed_pct: completionRatio,
          },
    weeklyKpis,
    scoreDistribution,
    completedExams: [],
    retakes,
    strugglingStudents,
    upcomingCount: { upcoming_exams_30d: report.upcomingExams.length },
    upcomingList,
  };
}

export function ExamsPanelClient() {
  const [data, setData] = useState<ExamsPanelData | null>(null);
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
        setData(adaptReportResponse(result));
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

  if (error || !data) {
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
      <WeeklyTrendChart data={data.weeklyKpis} />

      {/* Score Distribution & Volume */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ScoreDistributionChart
          data={data.scoreDistribution}
          completedExams={data.completedExams}
        />
        <WeeklyVolumeChart data={data.weeklyKpis} />
      </div>

      {/* Level × Exam Type Heatmap */}
      <LevelExamTypeHeatmap data={data.completedExams} />

      {/* Tables */}
      <RetakesTable data={data.retakes} />
      <StrugglingStudentsTable data={data.strugglingStudents} />

      {/* Upcoming Exams Agenda */}
      <UpcomingExamsAgenda
        count={data.upcomingCount}
        list={data.upcomingList}
      />
    </div>
  );
}
