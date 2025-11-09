import {
  getSqlClient,
  normalizeRows,
  type SqlRow,
} from "@/lib/db/client";
import type {
  EngagementReport,
  ActiveCounts,
  WoWIndex,
  DailyActivityPoint,
  AvgBetweenVisitsRow,
  InactiveCounts,
  HourSplitRow,
  InactiveRosterRow,
  WauMauMetrics,
  MedianDaysBetweenVisits,
  WeeklyEngagementPoint,
  MauRollingPoint,
  HourlyHeatmapCell,
  StudentActivityRow,
  ReactivatedStudentRow,
  SessionFrequencyBin,
  DaypartRetention,
  DualRiskStudent
} from "@/types/reports.engagement";

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

function normalizeString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value);
  return str.length ? str : fallback;
}

function normalizeDaypart(value: unknown): HourSplitRow['daypart'] {
  const str = normalizeString(value);
  const validDayparts: HourSplitRow['daypart'][] = ['morning_08_12', 'afternoon_12_17', 'evening_17_20'];
  if (validDayparts.includes(str as HourSplitRow['daypart'])) {
    return str as HourSplitRow['daypart'];
  }
  return 'morning_08_12'; // default fallback
}

function normalizeInactivityBucket(value: unknown): InactiveRosterRow['inactivity_bucket'] {
  const str = normalizeString(value);
  const validBuckets: InactiveRosterRow['inactivity_bucket'][] = [
    'inactive_7d', 'inactive_14d', 'dormant_30d', 'long_term_inactive_180d', 'active_recent'
  ];
  if (validBuckets.includes(str as InactiveRosterRow['inactivity_bucket'])) {
    return str as InactiveRosterRow['inactivity_bucket'];
  }
  return 'active_recent'; // default fallback
}

function isMissingRelation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const pgError = error as { code?: string; message?: string };
  if (pgError.code && pgError.code.toUpperCase() === "42P01") return true;
  return typeof pgError.message === "string" && /does not exist/i.test(pgError.message);
}

async function safeQuery<T>(
  primary: () => Promise<T>,
  fallback: T,
  label: string
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (isMissingRelation(error)) {
      console.warn(`Vista no encontrada: ${label}, usando fallback`);
      return fallback;
    }
    console.error(`Error en query ${label}:`, error);
    return fallback;
  }
}

