import { getSqlClient, normalizeRows } from "@/lib/db/client";
import type {
  AttentionStudentRow,
  CompletionHistogramBin,
  ExamenesInstructivosReportResponse,
  HeatmapCell,
  InstructivoStatusRow,
  InstructivosSummary,
  RepeatExamRow,
  ScoreDistributionBin,
  UpcomingExamRow,
  WeeklyTrendPoint,
} from "@/types/reports.examenes-instructivos";

type SqlClient = ReturnType<typeof getSqlClient>;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInteger(value: unknown): number | null {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function toString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

function toIsoDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.length) return value;
  return null;
}

function logViewError(view: string, error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  console.warn(`[ExamenesInstructivos] ${view} unavailable.`, message);
}

async function loadOrFallback<T>(
  label: string,
  loader: () => Promise<T>,
  fallbackValue: T,
  fallbackReasons: string[],
): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    logViewError(label, error);
    fallbackReasons.push(label);
    return fallbackValue;
  }
}

const COMPLETION_BUCKETS: { label: string; min: number; max: number | null }[] = [
  { label: "0–3 días", min: 0, max: 3 },
  { label: "4–7 días", min: 4, max: 7 },
  { label: "8–14 días", min: 8, max: 14 },
  { label: "15–30 días", min: 15, max: 30 },
  { label: "30+ días", min: 31, max: null },
];

function buildCompletionHistogram(values: number[]): CompletionHistogramBin[] {
  const buckets: CompletionHistogramBin[] = COMPLETION_BUCKETS.map((bucket) => ({
    bucketLabel: bucket.label,
    count: 0,
  }));

  values.forEach((value) => {
    for (let index = 0; index < COMPLETION_BUCKETS.length; index += 1) {
      const bucket = COMPLETION_BUCKETS[index];
      const withinMin = value >= bucket.min;
      const withinMax = bucket.max === null ? true : value <= bucket.max;
      if (withinMin && withinMax) {
        buckets[index]!.count += 1;
        break;
      }
    }
  });

  return buckets;
}

async function fetchExamsSummary(
  sql: SqlClient,
  fallbackReasons: string[],
): Promise<ExamenesInstructivosReportResponse["summary"]> {
  const rows = await loadOrFallback(
    "final.exams_90d_summary_mv",
    async () =>
      normalizeRows<{
        exams_count: unknown;
        passed_count: unknown;
        failed_count: unknown;
        first_attempt_count: unknown;
        first_attempt_pass_count: unknown;
        avg_score: unknown;
      }>(
        await sql`
          SELECT
            SUM(exams_count) AS exams_count,
            SUM(passed_count) AS passed_count,
            SUM(failed_count) AS failed_count,
            SUM(first_attempt_count) AS first_attempt_count,
            SUM(first_attempt_pass_count) AS first_attempt_pass_count,
            AVG(avg_score) AS avg_score
          FROM final.exams_90d_summary_mv
        `,
      ),
    [],
    fallbackReasons,
  );

  const summaryRow = rows[0];

  if (!summaryRow) {
    return {
      passRatePct: null,
      avgScore: null,
      firstAttemptPassRatePct: null,
      avgScoreSparkline: [],
    };
  }

  const examsCount = toNumber(summaryRow.exams_count) ?? 0;
  const passedCount = toNumber(summaryRow.passed_count) ?? 0;
  const firstAttemptCount = toNumber(summaryRow.first_attempt_count) ?? 0;
  const firstAttemptPassCount = toNumber(summaryRow.first_attempt_pass_count) ?? 0;

  return {
    passRatePct: examsCount > 0 ? (passedCount / examsCount) * 100 : null,
    avgScore: toNumber(summaryRow.avg_score),
    firstAttemptPassRatePct: firstAttemptCount > 0 ? (firstAttemptPassCount / firstAttemptCount) * 100 : null,
    avgScoreSparkline: [],
  };
}

