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

export type FinanceReport = {
  last_refreshed_at: string;
  outstanding_students: number;
  outstanding_balance: number;
  aging: AgingBuckets;
  collections_totals: CollectionsTotals;
  collections_series: CollectionsPoint[];
  debtors: DebtorRow[];
  due_soon_summary: DueSoonSummary;
  due_soon_series: DueSoonPoint[];
};
