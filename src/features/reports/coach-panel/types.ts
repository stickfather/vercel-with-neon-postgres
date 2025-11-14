export type DailyMinutesPoint = {
  date: string;
  minutes: number;
};

export type HourlyMinutesBucket = {
  hourLabel: string;
  minutes: number;
};

export type ExamReadiness = {
  score: number | null;
  label: string | null;
};

export type StudyVolumeMetrics = {
  diasActivos30d: number | null;
  minutosTotales30d: number | null;
  promedioMinutosPorSesion30d: number | null;
};

export type ConsistencyMetrics = {
  dailyHeatmap: DailyMinutesPoint[];
  consistencyScore: number | null;
};

export type EfficiencyStabilityMetrics = {
  efficiencyStabilityScore: number | null;
  stabilitySparkline?: number[];
};

export type HabitReliability = {
  label: string | null;
};

export type HoursHistogram = {
  byHour: HourlyMinutesBucket[];
};

export type ExamPrepGap = {
  gapDaysToNextExam: number | null;
  alerts: {
    label: string;
    severity: "info" | "warning" | "danger";
  }[];
};

export type InstructivosStatus = {
  pendientes: number;
  overdue: number;
};

export type QuadrantProfile = {
  quadrantLabel: string;
  leiValue: number | null;
  lessonsPerHour: number | null;
  lessonsPerWeek: number | null;
  description?: string;
};

export type CoachPanelReportResponse = {
  examReadiness: ExamReadiness;
  studyVolume: StudyVolumeMetrics;
  consistency: ConsistencyMetrics;
  efficiencyStability: EfficiencyStabilityMetrics;
  habitReliability: HabitReliability;
  hoursHistogram: HoursHistogram;
  examPrepGap: ExamPrepGap;
  instructivosStatus: InstructivosStatus;
  quadrantProfile: QuadrantProfile | null;
  fallback: boolean;
};