type WeeklyTrendLoadResult = {
  points: WeeklyTrendPoint[];
  sparkline: number[];
};

async function fetchWeeklyTrend(
  sql: SqlClient,
  fallbackReasons: string[],
): Promise<WeeklyTrendLoadResult> {
  const rows = await loadOrFallback(
    "final.exams_weekly_trend_90d_mv",
    async () =>
      normalizeRows<{
        week_start: unknown;
        pass_count: unknown;
        fail_count: unknown;
        exams_count: unknown;
        pass_rate_pct: unknown;
        avg_score: unknown;
      }>(
        await sql`
          SELECT
            week_start::date AS week_start,
            pass_count,
            fail_count,
            exams_count,
            pass_rate_pct,
            avg_score
          FROM final.exams_weekly_trend_90d_mv
          WHERE week_start >= (CURRENT_DATE - INTERVAL '120 days')
          ORDER BY week_start
        `,
      ),
    [],
    fallbackReasons,
  );

  const points: WeeklyTrendPoint[] = rows.map((row) => ({
    weekStart: toString(row.week_start),
    passCount: toInteger(row.pass_count) ?? 0,
    failCount: toInteger(row.fail_count) ?? 0,
    examsCount: toInteger(row.exams_count) ?? 0,
    passRatePct: toNumber(row.pass_rate_pct),
  }));

  const sparkline = rows
    .map((row) => toNumber(row.avg_score))
    .filter((value): value is number => value !== null);

  return { points, sparkline };
}

async function fetchInstructivosSummary(
  sql: SqlClient,
  fallbackReasons: string[],
): Promise<InstructivosSummary> {
  const rows = await loadOrFallback(
    "final.instructivos_90d_summary_mv",
    async () =>
      normalizeRows<{
        assigned_90d: unknown;
        completed_90d: unknown;
        not_completed_90d: unknown;
        avg_completion_days: unknown;
        median_completion_days: unknown;
      }>(
        await sql`
          SELECT
            assigned_90d,
            completed_90d,
            not_completed_90d,
            avg_completion_days,
            median_completion_days
          FROM final.instructivos_90d_summary_mv
          LIMIT 1
        `,
      ),
    [],
    fallbackReasons,
  );

  const row = rows[0];
  
  // Calculate completion rate from assigned and completed
  const assigned = row ? toInteger(row.assigned_90d) ?? 0 : 0;
  const completed = row ? toInteger(row.completed_90d) ?? 0 : 0;
  const completionRate = assigned > 0 ? (completed / assigned) * 100 : null;

  return {
    assigned90d: row ? toInteger(row.assigned_90d) : null,
    completionRate90d: completionRate,
    medianCompletionDays: row ? toNumber(row.median_completion_days) : null,
    completionHistogram: [],
  };
}

async function fetchCompletionHistogram(
  sql: SqlClient,
  fallbackReasons: string[],
): Promise<CompletionHistogramBin[]> {
  const rows = await loadOrFallback(
    "final.student_instructivos_enriched_v",
    async () =>
      normalizeRows<{ completion_days: unknown }>(
        await sql`
          SELECT completion_days
          FROM final.student_instructivos_enriched_v
          WHERE completion_days IS NOT NULL
        `,
      ),
    [],
    fallbackReasons,
  );

  const completionValues = rows
    .map((row) => toNumber(row.completion_days))
    .filter((value): value is number => value !== null && value >= 0);

  return buildCompletionHistogram(completionValues);
}

