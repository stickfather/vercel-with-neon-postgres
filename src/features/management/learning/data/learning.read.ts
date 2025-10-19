import { cache } from "react";

import { getSqlClient, normalizeRows } from "@/lib/db/client";
import type {
  LearnDashboardData,
  LearnFastLearnerRow,
  LearnFastestCompletionRow,
  LearnHeader,
  LearnLessonsHeatmapRow,
  LearnLevelMoveMatrixRow,
  LearnLevelupsWeeklyRow,
  LearnLeiDistributionRow,
  LearnOnpaceSplit,
  LearnOutcomesWeeklyRow,
  LearnProgressBandRow,
  LearnSlowLearnerRow,
  LearnCohortProgressRow,
} from "@/types/management.learning";

function normalizeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function normalizeNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text.length ? text : null;
}

function normalizeDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

const fetchLearnHeader = cache(async (): Promise<LearnHeader | null> => {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<LearnHeader>>(
    await sql`SELECT * FROM mgmt.learn_header_v LIMIT 1`,
  );
  if (!rows.length) return null;
  const row = rows[0];
  return {
    pct_on_pace: normalizeNullableNumber(row.pct_on_pace),
    avg_progress_pct: normalizeNullableNumber(row.avg_progress_pct),
    median_lei_30d: normalizeNullableNumber(row.median_lei_30d),
    median_months_to_finish: normalizeNullableNumber(row.median_months_to_finish),
    graduated_30d: normalizeNullableNumber(row.graduated_30d),
    early_exit_30d: normalizeNullableNumber(row.early_exit_30d),
  };
});

const fetchLearnOnpaceSplit = cache(async (): Promise<LearnOnpaceSplit | null> => {
  const sql = getSqlClient();
  try {
    const rows = normalizeRows<{ on_pace?: unknown; off_pace?: unknown }>(
      await sql`SELECT on_pace, off_pace FROM mgmt.learn_onpace_split_v LIMIT 1`,
    );
    if (!rows.length) return null;
    return {
      on_pace: normalizeNumber(rows[0]?.on_pace),
      off_pace: normalizeNumber(rows[0]?.off_pace),
    };
  } catch (error) {
    console.warn("learn_onpace_split_v not available", error);
    return null;
  }
});

async function fetchProgressBandsFiltered(): Promise<LearnProgressBandRow[]> {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<LearnProgressBandRow>>(
    await sql`
      SELECT level, band_0_33, band_34_66, band_67_99, band_100
      FROM mgmt.learn_progress_bands_v
      ORDER BY level
    `,
  );
  return rows.map((row) => ({
    level: normalizeString(row.level),
    band_0_33: normalizeNumber(row.band_0_33),
    band_34_66: normalizeNumber(row.band_34_66),
    band_67_99: normalizeNumber(row.band_67_99),
    band_100: normalizeNumber(row.band_100),
  }));
}

const fetchProgressBands = cache(fetchProgressBandsFiltered);

const fetchCohortProgress = cache(async (): Promise<LearnCohortProgressRow[]> => {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<LearnCohortProgressRow>>(
    await sql`
      SELECT cohort_month, months_since_start, avg_progress_pct
      FROM mgmt.learn_cohort_progress_v
      ORDER BY cohort_month, months_since_start
    `,
  );
  return rows.map((row) => ({
    cohort_month: normalizeString(row.cohort_month),
    months_since_start: normalizeNumber(row.months_since_start),
    avg_progress_pct: normalizeNullableNumber(row.avg_progress_pct),
  }));
});

async function fetchLeiDistributionByScope(
  scope: "overall" | "by_level",
): Promise<LearnLeiDistributionRow[]> {
  const sql = getSqlClient();
  if (scope === "overall") {
    const rows = normalizeRows<Partial<LearnLeiDistributionRow>>(
      await sql`
        SELECT scope, level, p10, p25, p50, p75, p90, n
        FROM mgmt.learn_lei_distribution_v
        WHERE scope = 'overall'
      `,
    );
    return rows.map((row) => ({
      scope: "overall",
      level: row.level ? normalizeString(row.level) : null,
      p10: normalizeNullableNumber(row.p10),
      p25: normalizeNullableNumber(row.p25),
      p50: normalizeNullableNumber(row.p50),
      p75: normalizeNullableNumber(row.p75),
      p90: normalizeNullableNumber(row.p90),
      n: normalizeNumber(row.n),
    }));
  }

  const rows = normalizeRows<Partial<LearnLeiDistributionRow>>(
    await sql`
      SELECT scope, level, p10, p25, p50, p75, p90, n
      FROM mgmt.learn_lei_distribution_v
      WHERE scope = 'by_level'
      ORDER BY level
    `,
  );
  return rows.map((row) => ({
    scope: "by_level",
    level: row.level ? normalizeString(row.level) : null,
    p10: normalizeNullableNumber(row.p10),
    p25: normalizeNullableNumber(row.p25),
    p50: normalizeNullableNumber(row.p50),
    p75: normalizeNullableNumber(row.p75),
    p90: normalizeNullableNumber(row.p90),
    n: normalizeNumber(row.n),
  }));
}

