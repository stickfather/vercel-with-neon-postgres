import { getSqlClient, normalizeRows } from "@/lib/db/client";
import type {
  LearningPanelData,
  LeiKpiData,
  SpeedBucketsData,
  DaysInLevelData,
  DaysSinceProgressData,
  StuckHeatmapCell,
  LessonDurationStat,
  VelocityByLevel,
  LeiWeeklyData,
  AtRiskLearner,
  MicroKpi7d,
  StuckStudent,
  DurationSessionDetail,
  LearningLeiDaily,
} from "@/types/learning-panel";

// Utility functions
function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

// MODULE 2: LEI (Latest 7-day Avg) + Sparkline (90d)
export async function getLeiKpiData(): Promise<LeiKpiData> {
  const sql = getSqlClient();

  const rows = normalizeRows<LearningLeiDaily>(await sql`
    SELECT activity_date::text, total_completed_lessons, total_study_minutes
    FROM mgmt.learning_lei_daily_v
    WHERE activity_date >= (current_date - INTERVAL '90 days')
    ORDER BY activity_date
  `);

  // Calculate LEI daily
  const dailyData = rows.map((row) => {
    const lei = toNumber(row.total_completed_lessons) / Math.max(toNumber(row.total_study_minutes) / 60.0, 0.1);
    return {
      activity_date: toString(row.activity_date),
      lei_daily: lei,
      total_study_minutes: toNumber(row.total_study_minutes),
      total_completed_lessons: toNumber(row.total_completed_lessons),
    };
  });

  // Last 7 days average
  const last7 = dailyData.slice(-7);
  const lei_7d_avg = last7.length > 0
    ? last7.reduce((sum, d) => sum + d.lei_daily, 0) / last7.length
    : 0;

  // Aggregate to ISO weeks for sparkline
  const weeklyMap = new Map<string, { minutes: number; completions: number }>();
  
  dailyData.forEach((d) => {
    const date = new Date(d.activity_date);
    const dayOfWeek = date.getUTCDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() + diff);
    const weekStart = monday.toISOString().split('T')[0];

    if (!weeklyMap.has(weekStart)) {
      weeklyMap.set(weekStart, { minutes: 0, completions: 0 });
    }
    const week = weeklyMap.get(weekStart)!;
    week.minutes += d.total_study_minutes;
    week.completions += d.total_completed_lessons;
  });

  const sparkline_90d = Array.from(weeklyMap.entries())
    .map(([week_start, data]) => ({
      week_start,
      lei_week: data.completions / Math.max(data.minutes / 60.0, 0.1),
    }))
    .sort((a, b) => a.week_start.localeCompare(b.week_start));

  return {
    lei_7d_avg: Number(lei_7d_avg.toFixed(2)),
    sparkline_90d,
  };
}

// MODULE 3: Speed Buckets (90d)
export async function getSpeedBucketsData(): Promise<SpeedBucketsData> {
  const sql = getSqlClient();

  const rows = normalizeRows<{ bucket: string; n: number }>(await sql`
    SELECT bucket, COUNT(*) AS n
    FROM mgmt.learning_speed_buckets_90d_v
    GROUP BY bucket
  `);

  const buckets = { fast: 0, typical: 0, slow: 0 };
  rows.forEach((row) => {
    const bucket = toString(row.bucket).toLowerCase();
    if (bucket === "fast") buckets.fast = toNumber(row.n);
    else if (bucket === "typical") buckets.typical = toNumber(row.n);
    else if (bucket === "slow") buckets.slow = toNumber(row.n);
  });

  const total = Math.max(1, buckets.fast + buckets.typical + buckets.slow);
  
  return {
    ...buckets,
    fast_pct: Math.round((buckets.fast / total) * 100),
    typical_pct: Math.round((buckets.typical / total) * 100),
    slow_pct: Math.round((buckets.slow / total) * 100),
  };
}

// MODULE 4: Median Days in Level (current)
export async function getDaysInLevelData(): Promise<DaysInLevelData> {
  const sql = getSqlClient();

  const rows = normalizeRows<{ level: string; median_days_in_level: number }>(await sql`
    SELECT level::text, median_days_in_level
    FROM learning_days_in_level_v
    ORDER BY level
  `);

  const by_level = rows.map((row) => ({
    level: toString(row.level),
    median_days_in_level: toNumber(row.median_days_in_level),
  }));

  // Calculate overall median (median of medians)
  const medians = by_level.map(l => l.median_days_in_level).sort((a, b) => a - b);
  const overall_median = medians.length > 0
    ? medians.length % 2 === 0
      ? (medians[medians.length / 2 - 1] + medians[medians.length / 2]) / 2
      : medians[Math.floor(medians.length / 2)]
    : 0;

  return {
    overall_median: Number(overall_median.toFixed(0)),
    by_level,
  };
}

