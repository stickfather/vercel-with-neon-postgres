export type DailyActivityPoint = { d: string; active_students: number; total_minutes: number };
export type WoWIndex = {
  active_students_7d: number;
  active_students_prev7d: number;
  active_students_wow_change: number | null; // -1..+inf
  total_minutes_7d: number;
  total_minutes_prev7d: number;
  total_minutes_wow_change: number | null;
};
export type ActiveCounts = { active_7d: number; active_14d: number; active_30d: number; active_6mo: number };

export type InactiveCounts = {
  inactive_7d_count: number;
  inactive_14d_count: number;
  dormant_30d_count: number;
  inactive_180d_count: number;
};

export type InactiveRosterRow = {
  student_id: number;
  full_name: string | null;
  level: string | null;
  last_checkin_time: string | null;
  days_since_last_checkin: number | null;
  inactivity_bucket: 'inactive_7d'|'inactive_14d'|'dormant_30d'|'long_term_inactive_180d'|'active_recent';
};

export type AvgBetweenVisitsRow = { scope: 'GLOBAL'|'LEVEL'; level: string | null; avg_days_between_visits: number };
export type HourSplitRow = { daypart: 'morning_08_12'|'afternoon_12_17'|'evening_17_20'; total_minutes: number };

// New types for MD-Clean implementation
export type WauMauMetrics = {
  wau: number;
  mau: number;
  wau_mau_ratio: number; // 0-1
};

export type MedianDaysBetweenVisits = {
  median_days_between_visits: number;
};

export type WeeklyEngagementPoint = {
  week_start: string;
  max_daily_actives: number;
  total_minutes: number;
  sessions: number;
  sum_active_students: number;
};

export type MauRollingPoint = {
  snapshot_date: string;
  mau_rolling_30d: number;
};

export type HourlyHeatmapCell = {
  iso_weekday: number; // 1-7 (Mon-Sun)
  hour_local: number;  // 0-23
  minutes: number;
};

export type EngagementReport = {
  last_refreshed_at: string;
  // Section A - Core Engagement KPIs
  active_counts: ActiveCounts;
  inactive_counts: InactiveCounts;
  wau_mau_metrics: WauMauMetrics;
  avg_between_visits_global: number;
  median_between_visits: number;
  
  // Section B - Engagement Trends
  wow_index: WoWIndex;
  weekly_engagement_90d: WeeklyEngagementPoint[];
  mau_rolling_90d: MauRollingPoint[];
  
  // Section C - Time Distribution & Behavior Patterns
  hour_split: HourSplitRow[];
  hourly_heatmap_90d: HourlyHeatmapCell[];
  daily_activity: DailyActivityPoint[]; // for weekday traffic calculation
  
  // Legacy (keep for compatibility)
  avg_between_visits_by_level: AvgBetweenVisitsRow[];
  
  // drills
  inactive_roster?: InactiveRosterRow[];
};
