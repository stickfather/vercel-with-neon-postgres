import { getSqlClient, normalizeRows, type SqlRow } from "@/lib/db/client";
import type {
  ExamPassRate90d,
  ExamAverageScore90d,
  ExamFirstAttemptData,
  ExamInstructiveFollowup,
  ExamInstructiveCompliance,
  ExamWeeklyKpi,
  ExamScoreDistribution,
  ExamCompletedExam,
  ExamRetake,
  ExamStrugglingStudentDetail,
  ExamUpcoming30dCount,
  ExamUpcoming30dEntry,
  ExamFirstAttemptPassRate,
} from "@/types/exams";

type SqlClient = ReturnType<typeof getSqlClient>;

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) return null;
    const parsed = Number(trimmed.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeString(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : "";
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return "";
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    return lower === "true" || lower === "t" || lower === "1" || lower === "yes";
  }
  return false;
}

async function safeRows(
  runner: () => Promise<unknown>,
  label: string,
): Promise<SqlRow[]> {
  try {
    const result = await runner();
    return normalizeRows<SqlRow>(result);
  } catch (error) {
    console.warn(`No se pudo cargar la vista ${label}`, error);
    return [];
  }
}

// ============================================================================
// KPI: Pass Rate (90d)
// ============================================================================
export async function getPassRate90d(
  sql: SqlClient = getSqlClient(),
): Promise<ExamPassRate90d | null> {
  const rows = await safeRows(
    () => sql`SELECT * FROM mgmt.exam_overall_pass_rate_90d_v LIMIT 1`,
    "mgmt.exam_overall_pass_rate_90d_v",
  );

  if (!rows.length) {
    // Compute fallback
    const fallbackRows = await safeRows(
      () => sql`
        SELECT
          COUNT(*) FILTER (WHERE is_passed) ::numeric
          / NULLIF(COUNT(*),0) ::numeric AS pass_rate_90d
        FROM mgmt.exam_completed_exams_v
        WHERE exam_date >= (current_date - interval '90 days')
      `,
      "computed pass_rate_90d",
    );
    if (!fallbackRows.length) return null;
    const row = fallbackRows[0];
    return { pass_rate_90d: normalizeNumber(row.pass_rate_90d) };
  }

  const row = rows[0];
  return { pass_rate_90d: normalizeNumber(row.pass_rate_90d) };
}

// ============================================================================
// KPI: Average Score (90d)
// ============================================================================
export async function getAverageScore90d(
  sql: SqlClient = getSqlClient(),
): Promise<ExamAverageScore90d | null> {
  const rows = await safeRows(
    () => sql`SELECT * FROM mgmt.exam_average_score_90d_v LIMIT 1`,
    "mgmt.exam_average_score_90d_v",
  );

  if (!rows.length) {
    // Compute fallback
    const fallbackRows = await safeRows(
      () => sql`
        SELECT AVG(score)::numeric(10,2) AS average_score_90d
        FROM mgmt.exam_completed_exams_v
        WHERE score IS NOT NULL
          AND exam_date >= (current_date - interval '90 days')
      `,
      "computed average_score_90d",
    );
    if (!fallbackRows.length) return null;
    const row = fallbackRows[0];
    return { average_score_90d: normalizeNumber(row.average_score_90d) };
  }

  const row = rows[0];
  return { average_score_90d: normalizeNumber(row.average_score_90d) };
}

// ============================================================================
// KPI: First-Attempt Pass Rate (90d) - Data Fetch
// ============================================================================
export async function getFirstAttemptData(
  sql: SqlClient = getSqlClient(),
): Promise<ExamFirstAttemptData[]> {
  const rows = await safeRows(
    () => sql`
      SELECT student_id, exam_type, level, time_scheduled_local, is_passed
      FROM mgmt.exam_completed_exams_v
      WHERE exam_date >= (current_date - interval '90 days')
      ORDER BY time_scheduled_local ASC
    `,
    "first_attempt_data",
  );

  return rows.map((row): ExamFirstAttemptData => ({
    student_id: normalizeNumber(row.student_id) ?? 0,
    exam_type: normalizeString(row.exam_type),
    level: normalizeString(row.level),
    time_scheduled_local: normalizeString(row.time_scheduled_local),
    is_passed: normalizeBoolean(row.is_passed),
  }));
}

