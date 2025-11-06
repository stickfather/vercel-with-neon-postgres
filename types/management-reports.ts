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

export type EngagementShiftPoint = {
  hour_of_day: number;
  minutes: number;
};

export type EngagementStudyShift = {
  points: EngagementShiftPoint[];
  total_minutes_30d: number;
};

export type EngagementReport = {
  active: EngagementActiveCounts[];
  inactive: EngagementInactiveCounts[];
  roster: EngagementRosterEntry[];
  visitPace: EngagementVisitPace[];
  declineIndex: EngagementDeclinePoint[];
  hourSplit: EngagementHourSplit[];
  studyShift?: EngagementStudyShift;
};

export type AgingBuckets = {
  amt_0_30: number;
  amt_31_60: number;
  amt_61_90: number;
  amt_over_90: number;
  cnt_0_30: number;
  cnt_31_60: number;
  cnt_61_90: number;
  cnt_over_90: number;
  amt_total: number;
  cnt_total: number;
};

export type CollectionsTotals = {
  total_collected_30d: number;
  payments_count_30d: number;
};

export type CollectionsPoint = {
  d: string;
  amount: number;
};

export type DebtorRow = {
  student_id: number;
  full_name: string | null;
  total_overdue_amount: number;
  max_days_overdue: number;
  oldest_due_date: string | null;
  most_recent_missed_due_date: string | null;
  open_invoices: number;
  priority_score?: number | null;
};

export type DueSoonSummary = {
  invoices_due_7d: number;
  students_due_7d: number;
  amount_due_7d: number;
  amount_due_today: number;
};

export type DueSoonPoint = {
  d: string;
  amount: number;
  invoices: number;
};

export type FinancialReport = {
  outstanding_students: number;
  outstanding_balance: number;
  aging: AgingBuckets;
  collections_totals: CollectionsTotals;
  collections_series: CollectionsPoint[];
  debtors: DebtorRow[];
  due_soon_summary: DueSoonSummary;
  due_soon_series: DueSoonPoint[];
};

// Legacy types for backwards compatibility
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
