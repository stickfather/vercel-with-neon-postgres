import {
  getSqlClient,
  normalizeRows,
  type SqlRow,
} from "@/lib/db/client";
import type {
  DaysInLevelRow,
  DaysSinceProgressLevel,
  LearningReport,
  SpeedBucketRow,
  StuckHeatCell,
  TransitionPoint,
  TrendPoint,
  VarianceRow,
  VelocityLevel,
} from "@/types/reports.learning";

function pctChange(currAvg: number, prevAvg: number) {
  if (prevAvg === 0 || Number.isNaN(prevAvg)) return 0;
  return ((currAvg - prevAvg) / prevAvg) * 100;
}

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBucket(value: unknown): SpeedBucketRow["speed_bucket"] {
  const normalized = String(value ?? "Typical").toLowerCase();
  if (normalized === "fast") return "Fast";
  if (normalized === "slow") return "Slow";
  return "Typical";
}

function normalizeString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value);
  return str.length ? str : fallback;
}

function isMissingRelation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const pgError = error as { code?: string; message?: string };
  if (pgError.code && pgError.code.toUpperCase() === "42P01") return true;
  return typeof pgError.message === "string" && /does not exist/i.test(pgError.message);
}

async function queryWithFallback<T>(
  primary: () => Promise<T>,
  fallback?: () => Promise<T>,
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (fallback && isMissingRelation(error)) {
      return await fallback();
    }
    throw error;
  }
}

