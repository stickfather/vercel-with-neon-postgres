import { getSqlClient, normalizeRows, type SqlRow } from "@/lib/db/client";
import type {
  FinancialOutstandingStudents,
  FinancialOutstandingBalance,
  FinancialAgingBuckets,
  FinancialCollections30d,
  FinancialCollections30dSeries,
  FinancialDueSoonSummary,
  FinancialDueSoonSeries,
  FinancialStudentWithDebt,
  FinancialOverdueItem,
} from "@/types/finance";

type SqlClient = ReturnType<typeof getSqlClient>;

function normalizeNumber(value: unknown): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) return 0;
    const parsed = Number(trimmed.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeString(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : "";
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return "";
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    return lower === "true" || lower === "t" || lower === "1" || lower === "yes";
  }
  return false;
}

async function safeRows(
  runner: () => Promise<unknown>,
  label: string,
): Promise<SqlRow[]> {
  try {
    const result = await runner();
    return normalizeRows<SqlRow>(result);
  } catch (error) {
    console.warn(`No se pudo cargar la vista ${label}`, error);
    return [];
  }
}

// ============================================================================
// Module 2: Outstanding Students
// ============================================================================
export async function getOutstandingStudents(
  sql: SqlClient = getSqlClient(),
): Promise<FinancialOutstandingStudents | null> {
  const rows = await safeRows(
    () => sql`SELECT outstanding_students FROM mgmt.financial_outstanding_students_v`,
    "financial_outstanding_students_v",
  );
  if (rows.length === 0) return null;
  return {
    outstanding_students: normalizeNumber(rows[0].outstanding_students),
  };
}

// ============================================================================
// Module 2: Outstanding Balance
// ============================================================================
export async function getOutstandingBalance(
  sql: SqlClient = getSqlClient(),
): Promise<FinancialOutstandingBalance | null> {
  const rows = await safeRows(
    () => sql`SELECT outstanding_balance FROM mgmt.financial_outstanding_balance_v`,
    "financial_outstanding_balance_v",
  );
  if (rows.length === 0) return null;
  return {
    outstanding_balance: normalizeNumber(rows[0].outstanding_balance),
  };
}

// ============================================================================
// Module 3: Aging Buckets
// ============================================================================
export async function getAgingBuckets(
  sql: SqlClient = getSqlClient(),
): Promise<FinancialAgingBuckets | null> {
  const rows = await safeRows(
    () => sql`SELECT * FROM mgmt.financial_aging_buckets_v`,
    "financial_aging_buckets_v",
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    cnt_0_30: normalizeNumber(row.cnt_0_30),
    amt_0_30: normalizeNumber(row.amt_0_30),
    cnt_31_60: normalizeNumber(row.cnt_31_60),
    amt_31_60: normalizeNumber(row.amt_31_60),
    cnt_61_90: normalizeNumber(row.cnt_61_90),
    amt_61_90: normalizeNumber(row.amt_61_90),
    cnt_over_90: normalizeNumber(row.cnt_over_90),
    amt_over_90: normalizeNumber(row.amt_over_90),
  };
}

// ============================================================================
// Module 4: Collections 30d Summary
// ============================================================================
export async function getCollections30d(
  sql: SqlClient = getSqlClient(),
): Promise<FinancialCollections30d | null> {
  const rows = await safeRows(
    () =>
      sql`SELECT total_collected_30d, payments_count_30d FROM mgmt.financial_collections_30d_v`,
    "financial_collections_30d_v",
  );
  if (rows.length === 0) return null;
  return {
    total_collected_30d: normalizeNumber(rows[0].total_collected_30d),
    payments_count_30d: normalizeNumber(rows[0].payments_count_30d),
  };
}

