export type LeiTrendPoint = {
  weekStart: string;
  avgLei: number;
  level: string;
  totalLessons: number;
};

export type LeiTrendOverallPoint = {
  weekStart: string;
  avgLei: number;
};

export type LeiTrendSeries = {
  overall: LeiTrendOverallPoint[];
  byLevel: Record<string, LeiTrendPoint[]>;
};

export type TopLearnerRow = {
  studentId: number;
  fullName: string;
  level: string;
  lei30d: number;
  lessonsThisWeek: number;
  photoUrl: string | null;
};

export type AtRiskLearnerRow = {
  studentId: number;
  fullName: string;
  level: string;
  lei30d: number;
  daysSinceLastVisit: number | null;
  recommendedAction: string;
};

export type DaysInLevelRow = {
  level: string;
  medianDays: number;
  avgDays: number;
  studentCount: number;
};

export type StuckHeatmapCell = {
  level: string;
  lessonId: number;
  lessonLabel: string;
  stuckCount: number;
};

export type VelocitySparklinePoint = {
  weekStart: string;
  lessons: number;
};

export type VelocityLevelCard = {
  level: string;
  lessonsPerWeek: number;
  trend: "up" | "down" | "flat";
  sparkline: VelocitySparklinePoint[];
};

export type LearningReportResponse = {
  lastRefreshedAt: string;
  fallback: boolean;
  fallbackReasons: string[];
  leiTrend: LeiTrendSeries;
  top10: TopLearnerRow[];
  bottom20: AtRiskLearnerRow[];
  daysInLevel: DaysInLevelRow[];
  stuckHeatmap: StuckHeatmapCell[];
  velocityByLevel: VelocityLevelCard[];
};
