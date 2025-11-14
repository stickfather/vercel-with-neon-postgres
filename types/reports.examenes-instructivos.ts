export type ExamsSummary = {
  passRatePct: number | null;
  avgScore: number | null;
  firstAttemptPassRatePct: number | null;
  avgScoreSparkline?: number[];
};

export type CompletionHistogramBin = {
  bucketLabel: string;
  count: number;
};

export type InstructivosSummary = {
  assigned90d: number | null;
  completionRate90d: number | null;
  medianCompletionDays: number | null;
  completionHistogram: CompletionHistogramBin[];
};

export type InstructivoStatusRow = {
  studentId: number | null;
  studentName: string;
  instructivoId: number | null;
  statusLabel: string;
  assignedAt: string | null;
  dueDate: string | null;
  completedAt: string | null;
  daysOpen: number | null;
  daysOverdue: number | null;
  level: string | null;
  examType: string | null;
};

export type WeeklyTrendPoint = {
  weekStart: string;
  passCount: number;
  failCount: number;
  examsCount: number;
  passRatePct: number | null;
};

export type ScoreDistributionBin = {
  binLabel: string;
  count: number;
};

export type HeatmapCell = {
  level: string;
  examType: string;
  avgScore: number | null;
  examsCount: number;
  passRatePct: number | null;
};

export type RepeatExamRow = {
  studentId: number | null;
  studentName: string;
  level: string;
  examType: string;
  retakeCount: number;
  daysToRetakeAvg: number | null;
  scoreDelta: number | null;
};

export type AttentionStudentRow = {
  studentId: number | null;
  studentName: string;
  level: string | null;
  examType: string | null;
  fails90d: number;
  pendingInstructivos: number;
  overdueInstructivos: number;
  lastExamDate: string | null;
};

export type UpcomingExamRow = {
  examId: number | null;
  studentId: number | null;
  studentName: string;
  level: string;
  examType: string;
  scheduledAt: string;
  scheduledLocal: string | null;
  status: string;
};

export type ExamenesInstructivosReportResponse = {
  summary: ExamsSummary;
  instructivosSummary: InstructivosSummary;
  instructivosStatus: {
    overdue: InstructivoStatusRow[];
    pending: InstructivoStatusRow[];
  };
  weeklyTrend: WeeklyTrendPoint[];
  scoreDistribution: ScoreDistributionBin[];
  heatmap: HeatmapCell[];
  repeatExams: RepeatExamRow[];
  studentsNeedingAttention: AttentionStudentRow[];
  upcomingExams: UpcomingExamRow[];
  fallback: boolean;
};