// MODULE 5: Median Days Since Last Progress (90d)
export async function getDaysSinceProgressData(): Promise<DaysSinceProgressData> {
  const sql = getSqlClient();

  const rows = normalizeRows<{ median_days_since_progress: number }>(await sql`
    SELECT
      percentile_disc(0.5) WITHIN GROUP (ORDER BY days_since_last_completed_lesson)
        AS median_days_since_progress
    FROM mgmt.learning_last_progress_90d_v
  `);

  return {
    median_days: rows.length > 0 ? toNumber(rows[0].median_days_since_progress) : 0,
  };
}

// MODULE 6: Stuck Students Heatmap (90d)
export async function getStuckHeatmapData(): Promise<StuckHeatmapCell[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<{ level: string; lesson_name: string; stuck_count: number }>(await sql`
    SELECT level::text, lesson_name, stuck_count
    FROM mgmt.learning_stuck_heatmap_90d_v
    ORDER BY level, lesson_name
  `);

  return rows.map((row) => ({
    level: toString(row.level),
    lesson_name: toString(row.lesson_name),
    stuck_count: toNumber(row.stuck_count),
  }));
}

// MODULE 6 (Drill-down): Get stuck students for a specific cell
export async function getStuckStudentsDrilldown(
  level: string,
  lesson_name: string
): Promise<StuckStudent[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<StuckStudent>(await sql`
    SELECT student_id, full_name, level::text, current_seq, 
           last_seen_date::text, stall, inactive_14d
    FROM mgmt.learning_stuck_students_90d_v
    WHERE level = ${level}
      AND CONCAT('Lesson ', current_seq::text) = ${lesson_name}
    ORDER BY last_seen_date DESC, full_name
  `);

  return rows.map((row) => ({
    student_id: toNumber(row.student_id),
    full_name: toString(row.full_name),
    level: toString(row.level),
    current_seq: toNumber(row.current_seq),
    last_seen_date: row.last_seen_date ? toString(row.last_seen_date) : null,
    stall: Boolean(row.stall),
    inactive_14d: Boolean(row.inactive_14d),
  }));
}

// MODULE 7: Lesson Duration Variance (Top 20, 90d)
export async function getDurationVarianceData(): Promise<LessonDurationStat[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<LessonDurationStat>(await sql`
    SELECT level::text, lesson_name, n_sessions, avg_minutes, 
           stddev_minutes, variance_minutes
    FROM mgmt.learning_duration_stats_90d_v
    ORDER BY variance_minutes DESC
    LIMIT 20
  `);

  return rows.map((row) => ({
    level: toString(row.level),
    lesson_name: toString(row.lesson_name),
    n_sessions: toNumber(row.n_sessions),
    avg_minutes: toNumber(row.avg_minutes),
    stddev_minutes: toNumber(row.stddev_minutes),
    variance_minutes: toNumber(row.variance_minutes),
  }));
}

// MODULE 7 (Drill-down): Get session details for a specific lesson
export async function getDurationSessionsDrilldown(
  level: string,
  lesson_name: string
): Promise<DurationSessionDetail[]> {
  const sql = getSqlClient();

  // Extract lesson sequence number from lesson_name (e.g., "Lesson 12" -> 12)
  const seqMatch = lesson_name.match(/\d+/);
  const lessonSeq = seqMatch ? parseInt(seqMatch[0]) : 0;

  const rows = normalizeRows<DurationSessionDetail>(await sql`
    SELECT e.student_id, 
           COALESCE(cp.full_name, s.full_name) AS full_name,
           cp.level::text, 
           e.seq AS lesson_seq, 
           e.total_minutes, 
           e.finished_on::text
    FROM mart.student_lesson_effort_v e
    LEFT JOIN mart.coach_panel_v cp ON cp.student_id = e.student_id
    LEFT JOIN public.students s ON s.id = e.student_id
    WHERE e.finished_on >= (current_date - INTERVAL '90 days')
      AND cp.level = ${level}
      AND e.seq = ${lessonSeq}
    ORDER BY e.finished_on DESC
    LIMIT 200
  `);

  return rows.map((row) => ({
    student_id: toNumber(row.student_id),
    full_name: toString(row.full_name, "Unknown"),
    level: toString(row.level),
    lesson_seq: toNumber(row.lesson_seq),
    total_minutes: toNumber(row.total_minutes),
    finished_on: toString(row.finished_on),
  }));
}

// MODULE 8: Lesson Completion Velocity per Level (90d)
export async function getVelocityByLevelData(): Promise<VelocityByLevel[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<VelocityByLevel>(await sql`
    SELECT level::text, lessons_per_week
    FROM mgmt.learning_velocity_by_level_90d_v
    ORDER BY level
  `);

  return rows.map((row) => ({
    level: toString(row.level),
    lessons_per_week: toNumber(row.lessons_per_week),
  }));
}