async function fetchInstructivosStatus(
  sql: SqlClient,
  fallbackReasons: string[],
): Promise<{
  overdue: InstructivoStatusRow[];
  pending: InstructivoStatusRow[];
}> {
  const rows = await loadOrFallback(
    "final.instructivos_status_mv",
    async () =>
      normalizeRows<{
        student_id: unknown;
        student_name: unknown;
        instructivo_id: unknown;
        instructivo_no: unknown;
        status_label: unknown;
        due_date: unknown;
        local_due_day: unknown;
        completed: unknown;
        completed_at: unknown;
        completion_days: unknown;
        is_overdue: unknown;
        is_pending: unknown;
      }>(
        await sql`
          SELECT
            student_id,
            student_name,
            instructivo_id,
            instructivo_no,
            status_label,
            due_date,
            local_due_day,
            completed,
            completed_at,
            completion_days,
            is_overdue,
            is_pending
          FROM final.instructivos_status_mv
          WHERE is_overdue OR is_pending
        `,
      ),
    [],
    fallbackReasons,
  );

  const statusRows: InstructivoStatusRow[] = rows.map((row) => ({
    studentId: toInteger(row.student_id),
    studentName: toString(row.student_name),
    instructivoId: toInteger(row.instructivo_id),
    statusLabel: toString(row.status_label),
    assignedAt: null, // Not available in the MV, can use created_at from enriched view if needed
    dueDate: toIsoDate(row.due_date),
    completedAt: toIsoDate(row.completed_at),
    daysOpen: toInteger(row.completion_days), // Use completion_days as proxy for days_open
    daysOverdue: null, // Not available in status_mv, would need calculation
    level: null, // Not available in status_mv
    examType: null, // Not available in status_mv
  }));

  return {
    overdue: statusRows.filter((row) => row.statusLabel === "overdue"),
    pending: statusRows.filter((row) => row.statusLabel === "pending"),
  };
}

async function fetchScoreDistribution(
  sql: SqlClient,
  fallbackReasons: string[],
): Promise<ScoreDistributionBin[]> {
  const rows = await loadOrFallback(
    "final.exams_score_distribution_90d_mv",
    async () =>
      normalizeRows<{ score_bucket_start: unknown; exams_count: unknown }>(
        await sql`
          SELECT score_bucket_start, exams_count
          FROM final.exams_score_distribution_90d_mv
        `,
      ),
    [],
    fallbackReasons,
  );

  return rows
    .map((row) => ({
      binLabel: toString(row.score_bucket_start),
      count: toInteger(row.exams_count) ?? 0,
      sortKey: toInteger(row.score_bucket_start) ?? 0,
    }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ binLabel, count }) => ({ binLabel, count }));
}

async function fetchHeatmap(
  sql: SqlClient,
  fallbackReasons: string[],
): Promise<HeatmapCell[]> {
  const rows = await loadOrFallback(
    "final.exams_level_type_heatmap_mv",
    async () =>
      normalizeRows<{
        level: unknown;
        exam_type: unknown;
        avg_score: unknown;
        exams_count: unknown;
      }>(
        await sql`
          SELECT level, exam_type, avg_score, exams_count
          FROM final.exams_level_type_heatmap_mv
        `,
      ),
    [],
    fallbackReasons,
  );

  return rows.map((row) => ({
    level: toString(row.level),
    examType: toString(row.exam_type),
    avgScore: toNumber(row.avg_score),
    examsCount: toInteger(row.exams_count) ?? 0,
    passRatePct: null,
  }));
}

async function fetchRepeatExams(
  sql: SqlClient,
  fallbackReasons: string[],
): Promise<RepeatExamRow[]> {
  const rows = await loadOrFallback(
    "final.exams_repeat_summary_90d_mv",
    async () =>
      normalizeRows<{
        student_id: unknown;
        student_name: unknown;
        level: unknown;
        exam_type: unknown;
        attempts_90d: unknown;
        passes_90d: unknown;
        fails_90d: unknown;
      }>(
        await sql`
          SELECT
            student_id,
            student_name,
            level,
            exam_type,
            attempts_90d,
            passes_90d,
            fails_90d
          FROM final.exams_repeat_summary_90d_mv
        `,
      ),
    [],
    fallbackReasons,
  );

  return rows.map((row) => ({
    studentId: toInteger(row.student_id),
    studentName: toString(row.student_name),
    level: toString(row.level),
    examType: toString(row.exam_type),
    retakeCount: toInteger(row.attempts_90d) ?? 0,
    daysToRetakeAvg: null,
    scoreDelta: null,
  }));
}