export async function getLearningReport(): Promise<LearningReport> {
  const sql = getSqlClient();

  // LEI trend (90d daily series)
  let leiTrendRows: Partial<TrendPoint>[] = [];
  try {
    leiTrendRows = normalizeRows<Partial<TrendPoint>>(await sql`
      SELECT snapshot_date, median_lei
      FROM mgmt.learning_lei_trend_v
      ORDER BY snapshot_date
    `);
  } catch (error) {
    if (isMissingRelation(error)) {
      console.warn("View not found for LEI trend, using fallback data");
    } else {
      throw error;
    }
  }
  const leiTrend: TrendPoint[] = leiTrendRows.map((row) => ({
    snapshot_date: normalizeString(row.snapshot_date),
    median_lei: row.median_lei === null || row.median_lei === undefined ? null : toNullableNumber(row.median_lei),
  }));

  const last30 = leiTrend.slice(-30).map((p) => p.median_lei ?? 0);
  const prev30 = leiTrend.slice(-60, -30).map((p) => p.median_lei ?? 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const leiPct = pctChange(avg(last30), avg(prev30));

  // Transitions (tile + sparkline)
  let transitionsRows: Partial<TransitionPoint>[] = [];
  try {
    transitionsRows = normalizeRows<Partial<TransitionPoint>>(await sql`
      SELECT d::text AS d, COUNT(*)::int AS n
      FROM mgmt.learning_level_transitions_30d_v
      GROUP BY d
      ORDER BY d
    `);
  } catch (error) {
    if (isMissingRelation(error)) {
      console.warn("View not found for Transitions, using fallback data");
    } else {
      throw error;
    }
  }
  const transitionsSeries: TransitionPoint[] = transitionsRows.map((row) => ({
    d: normalizeString(row.d),
    n: toNumber(row.n),
  }));
  const transitionsTotal = transitionsSeries.reduce((a, x) => a + Number(x.n), 0);

  // Days since progress (per level)
  const daysSinceRows = normalizeRows<Partial<DaysSinceProgressLevel>>(
    await queryWithFallback(
      () => sql`
        SELECT level::text AS level,
               student_count::int,
               avg_days_since_last_seen::numeric AS avg_days_since_last_seen,
               median_days_since_last_seen::numeric AS median_days_since_last_seen
        FROM learning_days_since_progress_v
        ORDER BY level
      `,
      () => sql`
        SELECT level::text AS level,
               student_count::int,
               avg_days_since_last_seen::numeric AS avg_days_since_last_seen,
               median_days_since_last_seen::numeric AS median_days_since_last_seen
        FROM mgmt.learning_days_since_progress_v
        ORDER BY level
      `,
    ),
  );
  const daysSince: DaysSinceProgressLevel[] = daysSinceRows.map((row) => ({
    level: normalizeString(row.level),
    student_count: toNumber(row.student_count),
    avg_days_since_last_seen: toNumber(row.avg_days_since_last_seen),
    median_days_since_last_seen: toNumber(row.median_days_since_last_seen),
  }));
  const allMedians: number[] = [];
  daysSince.forEach((r) => {
    const median = Number(r.median_days_since_last_seen);
    if (!Number.isFinite(median)) {
      return;
    }
    const count = Math.max(1, Number(r.student_count));
    for (let i = 0; i < count; i += 1) {
      allMedians.push(median);
    }
  });
  allMedians.sort((a, b) => a - b);
  const globalMedian = (() => {
    if (!allMedians.length) return 0;
    const mid = Math.floor(allMedians.length / 2);
    if (allMedians.length % 2) {
      return allMedians[mid];
    }
    return (allMedians[mid - 1] + allMedians[mid]) / 2;
  })();

  // At-risk list
  const atRiskRows = normalizeRows<Partial<LearningReport["at_risk"][number] & SqlRow>>(
    await queryWithFallback(
      () => sql`
        SELECT student_id, full_name, level::text AS level, current_seq,
               lei_30d_plan, last_seen_date, stall, inactive_14d
        FROM learning_at_risk_learners_v
        ORDER BY level, full_name
      `,
      () => sql`
        SELECT student_id, full_name, level::text AS level, current_seq,
               lei_30d_plan, last_seen_date, stall, inactive_14d
        FROM mgmt.learning_at_risk_learners_v
        ORDER BY level, full_name
      `,
    ),
  );
  const atRisk = atRiskRows.map((row) => ({
    student_id: toNumber(row.student_id),
    full_name: normalizeString(row.full_name, "Sin nombre"),
    level: normalizeString(row.level, "Sin nivel"),
    current_seq: row.current_seq === null || row.current_seq === undefined ? null : toNumber(row.current_seq),
    lei_30d_plan: toNullableNumber(row.lei_30d_plan),
    last_seen_date: row.last_seen_date ? normalizeString(row.last_seen_date) : null,
    stall: Boolean(row.stall),
    inactive_14d: Boolean(row.inactive_14d),
  }));

  // Speed buckets
  const bucketRows = normalizeRows<Partial<SpeedBucketRow>>(await sql`
    SELECT student_id, full_name, level::text AS level, current_seq, lei_30d_plan,
           percentile_lei, speed_bucket
    FROM mgmt.learning_speed_buckets_v
  `);
  const speedBuckets: SpeedBucketRow[] = bucketRows.map((row) => {
    const bucket = normalizeBucket(row.speed_bucket);
    return {
      student_id: toNumber(row.student_id),
      full_name: row.full_name === null || row.full_name === undefined ? null : String(row.full_name),
      level: row.level === null || row.level === undefined ? null : String(row.level),
      current_seq:
        row.current_seq === null || row.current_seq === undefined ? null : toNumber(row.current_seq),
      lei_30d_plan: toNullableNumber(row.lei_30d_plan),
      percentile_lei: toNumber(row.percentile_lei),
      speed_bucket: bucket,
    };
  });
  const bucketGroups: Record<"fast" | "typical" | "slow", SpeedBucketRow[]> = {
    fast: [],
    typical: [],
    slow: [],
  };
  speedBuckets.forEach((row) => {
    const key = row.speed_bucket.toLowerCase() as "fast" | "typical" | "slow";
    bucketGroups[key].push(row);
  });
  const totalBucket = Math.max(1, speedBuckets.length);
  const proportions = {
    fast_pct: Math.round((bucketGroups.fast.length / totalBucket) * 100),
    typical_pct: Math.round((bucketGroups.typical.length / totalBucket) * 100),
    slow_pct: Math.round((bucketGroups.slow.length / totalBucket) * 100),
  };

  // Velocity per level
  const velocityRows = normalizeRows<Partial<VelocityLevel>>(
    await queryWithFallback(
      () => sql`
        SELECT level::text AS level,
               lessons_completed_30d,
               active_students_level_30d,
               lessons_per_week_total,
               lessons_per_week_per_student
        FROM learning_level_completion_velocity_v
        ORDER BY level
      `,
      () => sql`
        SELECT level::text AS level,
               lessons_completed_30d,
               active_students_level_30d,
               lessons_per_week_total,
               lessons_per_week_per_student
        FROM mgmt.learning_level_completion_velocity_v
        ORDER BY level
      `,
    ),
  );
  const velocity = velocityRows.map((row) => ({
    level: normalizeString(row.level),
    lessons_completed_30d: toNumber(row.lessons_completed_30d),
    active_students_level_30d: toNumber(row.active_students_level_30d),
    lessons_per_week_total: toNumber(row.lessons_per_week_total),
    lessons_per_week_per_student: toNumber(row.lessons_per_week_per_student),
  }));

  // Stuck heatmap
  const heatRows = normalizeRows<Partial<StuckHeatCell>>(
    await queryWithFallback(
      () => sql`
        SELECT level::text AS level, current_seq, stuck_count
        FROM learning_stuck_heatmap_v
        ORDER BY level, current_seq
      `,
      () => sql`
        SELECT level::text AS level, current_seq, stuck_count
        FROM mgmt.learning_stuck_heatmap_v
        ORDER BY level, current_seq
      `,
    ),
  );
  const heat = heatRows.map((row) => ({
    level: normalizeString(row.level),
    current_seq: toNumber(row.current_seq),
    stuck_count: toNumber(row.stuck_count),
  }));

  // Days in level (mgmt)
  const daysInLevelRows = normalizeRows<Partial<DaysInLevelRow>>(await sql`
    SELECT level::text AS level, student_count, avg_days_in_level, median_days_in_level
    FROM mgmt.learning_days_in_level_v
    ORDER BY level
  `);
  const daysInLevel = daysInLevelRows.map((row) => ({
    level: normalizeString(row.level),
    student_count: toNumber(row.student_count),
    avg_days_in_level: toNumber(row.avg_days_in_level),
    median_days_in_level: toNumber(row.median_days_in_level),
  }));

  // Duration variance (top 100 from view)
  const varianceRows = normalizeRows<Partial<VarianceRow>>(
    await queryWithFallback(
      () => sql`
        SELECT student_id, full_name, lessons_completed_30d, avg_minutes_per_lesson, lesson_minutes_stddev
        FROM learning_lesson_variance_v
        ORDER BY lesson_minutes_stddev DESC
        LIMIT 100
      `,
      () => sql`
        SELECT student_id, full_name, lessons_completed_30d, avg_minutes_per_lesson, lesson_minutes_stddev
        FROM mgmt.learning_lesson_variance_v
        ORDER BY lesson_minutes_stddev DESC
        LIMIT 100
      `,
    ),
  );
  const variance = varianceRows.map((row) => ({
    student_id: toNumber(row.student_id),
    full_name: normalizeString(row.full_name, "Sin nombre"),
    lessons_completed_30d: toNumber(row.lessons_completed_30d),
    avg_minutes_per_lesson: toNumber(row.avg_minutes_per_lesson),
    lesson_minutes_stddev: toNumber(row.lesson_minutes_stddev),
  }));

  return {
    last_refreshed_at: new Date().toISOString(),
    lei_trend: leiTrend,
    lei_trend_pct_change_30d: Number(leiPct.toFixed(2)),
    transitions_30d_total: transitionsTotal,
    transitions_30d_series: transitionsSeries,
    days_since_progress: {
      global_median: Number(globalMedian.toFixed(2)),
      by_level: daysSince,
    },
    at_risk: atRisk,
    speed_buckets: {
      fast: bucketGroups.fast,
      typical: bucketGroups.typical,
      slow: bucketGroups.slow,
      proportions,
    },
    velocity_per_level: velocity,
    stuck_heatmap: heat,
    days_in_level: daysInLevel,
    duration_variance: variance,
  };
}