// MODULE 9: LEI Weekly Trend (90d)
export async function getLeiWeeklyTrendData(): Promise<LeiWeeklyData[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<LearningLeiDaily>(await sql`
    SELECT activity_date::text, total_completed_lessons, total_study_minutes
    FROM mgmt.learning_lei_daily_v
    WHERE activity_date >= (current_date - INTERVAL '90 days')
    ORDER BY activity_date
  `);

  // Aggregate to ISO weeks
  const weeklyMap = new Map<string, { minutes: number; completions: number }>();
  
  rows.forEach((row) => {
    const date = new Date(toString(row.activity_date));
    const dayOfWeek = date.getUTCDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() + diff);
    const weekStart = monday.toISOString().split('T')[0];

    if (!weeklyMap.has(weekStart)) {
      weeklyMap.set(weekStart, { minutes: 0, completions: 0 });
    }
    const week = weeklyMap.get(weekStart)!;
    week.minutes += toNumber(row.total_study_minutes);
    week.completions += toNumber(row.total_completed_lessons);
  });

  return Array.from(weeklyMap.entries())
    .map(([week_start, data]) => ({
      week_start,
      lei_week: data.completions / Math.max(data.minutes / 60.0, 0.1),
      weekly_minutes: data.minutes,
      weekly_completions: data.completions,
    }))
    .sort((a, b) => a.week_start.localeCompare(b.week_start));
}

// MODULE 10: At-Risk Learners (90d)
export async function getAtRiskLearnersData(): Promise<AtRiskLearner[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<AtRiskLearner>(await sql`
    SELECT student_id, full_name, level::text, lei_90d, 
           days_since_last_completed_lesson, reason
    FROM mgmt.learning_at_risk_90d_v
    ORDER BY reason DESC, days_since_last_completed_lesson DESC, lei_90d ASC NULLS LAST
    LIMIT 50
  `);

  return rows.map((row) => ({
    student_id: toNumber(row.student_id),
    full_name: toString(row.full_name),
    level: toString(row.level),
    lei_90d: row.lei_90d !== null ? toNumber(row.lei_90d) : null,
    days_since_last_completed_lesson: toNumber(row.days_since_last_completed_lesson),
    reason: toString(row.reason) as "both" | "low_lei" | "long_gap",
  }));
}

// MODULE 11: Micro KPI Strip (7-day operational)
export async function getMicroKpi7dData(): Promise<MicroKpi7d> {
  const sql = getSqlClient();

  // Active learners (7d)
  const activeRows = normalizeRows<{ active_7d: number }>(await sql`
    SELECT COUNT(DISTINCT student_id) AS active_7d
    FROM (
      SELECT DISTINCT (e.finished_on AT TIME ZONE 'America/Guayaquil')::date AS activity_date, 
                      e.student_id
      FROM mart.student_lesson_effort_v e
      WHERE e.finished_on >= (current_date - INTERVAL '7 days')
    ) q
  `);
  const active_learners = activeRows.length > 0 ? toNumber(activeRows[0].active_7d) : 0;

  // Total minutes and completions (7d)
  const metricsRows = normalizeRows<{ minutes_7d: number; comps_7d: number }>(await sql`
    SELECT 
      SUM(total_study_minutes) AS minutes_7d,
      SUM(total_completed_lessons) AS comps_7d
    FROM mgmt.learning_lei_daily_v
    WHERE activity_date >= (current_date - INTERVAL '7 days')
  `);

  const minutes_7d = metricsRows.length > 0 ? toNumber(metricsRows[0].minutes_7d) : 0;
  const completions = metricsRows.length > 0 ? toNumber(metricsRows[0].comps_7d) : 0;
  const avg_minutes_per_active = active_learners > 0 ? minutes_7d / active_learners : 0;

  return {
    active_learners,
    avg_minutes_per_active: Number(avg_minutes_per_active.toFixed(1)),
    completions,
  };
}

// Main function to fetch all data
export async function getLearningPanelData(): Promise<LearningPanelData> {
  const [
    lei_kpi,
    speed_buckets,
    days_in_level,
    days_since_progress,
    stuck_heatmap,
    duration_variance,
    velocity_by_level,
    lei_weekly_trend,
    at_risk_learners,
    micro_kpi_7d,
  ] = await Promise.all([
    getLeiKpiData(),
    getSpeedBucketsData(),
    getDaysInLevelData(),
    getDaysSinceProgressData(),
    getStuckHeatmapData(),
    getDurationVarianceData(),
    getVelocityByLevelData(),
    getLeiWeeklyTrendData(),
    getAtRiskLearnersData(),
    getMicroKpi7dData(),
  ]);

  return {
    lei_kpi,
    speed_buckets,
    days_in_level,
    days_since_progress,
    stuck_heatmap,
    duration_variance,
    velocity_by_level,
    lei_weekly_trend,
    at_risk_learners,
    micro_kpi_7d,
  };
}