async function fetchStudentsNeedingAttention(
  sql: SqlClient,
  fallbackReasons: string[],
): Promise<AttentionStudentRow[]> {
  const rows = await loadOrFallback(
    "final.exams_students_attention_180d_mv",
    async () =>
      normalizeRows<{
        student_id: unknown;
        student_name: unknown;
        student_status: unknown;
        student_archived: unknown;
        has_recent_fail: unknown;
        has_overdue_instructivos: unknown;
        has_overdue_exams: unknown;
      }>(
        await sql`
          SELECT
            student_id,
            student_name,
            student_status,
            student_archived,
            has_recent_fail,
            has_overdue_instructivos,
            has_overdue_exams
          FROM final.exams_students_attention_180d_mv
        `,
      ),
    [],
    fallbackReasons,
  );

  return rows.map((row) => ({
    studentId: toInteger(row.student_id),
    studentName: toString(row.student_name),
    level: null,
    examType: null,
    fails90d: row.has_recent_fail ? 1 : 0,
    pendingInstructivos: 0,
    overdueInstructivos: row.has_overdue_instructivos ? 1 : 0,
    lastExamDate: null,
  }));
}

async function fetchUpcomingExams(
  sql: SqlClient,
  fallbackReasons: string[],
): Promise<UpcomingExamRow[]> {
  const rows = await loadOrFallback(
    "final.exams_upcoming_30d_mv",
    async () =>
      normalizeRows<{
        exam_id: unknown;
        student_id: unknown;
        student_name: unknown;
        level: unknown;
        exam_type: unknown;
        scheduled_at: unknown;
        scheduled_local: unknown;
        status: unknown;
      }>(
        await sql`
          SELECT
            exam_id,
            student_id,
            student_name,
            level,
            exam_type,
            scheduled_at,
            scheduled_local,
            status
          FROM final.exams_upcoming_30d_mv
          ORDER BY scheduled_at
        `,
      ),
    [],
    fallbackReasons,
  );

  return rows.map((row) => ({
    examId: toInteger(row.exam_id),
    studentId: toInteger(row.student_id),
    studentName: toString(row.student_name),
    level: toString(row.level),
    examType: toString(row.exam_type),
    scheduledAt: toIsoDate(row.scheduled_at) ?? "",
    scheduledLocal: toIsoDate(row.scheduled_local),
    status: toString(row.status),
  }));
}

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
  const sql = getSqlClient();
  const fallbackReasons: string[] = [];

  const [summary, weeklyTrendResult, instructivosSummary, instructivosHistogram, instructivosStatus, scoreDistribution, heatmap, repeatExams, studentsNeedingAttention, upcomingExams] =
    await Promise.all([
      fetchExamsSummary(sql, fallbackReasons),
      fetchWeeklyTrend(sql, fallbackReasons),
      fetchInstructivosSummary(sql, fallbackReasons),
      fetchCompletionHistogram(sql, fallbackReasons),
      fetchInstructivosStatus(sql, fallbackReasons),
      fetchScoreDistribution(sql, fallbackReasons),
      fetchHeatmap(sql, fallbackReasons),
      fetchRepeatExams(sql, fallbackReasons),
      fetchStudentsNeedingAttention(sql, fallbackReasons),
      fetchUpcomingExams(sql, fallbackReasons),
    ]);

  const report: ExamenesInstructivosReportResponse = {
    summary: {
      ...summary,
      avgScoreSparkline: weeklyTrendResult.sparkline,
    },
    instructivosSummary: {
      ...instructivosSummary,
      completionHistogram: instructivosHistogram,
    },
    instructivosStatus,
    weeklyTrend: weeklyTrendResult.points,
    scoreDistribution,
    heatmap,
    repeatExams,
    studentsNeedingAttention,
    upcomingExams,
    fallback: fallbackReasons.length > 0,
  };

  return report;
}
