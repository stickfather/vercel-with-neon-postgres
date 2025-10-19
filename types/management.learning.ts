export type LearnLevel = "A1" | "A2" | "B1" | "B2" | "C1" | string;

export type LearnHeader = {
  pct_on_pace: number | null;
  avg_progress_pct: number | null;
  median_lei_30d: number | null;
  median_months_to_finish: number | null;
  graduated_30d: number | null;
  early_exit_30d: number | null;
};

export type LearnOnpaceSplit = {
  on_pace: number;
  off_pace: number;
};

export type LearnProgressBandRow = {
  level: string;
  band_0_33: number;
  band_34_66: number;
  band_67_99: number;
  band_100: number;
};

export type LearnCohortProgressRow = {
  cohort_month: string;
  months_since_start: number;
  avg_progress_pct: number | null;
};

export type LearnLeiDistributionRow = {
  scope: "overall" | "by_level";
  level: string | null;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  n: number;
};

export type LearnOutcomesWeeklyRow = {
  wk: string;
  graduados: number;
  retiros: number;
};

export type LearnLevelupsWeeklyRow = {
  wk: string;
  levelups: number;
};

export type LearnLevelMoveMatrixRow = {
  from_level: string;
  to_level: string;
  n: number;
};

export type LearnLessonsHeatmapRow = {
  level: string;
  lesson_id: string;
  p75_minutes_per_student: number | null;
  median_minutes_per_student: number | null;
  pct_slow_over_60: number | null;
  students: number | null;
};

export type LearnSlowLearnerRow = {
  full_name: string;
  level: string;
  hours_30d: number | null;
  progress_delta_30d: number | null;
  min_per_pct: number | null;
  lei_30d_plan: number | null;
  on_pace_plan: string | null;
  last_seen_date: string | null;
};

export type LearnFastLearnerRow = {
  full_name: string;
  level: string;
  hours_30d: number | null;
  progress_delta_30d: number | null;
  pct_per_hour: number | null;
  lei_30d_plan: number | null;
  on_pace_plan: string | null;
  last_seen_date: string | null;
};

export type LearnFastestCompletionRow = {
  full_name: string;
  final_level: string;
  months_to_complete: number | null;
  started_at: string | null;
  completed_at: string | null;
  lei_30d_plan: number | null;
};

export type LearnDashboardData = {
  header: LearnHeader | null;
  onpaceSplit: LearnOnpaceSplit | null;
  progressBands: LearnProgressBandRow[];
  cohortProgress: LearnCohortProgressRow[];
  leiOverall: LearnLeiDistributionRow | null;
  leiByLevel: LearnLeiDistributionRow[];
  outcomesWeekly: LearnOutcomesWeeklyRow[];
  levelupsWeekly: LearnLevelupsWeeklyRow[];
  levelMoveMatrix: LearnLevelMoveMatrixRow[];
  lessonsHeatmap: LearnLessonsHeatmapRow[];
  slowest: LearnSlowLearnerRow[];
  fastest: LearnFastLearnerRow[];
  fastestCompletions: LearnFastestCompletionRow[];
};