// Compute first-attempt pass rate on the frontend or backend
export function computeFirstAttemptPassRate(
  data: ExamFirstAttemptData[],
): ExamFirstAttemptPassRate {
  // Group by (student_id, exam_type, level)
  const groups = new Map<string, ExamFirstAttemptData[]>();

  data.forEach((item) => {
    const key = `${item.student_id}|${item.exam_type}|${item.level}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  });

  // For each group, find the earliest attempt
  let passedCount = 0;
  let totalCount = 0;

  groups.forEach((attempts) => {
    if (attempts.length === 0) return;
    // Sort by time_scheduled_local and take first
    attempts.sort(
      (a, b) =>
        new Date(a.time_scheduled_local).getTime() -
        new Date(b.time_scheduled_local).getTime(),
    );
    const firstAttempt = attempts[0];
    if (firstAttempt.is_passed) passedCount++;
    totalCount++;
  });

  const rate = totalCount > 0 ? passedCount / totalCount : null;
  return { first_attempt_pass_rate: rate };
}

// ============================================================================
// KPI: Instructive Compliance (90d)
// ============================================================================
export async function getInstructiveCompliance(
  sql: SqlClient = getSqlClient(),
): Promise<ExamInstructiveCompliance | null> {
  const rows = await safeRows(
    () => sql`
      SELECT assigned, completed
      FROM mgmt.exam_instructivo_followup_v
      WHERE failed_at >= (now() - interval '90 days')
    `,
    "mgmt.exam_instructivo_followup_v",
  );

  if (!rows.length) return null;

  // Compute percentages
  let assignedSum = 0;
  let completedSum = 0;
  let count = 0;

  rows.forEach((row) => {
    if (normalizeBoolean(row.assigned)) assignedSum++;
    if (normalizeBoolean(row.completed)) completedSum++;
    count++;
  });

  const assigned_pct = count > 0 ? assignedSum / count : null;
  const completed_pct = count > 0 ? completedSum / count : null;

  return { assigned_pct, completed_pct };
}

// ============================================================================
// Chart: Weekly KPIs (90d)
// ============================================================================
export async function getWeeklyKpis(
  sql: SqlClient = getSqlClient(),
): Promise<ExamWeeklyKpi[]> {
  const rows = await safeRows(
    () => sql`
      SELECT week_start, passed_count, failed_count, completed_count, pass_rate
      FROM mgmt.exam_weekly_kpis_v
      WHERE week_start >= (current_date - interval '90 days')
      ORDER BY week_start ASC
    `,
    "mgmt.exam_weekly_kpis_v",
  );

  return rows.map((row): ExamWeeklyKpi => ({
    week_start: normalizeString(row.week_start),
    passed_count: normalizeNumber(row.passed_count) ?? 0,
    failed_count: normalizeNumber(row.failed_count) ?? 0,
    completed_count: normalizeNumber(row.completed_count) ?? 0,
    pass_rate: normalizeNumber(row.pass_rate),
  }));
}

// ============================================================================
// Chart: Score Distribution (90d)
// ============================================================================
export async function getScoreDistribution(
  sql: SqlClient = getSqlClient(),
): Promise<ExamScoreDistribution[]> {
  const rows = await safeRows(
    () => sql`
      SELECT bin_5pt, n
      FROM mgmt.exam_score_dist_90d_v
      ORDER BY bin_5pt
    `,
    "mgmt.exam_score_dist_90d_v",
  );

  if (rows.length > 0) {
    return rows.map((row): ExamScoreDistribution => ({
      bin_5pt: normalizeString(row.bin_5pt),
      n: normalizeNumber(row.n) ?? 0,
    }));
  }

  // Fallback: compute from completed exams
  const fallbackRows = await safeRows(
    () => sql`
      SELECT
        FLOOR(score / 5) * 5 AS bin_start,
        COUNT(*) AS n
      FROM mgmt.exam_completed_exams_v
      WHERE score IS NOT NULL
        AND exam_date >= (current_date - interval '90 days')
      GROUP BY FLOOR(score / 5)
      ORDER BY bin_start
    `,
    "computed score distribution",
  );

  return fallbackRows.map((row): ExamScoreDistribution => {
    const binStart = normalizeNumber(row.bin_start) ?? 0;
    const binEnd = binStart + 5;
    return {
      bin_5pt: `${binStart}-${binEnd}`,
      n: normalizeNumber(row.n) ?? 0,
    };
  });
}

// ============================================================================
// Chart: Heatmap Data (Level × Exam Type)
// ============================================================================
export async function getCompletedExamsForHeatmap(
  sql: SqlClient = getSqlClient(),
): Promise<ExamCompletedExam[]> {
  const rows = await safeRows(
    () => sql`
      SELECT
        exam_id, student_id, full_name, exam_type, level,
        time_scheduled, time_scheduled_local, exam_date,
        score, is_passed
      FROM mgmt.exam_completed_exams_v
      WHERE score IS NOT NULL
        AND exam_date >= (current_date - interval '90 days')
    `,
    "completed_exams_for_heatmap",
  );

  return rows.map((row): ExamCompletedExam => ({
    exam_id: normalizeNumber(row.exam_id) ?? 0,
    student_id: normalizeNumber(row.student_id) ?? 0,
    full_name: normalizeString(row.full_name),
    exam_type: normalizeString(row.exam_type),
    level: normalizeString(row.level),
    time_scheduled: normalizeString(row.time_scheduled),
    time_scheduled_local: normalizeString(row.time_scheduled_local),
    exam_date: normalizeString(row.exam_date),
    score: normalizeNumber(row.score),
    is_passed: normalizeBoolean(row.is_passed),
  }));
}

// ============================================================================
// Table: Retakes Overview (90d)
// ============================================================================
export async function getRetakes(
  sql: SqlClient = getSqlClient(),
): Promise<ExamRetake[]> {
  const rows = await safeRows(
    () => sql`
      SELECT
        student_id, exam_type, level,
        first_fail_at, first_score,
        retake_at, retake_score, retake_passed,
        days_to_retake
      FROM mgmt.exam_retakes_v
      WHERE first_fail_at >= (now() - interval '90 days')
      ORDER BY retake_at NULLS LAST, first_fail_at DESC
    `,
    "mgmt.exam_retakes_v",
  );

  return rows.map((row): ExamRetake => ({
    student_id: normalizeNumber(row.student_id) ?? 0,
    exam_type: normalizeString(row.exam_type),
    level: normalizeString(row.level),
    first_fail_at: normalizeString(row.first_fail_at),
    first_score: normalizeNumber(row.first_score),
    retake_at: row.retake_at ? normalizeString(row.retake_at) : null,
    retake_score: normalizeNumber(row.retake_score),
    retake_passed: row.retake_passed !== null ? normalizeBoolean(row.retake_passed) : null,
    days_to_retake: normalizeNumber(row.days_to_retake),
  }));
}

// ============================================================================
// Table: Students Requiring Attention (180d)
// ============================================================================
export async function getStrugglingStudents(
  sql: SqlClient = getSqlClient(),
): Promise<ExamStrugglingStudentDetail[]> {
  const rows = await safeRows(
    () => sql`
      SELECT
        student_id, full_name, failed_exam_count,
        max_consecutive_fails, min_score_180d,
        open_instructivos, reason
      FROM mgmt.exam_students_struggling_v
      ORDER BY max_consecutive_fails DESC,
               failed_exam_count DESC,
               min_score_180d ASC,
               full_name
      LIMIT 20
    `,
    "mgmt.exam_students_struggling_v",
  );

  return rows.map((row): ExamStrugglingStudentDetail => ({
    student_id: normalizeNumber(row.student_id) ?? 0,
    full_name: normalizeString(row.full_name),
    failed_exam_count: normalizeNumber(row.failed_exam_count) ?? 0,
    max_consecutive_fails: normalizeNumber(row.max_consecutive_fails) ?? 0,
    min_score_180d: normalizeNumber(row.min_score_180d),
    open_instructivos: normalizeNumber(row.open_instructivos) ?? 0,
    reason: normalizeString(row.reason),
  }));
}

// ============================================================================
// Upcoming Exams (30d)
// ============================================================================
export async function getUpcomingCount(
  sql: SqlClient = getSqlClient(),
): Promise<ExamUpcoming30dCount | null> {
  const rows = await safeRows(
    () => sql`SELECT upcoming_exams_30d FROM mgmt.exam_upcoming_30d_v LIMIT 1`,
    "mgmt.exam_upcoming_30d_v",
  );

  if (!rows.length) return null;
  return { upcoming_exams_30d: normalizeNumber(rows[0].upcoming_exams_30d) ?? 0 };
}

export async function getUpcomingList(
  sql: SqlClient = getSqlClient(),
): Promise<ExamUpcoming30dEntry[]> {
  const rows = await safeRows(
    () => sql`
      SELECT
        student_id, full_name, time_scheduled, time_scheduled_local,
        exam_date, exam_type, level, status
      FROM mgmt.exam_upcoming_30d_list_v
      ORDER BY time_scheduled ASC
    `,
    "mgmt.exam_upcoming_30d_list_v",
  );

  return rows.map((row): ExamUpcoming30dEntry => ({
    student_id: normalizeNumber(row.student_id) ?? 0,
    full_name: normalizeString(row.full_name),
    time_scheduled: normalizeString(row.time_scheduled),
    time_scheduled_local: normalizeString(row.time_scheduled_local),
    exam_date: normalizeString(row.exam_date),
    exam_type: normalizeString(row.exam_type),
    level: normalizeString(row.level),
    status: normalizeString(row.status),
  }));
}

// ============================================================================
// Drill-down: Get exams for a specific week or heatmap cell
// ============================================================================
export async function getDrillDownExams(
  weekStart: string | null,
  level: string | null,
  examType: string | null,
  sql: SqlClient = getSqlClient(),
): Promise<ExamCompletedExam[]> {
  let query;
  
  if (weekStart) {
    // Weekly drill-down
    query = sql`
      SELECT
        exam_id, student_id, full_name, exam_type, level,
        time_scheduled, time_scheduled_local, exam_date,
        score, is_passed
      FROM mgmt.exam_completed_exams_v
      WHERE time_scheduled_local >= ${weekStart}::timestamp
        AND time_scheduled_local < (${weekStart}::timestamp + interval '7 days')
      ORDER BY time_scheduled_local ASC
    `;
  } else if (level && examType) {
    // Heatmap cell drill-down
    query = sql`
      SELECT
        exam_id, student_id, full_name, exam_type, level,
        time_scheduled, time_scheduled_local, exam_date,
        score, is_passed
      FROM mgmt.exam_completed_exams_v
      WHERE level = ${level}
        AND exam_type = ${examType}
        AND exam_date >= (current_date - interval '90 days')
      ORDER BY time_scheduled_local DESC
    `;
  } else {
    return [];
  }

  const rows = await safeRows(() => query, "drill_down_exams");

  return rows.map((row): ExamCompletedExam => ({
    exam_id: normalizeNumber(row.exam_id) ?? 0,
    student_id: normalizeNumber(row.student_id) ?? 0,
    full_name: normalizeString(row.full_name),
    exam_type: normalizeString(row.exam_type),
    level: normalizeString(row.level),
    time_scheduled: normalizeString(row.time_scheduled),
    time_scheduled_local: normalizeString(row.time_scheduled_local),
    exam_date: normalizeString(row.exam_date),
    score: normalizeNumber(row.score),
    is_passed: normalizeBoolean(row.is_passed),
  }));
}
