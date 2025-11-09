// ============================================================================
// EXAMS PANEL - Type Definitions
// All types for the comprehensive Exams panel on Management Reports
// ============================================================================

// KPI Types
export type ExamPassRate90d = {
  pass_rate_90d: number | null;
};

export type ExamAverageScore90d = {
  average_score_90d: number | null;
};

export type ExamFirstAttemptData = {
  student_id: number;
  exam_type: string;
  level: string;
  time_scheduled_local: string;
  is_passed: boolean;
};

export type ExamInstructiveFollowup = {
  failed_at: string;
  assigned: boolean;
  completed: boolean;
};

export type ExamInstructiveCompliance = {
  assigned_pct: number | null;
  completed_pct: number | null;
};

// Chart Data Types
export type ExamWeeklyKpi = {
  week_start: string; // ISO date string for Monday
  passed_count: number;
  failed_count: number;
  completed_count: number;
  pass_rate: number | null; // 0-1 scale
};

export type ExamScoreDistribution = {
  bin_5pt: string; // e.g., "0-5", "5-10", etc.
  n: number;
};

export type ExamCompletedExam = {
  exam_id: number;
  student_id: number;
  full_name: string;
  exam_type: string;
  level: string;
  time_scheduled: string;
  time_scheduled_local: string;
  exam_date: string;
  score: number | null;
  is_passed: boolean;
};

export type ExamLevelTypeData = {
  level: string;
  exam_type: string;
  avg_score: number | null;
  n: number;
  pass_pct: number | null;
};

// Table Types
export type ExamRetake = {
  student_id: number;
  exam_type: string;
  level: string;
  first_fail_at: string;
  first_score: number | null;
  retake_at: string | null;
  retake_score: number | null;
  retake_passed: boolean | null;
  days_to_retake: number | null;
};

export type ExamStrugglingStudentDetail = {
  student_id: number;
  full_name: string;
  failed_exam_count: number;
  max_consecutive_fails: number;
  min_score_180d: number | null;
  open_instructivos: number;
  reason: string; // e.g., "consecutive_fails", "multiple_failed_exams", etc.
};

// Upcoming Exams Types
export type ExamUpcoming30dCount = {
  upcoming_exams_30d: number;
};

export type ExamUpcoming30dEntry = {
  student_id: number;
  full_name: string;
  time_scheduled: string;
  time_scheduled_local: string;
  exam_date: string;
  exam_type: string;
  level: string;
  status: string;
};

// Drill-down Types
export type ExamDrillDownQuery = {
  week_start?: string;
  level?: string;
  exam_type?: string;
};

// Full Panel Data Structure
export type ExamsPanelData = {
  passRate90d: ExamPassRate90d | null;
  averageScore90d: ExamAverageScore90d | null;
  firstAttemptData: ExamFirstAttemptData[];
  instructiveCompliance: ExamInstructiveCompliance | null;
  weeklyKpis: ExamWeeklyKpi[];
  scoreDistribution: ExamScoreDistribution[];
  completedExams: ExamCompletedExam[];
  retakes: ExamRetake[];
  strugglingStudents: ExamStrugglingStudentDetail[];
  upcomingCount: ExamUpcoming30dCount | null;
  upcomingList: ExamUpcoming30dEntry[];
};

// Computed Types (for FE processing)
export type ExamFirstAttemptPassRate = {
  first_attempt_pass_rate: number | null;
};

export type ExamHeatmapCell = {
  level: string;
  exam_type: string;
  avg_score: number;
  n: number;
  pass_pct: number;
};