// ============================================================================
// Module 4: Collections 30d Series
// ============================================================================
export async function getCollections30dSeries(
  sql: SqlClient = getSqlClient(),
): Promise<FinancialCollections30dSeries[]> {
  const rows = await safeRows(
    () =>
      sql`SELECT d, amount_day, payments_day FROM mgmt.financial_collections_30d_series_v ORDER BY d`,
    "financial_collections_30d_series_v",
  );
  return rows.map((row) => ({
    d: normalizeString(row.d),
    amount_day: normalizeNumber(row.amount_day),
    payments_day: normalizeNumber(row.payments_day),
  }));
}

// ============================================================================
// Module 5: Due Soon Summary
// ============================================================================
export async function getDueSoonSummary(
  sql: SqlClient = getSqlClient(),
): Promise<FinancialDueSoonSummary | null> {
  const rows = await safeRows(
    () =>
      sql`SELECT invoices_due_7d, students_due_7d, amount_due_7d, amount_due_today FROM mgmt.financial_due_soon_summary_v`,
    "financial_due_soon_summary_v",
  );
  if (rows.length === 0) return null;
  return {
    invoices_due_7d: normalizeNumber(rows[0].invoices_due_7d),
    students_due_7d: normalizeNumber(rows[0].students_due_7d),
    amount_due_7d: normalizeNumber(rows[0].amount_due_7d),
    amount_due_today: normalizeNumber(rows[0].amount_due_today),
  };
}

// ============================================================================
// Module 5: Due Soon Series
// ============================================================================
export async function getDueSoonSeries(
  sql: SqlClient = getSqlClient(),
): Promise<FinancialDueSoonSeries[]> {
  const rows = await safeRows(
    () =>
      sql`SELECT d, amount, invoices FROM mgmt.financial_due_soon_series_v ORDER BY d`,
    "financial_due_soon_series_v",
  );
  return rows.map((row) => ({
    d: normalizeString(row.d),
    amount: normalizeNumber(row.amount),
    invoices: normalizeNumber(row.invoices),
  }));
}

// ============================================================================
// Module 6: Students with Debts
// ============================================================================
export async function getStudentsWithDebts(
  sql: SqlClient = getSqlClient(),
): Promise<FinancialStudentWithDebt[]> {
  const rows = await safeRows(
    () => sql`
      SELECT 
        student_id, 
        full_name, 
        total_overdue_amount, 
        max_days_overdue,
        oldest_due_date, 
        most_recent_missed_due_date, 
        open_invoices
      FROM mgmt.financial_students_with_debts_v
      ORDER BY total_overdue_amount DESC
    `,
    "financial_students_with_debts_v",
  );
  return rows.map((row) => ({
    student_id: normalizeNumber(row.student_id),
    full_name: normalizeString(row.full_name),
    total_overdue_amount: normalizeNumber(row.total_overdue_amount),
    max_days_overdue: normalizeNumber(row.max_days_overdue),
    oldest_due_date: normalizeString(row.oldest_due_date),
    most_recent_missed_due_date: normalizeString(
      row.most_recent_missed_due_date,
    ),
    open_invoices: normalizeNumber(row.open_invoices),
  }));
}

// ============================================================================
// Module 7: Overdue Items per Student
// ============================================================================
export async function getOverdueItems(
  studentId: number,
  sql: SqlClient = getSqlClient(),
): Promise<FinancialOverdueItem[]> {
  const rows = await safeRows(
    () => sql`
      SELECT 
        payment_id, 
        due_date, 
        amount, 
        is_paid, 
        received_date,
        (CURRENT_DATE - due_date) AS days_overdue
      FROM mgmt.financial_overdue_items_v
      WHERE student_id = ${studentId}
      ORDER BY due_date ASC
    `,
    "financial_overdue_items_v",
  );
  return rows.map((row) => ({
    payment_id: normalizeNumber(row.payment_id),
    due_date: normalizeString(row.due_date),
    amount: normalizeNumber(row.amount),
    is_paid: normalizeBoolean(row.is_paid),
    received_date: row.received_date ? normalizeString(row.received_date) : null,
    days_overdue: normalizeNumber(row.days_overdue),
  }));
}
