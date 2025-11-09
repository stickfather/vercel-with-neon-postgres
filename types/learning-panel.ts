// ============================================================================
// LEARNING PANEL (90d) - Type Definitions
// All types for the upgraded Learning panel on Management Reports
// ============================================================================

// MODULE 2: LEI KPI Card
export type LearningLeiDaily = {
  activity_date: string; // ISO date
  total_completed_lessons: number;
  total_study_minutes: number;
  student_id?: number; // Optional, for per-student drill-down
};

export type LeiKpiData = {
  lei_7d_avg: number; // Mean of last 7 days
  sparkline_90d: { week_start: string; lei_week: number }[]; // Weekly aggregates
};

// MODULE 3: Speed Buckets
export type SpeedBucket90d = {
  bucket: "Fast" | "Typical" | "Slow";
  n: number;
};

export type SpeedBucketsData = {
  fast: number;
  typical: number;
  slow: number;
  fast_pct: number;
  typical_pct: number;
  slow_pct: number;
};

// MODULE 4: Median Days in Level
export type DaysInLevel = {
  level: string;
  median_days_in_level: number;
};

export type DaysInLevelData = {
  overall_median: number;
  by_level: DaysInLevel[];
};

// MODULE 5: Median Days Since Last Progress
export type DaysSinceProgressData = {
  median_days: number;
};

// MODULE 6: Stuck Students Heatmap
export type StuckHeatmapCell = {
  level: string;
  lesson_name: string;
  stuck_count: number;
};

export type StuckStudent = {
  student_id: number;
  full_name: string;
  level: string;
  current_seq: number;
  last_seen_date: string | null;
  stall: boolean;
  inactive_14d: boolean;
};

// MODULE 7: Lesson Duration Variance
export type LessonDurationStat = {
  level: string;
  lesson_name: string;
  n_sessions: number;
  avg_minutes: number;
  stddev_minutes: number;
  variance_minutes: number;
};

export type DurationSessionDetail = {
  student_id: number;
  full_name: string;
  level: string;
  lesson_seq: number;
  total_minutes: number;
  finished_on: string;
};

// MODULE 8: Lesson Completion Velocity per Level
export type VelocityByLevel = {
  level: string;
  lessons_per_week: number;
};

// MODULE 9: LEI Weekly Trend
export type LeiWeeklyData = {
  week_start: string; // ISO date (Monday)
  lei_week: number;
  weekly_minutes: number;
  weekly_completions: number;
};

// MODULE 10: At-Risk Learners Table
export type AtRiskLearner = {
  student_id: number;
  full_name: string;
  level: string;
  lei_90d: number | null;
  days_since_last_completed_lesson: number;
  reason: "both" | "low_lei" | "long_gap";
};

// MODULE 11: Micro KPI Strip (7-day operational)
export type MicroKpi7d = {
  active_learners: number;
  avg_minutes_per_active: number;
  completions: number;
};

// Combined Panel Data Type
export type LearningPanelData = {
  lei_kpi: LeiKpiData;
  speed_buckets: SpeedBucketsData;
  days_in_level: DaysInLevelData;
  days_since_progress: DaysSinceProgressData;
  stuck_heatmap: StuckHeatmapCell[];
  duration_variance: LessonDurationStat[];
  velocity_by_level: VelocityByLevel[];
  lei_weekly_trend: LeiWeeklyData[];
  at_risk_learners: AtRiskLearner[];
  micro_kpi_7d: MicroKpi7d;
};

// Drill-down drawer state
export type DrillDownSlice =
  | { type: "stuck_heatmap"; level: string; lesson_name: string }
  | { type: "duration_variance"; level: string; lesson_name: string }
  | { type: "none" };