const fetchLeiOverall = cache(async () => {
  const rows = await fetchLeiDistributionByScope("overall");
  return rows.length ? rows[0] : null;
});

const fetchLeiByLevel = cache(async () => fetchLeiDistributionByScope("by_level"));

const fetchOutcomesWeekly = cache(async (): Promise<LearnOutcomesWeeklyRow[]> => {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<LearnOutcomesWeeklyRow>>(
    await sql`
      SELECT wk, graduados, retiros
      FROM mgmt.learn_outcomes_weekly_v
      ORDER BY wk
    `,
  );
  return rows.map((row) => ({
    wk: normalizeDateString(row.wk),
    graduados: normalizeNumber(row.graduados),
    retiros: normalizeNumber(row.retiros),
  }));
});

const fetchLevelupsWeekly = cache(async (): Promise<LearnLevelupsWeeklyRow[]> => {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<LearnLevelupsWeeklyRow>>(
    await sql`
      SELECT wk, levelups
      FROM mgmt.learn_levelups_weekly_v
      ORDER BY wk
    `,
  );
  return rows.map((row) => ({
    wk: normalizeDateString(row.wk),
    levelups: normalizeNumber(row.levelups),
  }));
});

const fetchLevelMoveMatrix = cache(async (): Promise<LearnLevelMoveMatrixRow[]> => {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<LearnLevelMoveMatrixRow>>(
    await sql`
      SELECT from_level, to_level, n
      FROM mgmt.learn_level_move_matrix_v
    `,
  );
  return rows.map((row) => ({
    from_level: normalizeString(row.from_level),
    to_level: normalizeString(row.to_level),
    n: normalizeNumber(row.n),
  }));
});

async function fetchLessonsHeatmapFiltered(): Promise<LearnLessonsHeatmapRow[]> {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<LearnLessonsHeatmapRow>>(
    await sql`
      SELECT level, lesson_id, p75_minutes_per_student, median_minutes_per_student, pct_slow_over_60, students
      FROM mgmt.learn_lessons_heatmap_v
      ORDER BY level, lesson_id
    `,
  );
  return rows.map((row) => ({
    level: normalizeString(row.level),
    lesson_id: normalizeString(row.lesson_id),
    p75_minutes_per_student: normalizeNullableNumber(row.p75_minutes_per_student),
    median_minutes_per_student: normalizeNullableNumber(row.median_minutes_per_student),
    pct_slow_over_60: normalizeNullableNumber(row.pct_slow_over_60),
    students: normalizeNullableNumber(row.students),
  }));
}

const fetchLessonsHeatmap = cache(fetchLessonsHeatmapFiltered);

async function fetchSlowestFiltered(): Promise<LearnSlowLearnerRow[]> {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<LearnSlowLearnerRow>>(
    await sql`
      SELECT full_name, level, hours_30d, progress_delta_30d, min_per_pct, lei_30d_plan, on_pace_plan, last_seen_date
      FROM mgmt.learn_slowest_20_v
    `,
  );
  return rows.map((row) => ({
    full_name: normalizeString(row.full_name),
    level: normalizeString(row.level),
    hours_30d: normalizeNullableNumber(row.hours_30d),
    progress_delta_30d: normalizeNullableNumber(row.progress_delta_30d),
    min_per_pct: normalizeNullableNumber(row.min_per_pct),
    lei_30d_plan: normalizeNullableNumber(row.lei_30d_plan),
    on_pace_plan: normalizeNullableString(row.on_pace_plan),
    last_seen_date: normalizeNullableString(row.last_seen_date),
  }));
}

const fetchSlowest = cache(fetchSlowestFiltered);