export async function getEngagementReport(): Promise<EngagementReport> {
  const sql = getSqlClient();

  const [
    activeCounts, 
    wowIndex, 
    dailyActivity, 
    avgBetweenRows, 
    inactiveCounts, 
    hourSplit,
    wauMau,
    medianBetween,
    weeklyEngagement,
    mauRolling,
    hourlyHeatmap,
    // Part 2/2 queries
    inactiveRoster,
    studentActivity,
    recentlyReactivated,
    sessionFrequency,
    daypartRetention,
    dualRisk
  ] = await Promise.all([
    safeQuery(
      () => sql`SELECT active_7d, active_14d, active_30d, active_6mo FROM mgmt.engagement_active_counts_v`,
      [],
      "mgmt.engagement_active_counts_v"
    ),
    safeQuery(
      () => sql`
        SELECT active_students_7d, active_students_prev7d,
               active_students_wow_change,
               total_minutes_7d, total_minutes_prev7d,
               total_minutes_wow_change
        FROM mgmt.engagement_decline_index_v
      `,
      [],
      "mgmt.engagement_decline_index_v"
    ),
    safeQuery(
      () => sql`
        SELECT d::text AS d, active_students::int, total_minutes::numeric AS total_minutes
        FROM mgmt.engagement_dau_90d_v
        ORDER BY d
      `,
      [],
      "mgmt.engagement_dau_90d_v"
    ),
    safeQuery(
      () => sql`
        SELECT scope::text AS scope, level::text AS level, avg_days_between_visits::numeric AS avg_days_between_visits
        FROM mgmt.engagement_avg_days_between_visits_v
        ORDER BY scope DESC, level NULLS FIRST
      `,
      [],
      "mgmt.engagement_avg_days_between_visits_v"
    ),
    safeQuery(
      () => sql`
        SELECT inactive_7d_count, inactive_14d_count, dormant_30d_count, inactive_180d_count
        FROM mgmt.engagement_inactive_counts_v
      `,
      [],
      "mgmt.engagement_inactive_counts_v"
    ),
    safeQuery(
      () => sql`
        SELECT daypart::text AS daypart, total_minutes::numeric AS total_minutes
        FROM mgmt.engagement_hour_split_v
        ORDER BY CASE daypart
          WHEN 'morning_08_12' THEN 1
          WHEN 'afternoon_12_17' THEN 2
          WHEN 'evening_17_20' THEN 3
          ELSE 99 END
      `,
      [],
      "mgmt.engagement_hour_split_v"
    ),
    safeQuery(
      () => sql`
        SELECT wau, mau, wau_mau_ratio
        FROM mgmt.engagement_wau_mau_v
      `,
      [],
      "mgmt.engagement_wau_mau_v"
    ),
    safeQuery(
      () => sql`
        SELECT median_days_between_visits
        FROM mgmt.engagement_median_days_between_visits_v
      `,
      [],
      "mgmt.engagement_median_days_between_visits_v"
    ),
    safeQuery(
      () => sql`
        SELECT week_start::text AS week_start, 
               max_daily_actives, 
               total_minutes, 
               sessions, 
               sum_active_students
        FROM mgmt.engagement_weekly_active_90d_v
        ORDER BY week_start
      `,
      [],
      "mgmt.engagement_weekly_active_90d_v"
    ),
    safeQuery(
      () => sql`
        SELECT snapshot_date::text AS snapshot_date, 
               mau_rolling_30d
        FROM mgmt.engagement_mau_rolling_90d_v
        ORDER BY snapshot_date
      `,
      [],
      "mgmt.engagement_mau_rolling_90d_v"
    ),
    safeQuery(
      () => sql`
        SELECT iso_weekday, hour_local, minutes
        FROM mgmt.engagement_hourly_heatmap_90d_v
        ORDER BY iso_weekday, hour_local
      `,
      [],
      "mgmt.engagement_hourly_heatmap_90d_v"
    ),
    // Module 11: Inactive Roster
    safeQuery(
      () => sql`
        SELECT student_id, full_name, level, last_checkin_time, 
               days_since_last_checkin, inactivity_bucket
        FROM mgmt.engagement_inactive_roster_v
        ORDER BY days_since_last_checkin DESC
      `,
      [],
      "mgmt.engagement_inactive_roster_v"
    ),
    // Module 12 & 14: Student Activity (for at-risk and high-engagement)
    safeQuery(
      () => sql`
        SELECT student_id, full_name, level, sessions_30d, 
               avg_days_between_visits, days_since_last_checkin, consistency_score
        FROM mgmt.engagement_student_activity_v
        ORDER BY days_since_last_checkin DESC NULLS LAST, consistency_score DESC NULLS LAST
      `,
      [],
      "mgmt.engagement_student_activity_v"
    ),
    // Module 13: Recently Reactivated
    safeQuery(
      () => sql`
        SELECT student_id, full_name, days_inactive_before_return, return_date::text AS return_date
        FROM mgmt.engagement_recent_reactivated_14d_v
        ORDER BY return_date DESC
      `,
      [],
      "mgmt.engagement_recent_reactivated_14d_v"
    ),
    // Module 15: Session Frequency Distribution
    safeQuery(
      () => sql`
        SELECT bin_label, student_count
        FROM mgmt.engagement_session_frequency_30d_v
        ORDER BY bin_label
      `,
      [],
      "mgmt.engagement_session_frequency_30d_v"
    ),
    // Module 17: Daypart Retention
    safeQuery(
      () => sql`
        SELECT daypart::text AS daypart, return_rate
        FROM mgmt.engagement_daypart_retention_v
        ORDER BY CASE daypart
          WHEN 'morning_08_12' THEN 1
          WHEN 'afternoon_12_17' THEN 2
          WHEN 'evening_17_20' THEN 3
          ELSE 99 END
      `,
      [],
      "mgmt.engagement_daypart_retention_v"
    ),
    // Module 19: Dual Risk Students
    safeQuery(
      () => sql`
        SELECT student_id, full_name, level, engagement_issue, 
               learning_issue, days_since_last_checkin
        FROM mgmt.engagement_dual_risk_students_v
        ORDER BY days_since_last_checkin DESC NULLS LAST
      `,
      [],
      "mgmt.engagement_dual_risk_students_v"
    ),
  ]);

  const activeCountsRows = normalizeRows<ActiveCounts>(activeCounts);
  const wowIndexRows = normalizeRows<WoWIndex>(wowIndex);
  const dailyActivityRows = normalizeRows<DailyActivityPoint>(dailyActivity);
  const avgBetweenRowsNormalized = normalizeRows<AvgBetweenVisitsRow>(avgBetweenRows);
  const inactiveCountsRows = normalizeRows<InactiveCounts>(inactiveCounts);
  const hourSplitRows = normalizeRows<HourSplitRow>(hourSplit);
  const wauMauRows = normalizeRows<WauMauMetrics>(wauMau);
  const medianBetweenRows = normalizeRows<MedianDaysBetweenVisits>(medianBetween);
  const weeklyEngagementRows = normalizeRows<WeeklyEngagementPoint>(weeklyEngagement);
  const mauRollingRows = normalizeRows<MauRollingPoint>(mauRolling);
  const hourlyHeatmapRows = normalizeRows<HourlyHeatmapCell>(hourlyHeatmap);
  const inactiveRosterRows = normalizeRows<InactiveRosterRow>(inactiveRoster);
  const studentActivityRows = normalizeRows<StudentActivityRow>(studentActivity);
  const recentlyReactivatedRows = normalizeRows<ReactivatedStudentRow>(recentlyReactivated);
  const sessionFrequencyRows = normalizeRows<SessionFrequencyBin>(sessionFrequency);
  const daypartRetentionRows = normalizeRows<DaypartRetention>(daypartRetention);
  const dualRiskRows = normalizeRows<DualRiskStudent>(dualRisk);

  const globalRow = avgBetweenRowsNormalized.find(r => r.scope === 'GLOBAL');
  const perLevel  = avgBetweenRowsNormalized.filter(r => r.scope === 'LEVEL');

  // Split student activity into at-risk and high-engagement
  const atRiskStudents = studentActivityRows
    .filter(s => (s.days_since_last_checkin ?? 0) >= 7)
    .sort((a, b) => {
      const aDays = a.days_since_last_checkin ?? 0;
      const bDays = b.days_since_last_checkin ?? 0;
      if (aDays !== bDays) return bDays - aDays;
      return (a.avg_days_between_visits ?? 999) - (b.avg_days_between_visits ?? 999);
    });

  const highEngagementStudents = studentActivityRows
    .filter(s => s.sessions_30d >= 5 && (s.consistency_score ?? 0) >= 60)
    .sort((a, b) => (b.consistency_score ?? 0) - (a.consistency_score ?? 0));

  return {
    last_refreshed_at: new Date().toISOString(),
    active_counts: activeCountsRows[0] ?? {active_7d:0,active_14d:0,active_30d:0,active_6mo:0},
    inactive_counts: inactiveCountsRows[0] ?? {
      inactive_7d_count: 0, inactive_14d_count: 0, dormant_30d_count: 0, inactive_180d_count: 0
    },
    wau_mau_metrics: wauMauRows[0] ?? {wau:0, mau:0, wau_mau_ratio:0},
    avg_between_visits_global: toNumber(globalRow?.avg_days_between_visits ?? 0),
    median_between_visits: toNumber(medianBetweenRows[0]?.median_days_between_visits ?? 0),
    wow_index: wowIndexRows[0] ?? {
      active_students_7d: 0, active_students_prev7d: 0, active_students_wow_change: null,
      total_minutes_7d: 0, total_minutes_prev7d: 0, total_minutes_wow_change: null
    },
    weekly_engagement_90d: weeklyEngagementRows.map((row) => ({
      week_start: normalizeString(row.week_start),
      max_daily_actives: toNumber(row.max_daily_actives),
      total_minutes: toNumber(row.total_minutes),
      sessions: toNumber(row.sessions),
      sum_active_students: toNumber(row.sum_active_students),
    })),
    mau_rolling_90d: mauRollingRows.map((row) => ({
      snapshot_date: normalizeString(row.snapshot_date),
      mau_rolling_30d: toNumber(row.mau_rolling_30d),
    })),
    hour_split: hourSplitRows.map((row) => ({
      daypart: normalizeDaypart(row.daypart),
      total_minutes: toNumber(row.total_minutes),
    })),
    hourly_heatmap_90d: hourlyHeatmapRows.map((row) => ({
      iso_weekday: toNumber(row.iso_weekday),
      hour_local: toNumber(row.hour_local),
      minutes: toNumber(row.minutes),
    })),
    daily_activity: dailyActivityRows.map((row) => ({
      d: normalizeString(row.d),
      active_students: toNumber(row.active_students),
      total_minutes: toNumber(row.total_minutes),
    })),
    avg_between_visits_by_level: perLevel.map((row) => ({
      scope: row.scope,
      level: row.level,
      avg_days_between_visits: toNumber(row.avg_days_between_visits),
    })),
    // Part 2/2 data
    inactive_roster: inactiveRosterRows.map((row) => ({
      student_id: toNumber(row.student_id),
      full_name: row.full_name === null || row.full_name === undefined ? null : String(row.full_name),
      level: row.level === null || row.level === undefined ? null : String(row.level),
      last_checkin_time: row.last_checkin_time === null || row.last_checkin_time === undefined ? null : String(row.last_checkin_time),
      days_since_last_checkin: toNullableNumber(row.days_since_last_checkin),
      inactivity_bucket: normalizeInactivityBucket(row.inactivity_bucket),
    })),
    at_risk_students: atRiskStudents.map((row) => ({
      student_id: toNumber(row.student_id),
      full_name: row.full_name === null || row.full_name === undefined ? null : String(row.full_name),
      level: row.level === null || row.level === undefined ? null : String(row.level),
      sessions_30d: toNumber(row.sessions_30d),
      avg_days_between_visits: toNullableNumber(row.avg_days_between_visits),
      days_since_last_checkin: toNullableNumber(row.days_since_last_checkin),
      consistency_score: toNullableNumber(row.consistency_score),
    })),
    recently_reactivated: recentlyReactivatedRows.map((row) => ({
      student_id: toNumber(row.student_id),
      full_name: row.full_name === null || row.full_name === undefined ? null : String(row.full_name),
      days_inactive_before_return: toNumber(row.days_inactive_before_return),
      return_date: normalizeString(row.return_date),
    })),
    high_engagement_students: highEngagementStudents.map((row) => ({
      student_id: toNumber(row.student_id),
      full_name: row.full_name === null || row.full_name === undefined ? null : String(row.full_name),
      level: row.level === null || row.level === undefined ? null : String(row.level),
      sessions_30d: toNumber(row.sessions_30d),
      avg_days_between_visits: toNullableNumber(row.avg_days_between_visits),
      days_since_last_checkin: toNullableNumber(row.days_since_last_checkin),
      consistency_score: toNullableNumber(row.consistency_score),
    })),
    session_frequency_distribution: sessionFrequencyRows.map((row) => ({
      bin_label: normalizeString(row.bin_label),
      student_count: toNumber(row.student_count),
    })),
    daypart_retention: daypartRetentionRows.map((row) => ({
      daypart: normalizeDaypart(row.daypart) as DaypartRetention["daypart"],
      return_rate: toNumber(row.return_rate),
    })),
    dual_risk_students: dualRiskRows.map((row) => ({
      student_id: toNumber(row.student_id),
      full_name: row.full_name === null || row.full_name === undefined ? null : String(row.full_name),
      level: row.level === null || row.level === undefined ? null : String(row.level),
      engagement_issue: normalizeString(row.engagement_issue),
      learning_issue: normalizeString(row.learning_issue),
      days_since_last_checkin: toNullableNumber(row.days_since_last_checkin),
    })),
  };
}

