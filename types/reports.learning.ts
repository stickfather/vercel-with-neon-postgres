export type TrendPoint = { snapshot_date: string; median_lei: number | null };
export type TransitionPoint = { d: string; n: number };

export type SpeedBucketRow = {
  student_id: number;
  full_name: string | null;
  level: string | null;
  current_seq: number | null;
  lei_30d_plan: number | null;
  percentile_lei: number; // 0..100
  speed_bucket: "Fast" | "Typical" | "Slow";
};

export type DaysSinceProgressLevel = {
  level: string;
  student_count: number;
  avg_days_since_last_seen: number;
  median_days_since_last_seen: number;
};

export type VelocityLevel = {
  level: string;
  lessons_per_week_total: number;
  lessons_per_week_per_student: number;
  active_students_level_30d: number;
};

export type StuckHeatCell = { level: string; current_seq: number; stuck_count: number };
export type StuckStudent = {
  student_id: number;
  full_name: string;
  level: string;
  current_seq: number;
  last_seen_date: string | null;
};

export type DaysInLevelRow = {
  level: string;
  student_count: number;
  avg_days_in_level: number;
  median_days_in_level: number;
};

export type VarianceRow = {
  student_id: number;
  full_name: string;
  lessons_completed_30d: number;
  avg_minutes_per_lesson: number;
  lesson_minutes_stddev: number;
};

export type LearningReport = {
  last_refreshed_at: string;

  // Tiles
  lei_trend: TrendPoint[];
  lei_trend_pct_change_30d: number;
  transitions_30d_total: number;
  transitions_30d_series: TransitionPoint[];
  days_since_progress: {
    global_median: number;
    by_level: DaysSinceProgressLevel[];
  };
  at_risk: Array<{
    student_id: number;
    full_name: string;
    level: string;
    current_seq: number | null;
    lei_30d_plan: number | null;
    last_seen_date: string | null;
    stall: boolean;
    inactive_14d: boolean;
  }>;

  // Mid & Bottom sections
  speed_buckets: {
    fast: SpeedBucketRow[];
    typical: SpeedBucketRow[];
    slow: SpeedBucketRow[];
    proportions: { fast_pct: number; typical_pct: number; slow_pct: number };
  };
  velocity_per_level: VelocityLevel[];
  stuck_heatmap: StuckHeatCell[];
  days_in_level: DaysInLevelRow[];
  duration_variance: VarianceRow[];
};