async function fetchFastestFiltered(): Promise<LearnFastLearnerRow[]> {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<LearnFastLearnerRow>>(
    await sql`
      SELECT full_name, level, hours_30d, progress_delta_30d, pct_per_hour, lei_30d_plan, on_pace_plan, last_seen_date
      FROM mgmt.learn_fastest_20_v
    `,
  );
  return rows.map((row) => ({
    full_name: normalizeString(row.full_name),
    level: normalizeString(row.level),
    hours_30d: normalizeNullableNumber(row.hours_30d),
    progress_delta_30d: normalizeNullableNumber(row.progress_delta_30d),
    pct_per_hour: normalizeNullableNumber(row.pct_per_hour),
    lei_30d_plan: normalizeNullableNumber(row.lei_30d_plan),
    on_pace_plan: normalizeNullableString(row.on_pace_plan),
    last_seen_date: normalizeNullableString(row.last_seen_date),
  }));
}

const fetchFastest = cache(fetchFastestFiltered);

const fetchFastestCompletions = cache(async (): Promise<LearnFastestCompletionRow[]> => {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<LearnFastestCompletionRow>>(
    await sql`
      SELECT full_name, final_level, months_to_complete, started_at, completed_at, lei_30d_plan
      FROM mgmt.learn_fastest_completions_20_v
    `,
  );
  return rows.map((row) => ({
    full_name: normalizeString(row.full_name),
    final_level: normalizeString(row.final_level),
    months_to_complete: normalizeNullableNumber(row.months_to_complete),
    started_at: normalizeNullableString(row.started_at),
    completed_at: normalizeNullableString(row.completed_at),
    lei_30d_plan: normalizeNullableNumber(row.lei_30d_plan),
  }));
});

function logAndFallback<T>(error: unknown, context: string, fallback: T): T {
  console.error(`Error loading management learning data for ${context}`, error);
  return fallback;
}

export async function getLearningDashboardData(): Promise<LearnDashboardData> {
  const [
    header,
    onpaceSplit,
    progressBands,
    cohortProgress,
    leiOverall,
    leiByLevel,
    outcomesWeekly,
    levelupsWeekly,
    levelMoveMatrix,
    lessonsHeatmap,
    slowest,
    fastest,
    fastestCompletions,
  ] = await Promise.all([
    fetchLearnHeader().catch((error) =>
      logAndFallback<LearnHeader | null>(error, "learn_header_v", null),
    ),
    fetchLearnOnpaceSplit().catch((error) =>
      logAndFallback<LearnOnpaceSplit | null>(error, "learn_onpace_split_v", null),
    ),
    fetchProgressBands().catch((error) =>
      logAndFallback<LearnProgressBandRow[]>(error, "learn_progress_bands_v", []),
    ),
    fetchCohortProgress().catch((error) =>
      logAndFallback<LearnCohortProgressRow[]>(error, "learn_cohort_progress_v", []),
    ),
    fetchLeiOverall().catch((error) =>
      logAndFallback<LearnLeiDistributionRow | null>(error, "learn_lei_distribution_v", null),
    ),
    fetchLeiByLevel().catch((error) =>
      logAndFallback<LearnLeiDistributionRow[]>(error, "learn_lei_distribution_v", []),
    ),
    fetchOutcomesWeekly().catch((error) =>
      logAndFallback<LearnOutcomesWeeklyRow[]>(error, "learn_outcomes_weekly_v", []),
    ),
    fetchLevelupsWeekly().catch((error) =>
      logAndFallback<LearnLevelupsWeeklyRow[]>(error, "learn_levelups_weekly_v", []),
    ),
    fetchLevelMoveMatrix().catch((error) =>
      logAndFallback<LearnLevelMoveMatrixRow[]>(error, "learn_level_move_matrix_v", []),
    ),
    fetchLessonsHeatmap().catch((error) =>
      logAndFallback<LearnLessonsHeatmapRow[]>(error, "learn_lessons_heatmap_v", []),
    ),
    fetchSlowest().catch((error) =>
      logAndFallback<LearnSlowLearnerRow[]>(error, "learn_slowest_20_v", []),
    ),
    fetchFastest().catch((error) =>
      logAndFallback<LearnFastLearnerRow[]>(error, "learn_fastest_20_v", []),
    ),
    fetchFastestCompletions().catch((error) =>
      logAndFallback<LearnFastestCompletionRow[]>(
        error,
        "learn_fastest_completions_20_v",
        [],
      ),
    ),
  ]);

  return {
    header,
    onpaceSplit,
    progressBands,
    cohortProgress,
    leiOverall,
    leiByLevel,
    outcomesWeekly,
    levelupsWeekly,
    levelMoveMatrix,
    lessonsHeatmap,
    slowest,
    fastest,
    fastestCompletions,
  };
}
