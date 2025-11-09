// Module 2: Outstanding Students & Balance
export type FinancialOutstandingStudents = {
  outstanding_students: number;
};

export type FinancialOutstandingBalance = {
  outstanding_balance: number;
};

// Module 3: Aging Buckets
export type FinancialAgingBuckets = {
  cnt_0_30: number;
  amt_0_30: number;
  cnt_31_60: number;
  amt_31_60: number;
  cnt_61_90: number;
  amt_61_90: number;
  cnt_over_90: number;
  amt_over_90: number;
};

// Module 4: Collections (30d)
export type FinancialCollections30d = {
  total_collected_30d: number;
  payments_count_30d: number;
};

export type FinancialCollections30dSeries = {
  d: string;
  amount_day: number;
  payments_day: number;
};

// Module 5: Due Soon (7d)
export type FinancialDueSoonSummary = {
  invoices_due_7d: number;
  students_due_7d: number;
  amount_due_7d: number;
  amount_due_today: number;
};

export type FinancialDueSoonSeries = {
  d: string;
  amount: number;
  invoices: number;
};

// Module 6: Students with Debts
export type FinancialStudentWithDebt = {
  student_id: number;
  full_name: string;
  total_overdue_amount: number;
  max_days_overdue: number;
  oldest_due_date: string;
  most_recent_missed_due_date: string;
  open_invoices: number;
};

// Module 7: Overdue Items (per student)
export type FinancialOverdueItem = {
  payment_id: number;
  due_date: string;
  amount: number;
  is_paid: boolean;
  received_date: string | null;
  days_overdue: number;
};

// Module 8: Derived Micro-KPIs (calculated on client)
export type FinancialMicroKpis = {
  cases_over_90: number;
  avg_debt_per_student: number;
  recovery_rate_30d: number;
};

// Complete panel data structure
export type FinancePanelData = {
  outstandingStudents: FinancialOutstandingStudents | null;
  outstandingBalance: FinancialOutstandingBalance | null;
  agingBuckets: FinancialAgingBuckets | null;
  collections30d: FinancialCollections30d | null;
  collections30dSeries: FinancialCollections30dSeries[];
  dueSoonSummary: FinancialDueSoonSummary | null;
  dueSoonSeries: FinancialDueSoonSeries[];
  studentsWithDebts: FinancialStudentWithDebt[];
};