export async function getInactiveRoster(bucket: 'inactive_7d'|'inactive_14d'|'dormant_30d'|'long_term_inactive_180d'): Promise<InactiveRosterRow[]> {
  const sql = getSqlClient();
  try {
    const res = await sql`
      SELECT student_id, full_name, level::text AS level, last_checkin_time, days_since_last_checkin, inactivity_bucket
      FROM mgmt.engagement_inactive_roster_v
      WHERE inactivity_bucket = ${bucket}
      ORDER BY days_since_last_checkin DESC, full_name
    `;
    return normalizeRows<InactiveRosterRow>(res).map((row) => ({
      student_id: toNumber(row.student_id),
      full_name: row.full_name === null || row.full_name === undefined ? null : String(row.full_name),
      level: row.level === null || row.level === undefined ? null : String(row.level),
      last_checkin_time: row.last_checkin_time === null || row.last_checkin_time === undefined ? null : String(row.last_checkin_time),
      days_since_last_checkin: toNullableNumber(row.days_since_last_checkin),
      inactivity_bucket: normalizeInactivityBucket(row.inactivity_bucket),
    }));
  } catch (error) {
    if (isMissingRelation(error)) {
      console.warn('Vista mgmt.engagement_inactive_roster_v no encontrada, retornando array vacío');
      return [];
    }
    throw error;
  }
}
