export type ChartPoint = {
  label: string;
  value: number | null;
  secondary?: number | null;
  trend?: number | null;
};

export type LearningLevelDuration = {
  level: string;
  medianDays: number | null;
};

export type StuckStudent = {
  student: string;
  level: string;
  lesson: string;
  daysStuck: number | null;
};

export type AcademicRiskLevel = {
  level: string;
  medianDaysSinceProgress: number | null;
  stalledCount: number | null;
  inactiveCount: number | null;
};

export type LevelVelocity = {
  level: string;
  lessonsPerWeek: number | null;
};

export type SpeedBucket = {
  bucket: string;
  label: string;
  percentage: number | null;
  count: number | null;
};

export type SlowStudent = {
  student: string;
  level: string;
  metric: number | null;
};

export type LearningReport = {
  levelDurations: LearningLevelDuration[];
  stuckStudents: StuckStudent[];
  academicRisk: AcademicRiskLevel[];
  completionVelocity: LevelVelocity[];
  speedBuckets: SpeedBucket[];
  slowStudents: SlowStudent[];
};

export type EngagementActiveCounts = {
  range: string;
  count: number | null;
};

export type EngagementInactiveCounts = {
  range: string;
  count: number | null;
};

export type EngagementRosterEntry = {
  student: string;
  status: string;
  lastVisit: string;
  daysInactive: number | null;
};

export type EngagementVisitPace = {
  label: string;
  value: number | null;
};

export type EngagementDeclinePoint = {
  label: string;
  value: number | null;
};

export type EngagementHourSplit = {
  hour: string;
  morning: number | null;
  afternoon: number | null;
  evening: number | null;
};

export type EngagementReport = {
  active: EngagementActiveCounts[];
  inactive: EngagementInactiveCounts[];
  roster: EngagementRosterEntry[];
  visitPace: EngagementVisitPace[];
  declineIndex: EngagementDeclinePoint[];
  hourSplit: EngagementHourSplit[];
};

export type FinancialOutstandingSummary = {
  students: number | null;
  balance: number | null;
};

export type FinancialAgingBucket = {
  label: string;
  value: number | null;
};

export type FinancialCollectionPoint = {
  label: string;
  value: number | null;
};

export type FinancialDebtor = {
  student: string;
  amount: number | null;
  daysOverdue: number | null;
};

export type FinancialReport = {
  outstanding: FinancialOutstandingSummary;
  aging: FinancialAgingBucket[];
  collections: FinancialCollectionPoint[];
  debtors: FinancialDebtor[];
};

export type ExamsUpcoming = {
  exam: string;
  date: string;
  candidates: number | null;
};

export type ExamsRate = {
  label: string;
  value: number | null;
};

export type ExamsAverageScore = {
  label: string;
  value: number | null;
};

export type ExamStrugglingStudent = {
  student: string;
  exam: string;
  attempts: number | null;
  score: number | null;
};

export type ExamsReport = {
  upcoming: ExamsUpcoming[];
  firstAttemptRate: ExamsRate | null;
  overallRate: ExamsRate | null;
  averageScore: ExamsAverageScore | null;
  instructiveCompletion: ExamsRate | null;
  instructiveDays: ExamsRate | null;
  strugglingStudents: ExamStrugglingStudent[];
  failToInstructiveLink: ExamsRate | null;
};

export type PersonnelMix = {
  hour: string;
  students: number | null;
  staff: number | null;
};

export type PersonnelCoverage = {
  area: string;
  status: string;
  riskLevel: string;
};

export type PersonnelLoadPoint = {
  hour: string;
  value: number | null;
};

export type PersonnelReport = {
  staffingMix: PersonnelMix[];
  coverage: PersonnelCoverage[];
  studentLoad: PersonnelLoadPoint[];
};
