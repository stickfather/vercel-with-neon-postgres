export type DailyActivityPoint = { d: string; active_students: number; total_minutes: number };
export type WoWIndex = {
  active_students_7d: number;
  active_students_prev7d: number;
  active_students_wow_change: number | null; // -1..+inf
  total_minutes_7d: number;
  total_minutes_prev7d: number;
  total_minutes_wow_change: number | null;
};
export type ActiveCounts = { active_7d: number; active_14d: number; active_30d: number; active_180d: number };

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

export type EngagementReport = {
  last_refreshed_at: string;
  // row 1 tiles
  active_counts: ActiveCounts;
  wow_index: WoWIndex;

  // row 2 trend + average gap
  daily_activity: DailyActivityPoint[];
  avg_between_visits_global: number;      // from GLOBAL row
  avg_between_visits_by_level: AvgBetweenVisitsRow[]; // LEVEL rows only

  // row 3 funnels/cohorts
  inactive_counts: InactiveCounts;

  // row 4 hour split
  hour_split: HourSplitRow[];

  // drills
  inactive_roster?: InactiveRosterRow[]; // fetched on-demand in FE if desired
};
