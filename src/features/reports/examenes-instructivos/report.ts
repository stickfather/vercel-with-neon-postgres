import type { ExamenesInstructivosReportResponse } from "@/types/reports.examenes-instructivos";

export function createFallbackExamenesInstructivosReport(): ExamenesInstructivosReportResponse {
  return {
    summary: {
      passRatePct: null,
      avgScore: null,
      firstAttemptPassRatePct: null,
      avgScoreSparkline: [],
    },
    instructivosSummary: {
      assigned90d: null,
      completionRate90d: null,
      medianCompletionDays: null,
      completionHistogram: [],
    },
    instructivosStatus: {
      overdue: [],
      pending: [],
    },
    weeklyTrend: [],
    scoreDistribution: [],
    heatmap: [],
    repeatExams: [],
    studentsNeedingAttention: [],
    upcomingExams: [],
    fallback: true,
  };
}

export async function buildExamenesInstructivosReport(): Promise<ExamenesInstructivosReportResponse> {
  // Module 0 placeholder: return a safe fallback payload to keep the build green.
  return createFallbackExamenesInstructivosReport();
}
