export type ActiveMetric = {
  count: number;
  changePct: number | null;
};

export type ActiveSummary = {
  last7d: ActiveMetric;
  last14d: ActiveMetric;
  last30d: ActiveMetric;
  last180d: ActiveMetric;
};

export type InactiveRow = {
  studentId: number;
  fullName: string;
  phone: string | null;
  daysSinceLastVisit: number | null;
  inactivityBucket: 'inactive_7d' | 'inactive_14d' | 'dormant_30d' | 'long_term_inactive_180d';
  lastVisitDate: string | null;
};

export type InactivityTables = {
  inactive7d: InactiveRow[];
  inactive14d: InactiveRow[];
  dormant30d: InactiveRow[];
  longTerm180d: InactiveRow[];
};

export type AvgDaysBetweenVisits = {
  value: number | null;
};

export type DeclinePoint = {
  weekStart: string;
  declineIndex: number | null;
};

export type HourSplitBucket = {
  bucket: 'Morning' | 'Afternoon' | 'Evening';
  studentMinutes: number;
  sessionsCount: number | null;
};

export type ZeroAttendanceRow = {
  studentId: number;
  fullName: string;
  phone: string | null;
  enrollmentDate: string | null;
};

export type FrequencyScore = {
  sessionsPerWeek: number | null;
  targetSessionsPerWeek: number | null;
  sparkline: number[];
};

export type EngagementReportResponse = {
  lastRefreshedAt: string;
  fallback: boolean;
  fallbackReasons: string[];
  activeSummary: ActiveSummary;
  inactivityTables: InactivityTables;
  avgDaysBetweenVisits: AvgDaysBetweenVisits;
  declineIndex: DeclinePoint[];
  hourSplit: HourSplitBucket[];
  zeroAttendance: ZeroAttendanceRow[];
  frequencyScore: FrequencyScore;
};
