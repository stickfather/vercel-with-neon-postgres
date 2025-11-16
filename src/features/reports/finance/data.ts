import { getSqlClient, normalizeRows, type SqlRow } from "@/lib/db/client";
import type {
  FinancialCollections30d,
  FinancialCollections30dSeries,
  FinancialOutstandingStudent,
  FinancialRecovery30d,
  FinancialUpcomingDue,
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
// Module 1: Collections 30d Summary (from final.finance_collections_30d_mv)
// ============================================================================
export async function getCollections30d(
  sql: SqlClient = getSqlClient(),
): Promise<FinancialCollections30d | null> {
  const rows = await safeRows(
    () =>
      sql`
        SELECT 
          COALESCE(SUM(payments_amount), 0) AS payments_amount_30d,
          COALESCE(SUM(payments_count), 0) AS payments_count_30d
        FROM final.finance_collections_30d_mv
      `,
    "final.finance_collections_30d_mv",
  );
  if (rows.length === 0) return null;
  return {
    payments_amount_30d: normalizeNumber(rows[0].payments_amount_30d),
    payments_count_30d: normalizeNumber(rows[0].payments_count_30d),
  };
}

// ============================================================================
// Module 1: Collections 30d Series (from final.finance_collections_30d_mv)
// ============================================================================
export async function getCollections30dSeries(
  sql: SqlClient = getSqlClient(),
): Promise<FinancialCollections30dSeries[]> {
  const rows = await safeRows(
    () =>
      sql`
        SELECT 
          local_day, 
          payments_amount, 
          payments_count 
        FROM final.finance_collections_30d_mv 
        ORDER BY local_day
      `,
    "final.finance_collections_30d_mv",
  );
  return rows.map((row) => ({
    local_day: normalizeString(row.local_day),
    payments_amount: normalizeNumber(row.payments_amount),
    payments_count: normalizeNumber(row.payments_count),
  }));
}

// ============================================================================
// Module 2: Outstanding Students (from final.finance_outstanding_today_mv)
// ============================================================================
export async function getOutstandingStudents(
  sql: SqlClient = getSqlClient(),
): Promise<FinancialOutstandingStudent[]> {
  const rows = await safeRows(
    () => sql`
      SELECT 
        student_id,
        student_name,
        student_status,
        student_archived,
        outstanding_amount,
        overdue_amount,
        overdue_0_30,
        overdue_31_60,
        overdue_61_90,
        overdue_90_plus
      FROM final.finance_outstanding_today_mv
      ORDER BY overdue_amount DESC
    `,
    "final.finance_outstanding_today_mv",
  );
  return rows.map((row) => ({
    student_id: normalizeNumber(row.student_id),
    student_name: normalizeString(row.student_name),
    student_status: normalizeString(row.student_status),
    student_archived: normalizeBoolean(row.student_archived),
    outstanding_amount: normalizeNumber(row.outstanding_amount),
    overdue_amount: normalizeNumber(row.overdue_amount),
    overdue_0_30: normalizeNumber(row.overdue_0_30),
    overdue_31_60: normalizeNumber(row.overdue_31_60),
    overdue_61_90: normalizeNumber(row.overdue_61_90),
    overdue_90_plus: normalizeNumber(row.overdue_90_plus),
  }));
}

// ============================================================================
// Module 3: Recovery 30d (from final.finance_recovery_30d_mv)
// ============================================================================
export async function getRecovery30d(
  sql: SqlClient = getSqlClient(),
): Promise<FinancialRecovery30d | null> {
  const rows = await safeRows(
    () =>
      sql`
        SELECT 
          payments_amount_30d,
          outstanding_today,
          recovered_pct_approx
        FROM final.finance_recovery_30d_mv
      `,
    "final.finance_recovery_30d_mv",
  );
  if (rows.length === 0) return null;
  return {
    payments_amount_30d: normalizeNumber(rows[0].payments_amount_30d),
    outstanding_today: normalizeNumber(rows[0].outstanding_today),
    recovered_pct_approx: normalizeNumber(rows[0].recovered_pct_approx),
  };
}

// ============================================================================
// Module 4: Upcoming Due 7d (from final.finance_upcoming_due_7d_mv)
// ============================================================================
export async function getUpcomingDue(
  sql: SqlClient = getSqlClient(),
): Promise<FinancialUpcomingDue[]> {
  const rows = await safeRows(
    () =>
      sql`
        SELECT 
          due_day, 
          due_amount, 
          invoices_count 
        FROM final.finance_upcoming_due_7d_mv 
        ORDER BY due_day
      `,
    "final.finance_upcoming_due_7d_mv",
  );
  return rows.map((row) => ({
    due_day: normalizeString(row.due_day),
    due_amount: normalizeNumber(row.due_amount),
    invoices_count: normalizeNumber(row.invoices_count),
  }));
}

// ============================================================================
// Module 5: Overdue Items per Student (kept for backward compatibility)
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
