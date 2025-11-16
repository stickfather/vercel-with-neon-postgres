// Module 1: Student Finance Daily (from final.student_finance_daily_v)
export type StudentFinanceDaily = {
  student_id: number;
  student_name: string;
  student_status: string;
  student_archived: boolean;
  local_day: string;
  payments_count: number;
  payments_amount: number;
};

// Module 2: Collections 30d (from final.finance_collections_30d_mv)
export type FinancialCollections30d = {
  payments_amount_30d: number;
  payments_count_30d: number;
};

export type FinancialCollections30dSeries = {
  local_day: string;
  payments_amount: number;
  payments_count: number;
};

// Module 3: Outstanding Today (from final.finance_outstanding_today_mv)
export type FinancialOutstandingStudent = {
  student_id: number;
  student_name: string;
  student_status: string;
  student_archived: boolean;
  outstanding_amount: number;
  overdue_amount: number;
  overdue_0_30: number;
  overdue_31_60: number;
  overdue_61_90: number;
  overdue_90_plus: number;
};

// Module 4: Recovery 30d (from final.finance_recovery_30d_mv)
export type FinancialRecovery30d = {
  payments_amount_30d: number;
  outstanding_today: number;
  recovered_pct_approx: number;
};

// Module 5: Upcoming Due 7d (from final.finance_upcoming_due_7d_mv)
export type FinancialUpcomingDue = {
  due_day: string;
  due_amount: number;
  invoices_count: number;
};

// Legacy type for backward compatibility
export type FinancialStudentWithDebt = FinancialOutstandingStudent;

// Module 7: Overdue Items (per student) - kept for backward compatibility
export type FinancialOverdueItem = {
  payment_id: number;
  due_date: string;
  amount: number;
  is_paid: boolean;
  received_date: string | null;
  days_overdue: number;
};

// Module 6: Derived Micro-KPIs (calculated on client from outstanding data)
export type FinancialMicroKpis = {
  cases_over_90: number;
  avg_debt_per_student: number;
  recovery_rate_30d: number;
};

// Complete panel data structure using final.* views
export type FinancePanelData = {
  collections30d: FinancialCollections30d | null;
  collections30dSeries: FinancialCollections30dSeries[];
  outstandingStudents: FinancialOutstandingStudent[];
  recovery30d: FinancialRecovery30d | null;
  upcomingDue: FinancialUpcomingDue[];
};
