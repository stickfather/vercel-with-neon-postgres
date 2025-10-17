export type GenHeader = {
  students_total: number;
  active_7d: number;
  active_30d: number;
  new_30d: number;
  returning_30d: number;
  pct_on_pace: number | null;
  median_session_minutes_30d: number | null;
  avg_study_hours_per_student_30d: number | null;
};

export type LevelBands = {
  level: string;
  band_0_33: number;
  band_34_66: number;
  band_67_99: number;
  band_100: number;
};

export type LevelKPI = {
  level: string;
  students: number;
  active_30d_pct: number | null;
  on_pace_pct: number | null;
  median_lei_30d: number | null;
  median_months_to_finish: number | null;
};
