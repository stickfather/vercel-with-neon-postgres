export type EngagementFilters = {
  level?: string | null;
  coach?: string | null;
  plan?: string | null;
  campus?: string | null;
  date?: string | null;
};

export type UtilizationTodayRow = {
  slot_start: string;
  hour: number;
  minute: number;
  concurrent_sessions: number;
  arrivals: number;
  active_minutes_in_slot: number;
};

export type UtilizationAvgRow = {
  hour: number;
  minute: number;
  avg_concurrent: number;
};

export type HeatmapCell = {
  dow: number;
  hour: number;
  avg_concurrent: number;
  total_arrivals: number;
  avg_active_minutes_in_slot: number;
};

export type ArrivalRow = {
  slot_start: string;
  hour: number;
  minute: number;
  arrivals: number;
};

export type SegmentSummaryRow = {
  primary_segment: string;
  students: number;
  avg_sessions_per_week: number;
  avg_minutes_per_session: number;
  avg_concentration_index: number;
  avg_segment_health_score: number;
};

export type SegmentMemberRow = {
  student_id: number;
  primary_segment: string;
  sessions_per_week: number;
  avg_minutes_30d: number;
  concentration_index: number;
  segment_health_score: number | null;
  recency_norm: number | null;
  freq_norm: number | null;
  intensity_norm: number | null;
  concentration_norm: number | null;
};

export type StudentSegmentRow = SegmentMemberRow & {
  days_since_last: number | null;
  distinct_hours_30d: number | null;
};

export type StudentTimeProfileRow = {
  preferred_hour: number | null;
  concentration_index: number | null;
};

export type StudentProfile = {
  segment: StudentSegmentRow | null;
  timeProfile: StudentTimeProfileRow | null;
};

export type HourTrendRow = {
  slot_start: string;
  avg_concurrent: number;
  total_arrivals: number;
};

export type EngagementLensState = {
  name: string;
  language: "en" | "es";
  filters: EngagementFilters;
  brush: [number, number];
};
