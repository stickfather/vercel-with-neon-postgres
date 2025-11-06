import {
  getSqlClient,
  normalizeRows,
  type SqlRow,
} from "@/lib/db/client";
import type {
  FinanceReport,
  AgingBuckets,
  CollectionsTotals,
  CollectionsPoint,
  DebtorRow,
  DueSoonSummary,
  DueSoonPoint,
} from "@/types/reports.finance";

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value);
  return str.length ? str : fallback;
}

function isMissingRelation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const pgError = error as { code?: string; message?: string };
  if (pgError.code && pgError.code.toUpperCase() === "42P01") return true;
  return typeof pgError.message === "string" && /does not exist/i.test(pgError.message);
}

async function safeQuery<T>(
  primary: () => Promise<T>,
  fallback: T,
  label: string
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (isMissingRelation(error)) {
      console.warn(`Vista no encontrada: ${label}, usando fallback`);
      return fallback;
    }
    console.error(`Error en query ${label}:`, error);
    return fallback;
  }
}

export async function getFinanceReport(): Promise<FinanceReport> {
  const sql = getSqlClient();

  const [
    outstandingStudentsRows,
    outstandingBalanceRows,
    agingRows,
    collectionsTotalsRows,
    collectionsSeriesRows,
    debtorsRows,
    dueSoonSummaryRows,
    dueSoonSeriesRows,
  ] = await Promise.all([
    safeQuery(
      () => sql`SELECT outstanding_students FROM financial_outstanding_students_v`,
      [],
      "financial_outstanding_students_v"
    ),
    safeQuery(
      () => sql`SELECT outstanding_balance FROM financial_outstanding_balance_v`,
      [],
      "financial_outstanding_balance_v"
    ),
    safeQuery(
      () => sql`SELECT * FROM financial_aging_buckets_v`,
      [],
      "financial_aging_buckets_v"
    ),
    safeQuery(
      () => sql`SELECT total_collected_30d, payments_count_30d FROM financial_collections_30d_v`,
      [],
      "financial_collections_30d_v"
    ),
    safeQuery(
      () => sql`SELECT d, amount FROM financial_collections_30d_series_v ORDER BY d`,
      [],
      "financial_collections_30d_series_v"
    ),
    safeQuery(
      () => sql`
        SELECT student_id, full_name, total_overdue_amount, max_days_overdue, 
               oldest_due_date, most_recent_missed_due_date, open_invoices, 
               COALESCE(priority_score, NULL) AS priority_score
        FROM financial_students_with_debts_v
        ORDER BY total_overdue_amount DESC
        LIMIT 200
      `,
      [],
      "financial_students_with_debts_v"
    ),
    safeQuery(
      () => sql`
        SELECT invoices_due_7d, students_due_7d, amount_due_7d, amount_due_today 
        FROM mgmt.financial_due_soon_summary_v
      `,
      [],
      "mgmt.financial_due_soon_summary_v"
    ),
    safeQuery(
      () => sql`SELECT d, amount, invoices FROM mgmt.financial_due_soon_series_v ORDER BY d`,
      [],
      "mgmt.financial_due_soon_series_v"
    ),
  ]);

  // Parse outstanding students
  const outstandingStudentsNormalized = normalizeRows<{ outstanding_students: number }>(outstandingStudentsRows);
  const outstanding_students = toNumber(outstandingStudentsNormalized[0]?.outstanding_students ?? 0);

  // Parse outstanding balance
  const outstandingBalanceNormalized = normalizeRows<{ outstanding_balance: number }>(outstandingBalanceRows);
  const outstanding_balance = toNumber(outstandingBalanceNormalized[0]?.outstanding_balance ?? 0);

  // Parse aging buckets
  const agingNormalized = normalizeRows<SqlRow>(agingRows);
  const agingRow = agingNormalized[0] ?? {};
  const aging: AgingBuckets = {
    amt_0_30: toNumber(agingRow.amt_0_30),
    amt_31_60: toNumber(agingRow.amt_31_60),
    amt_61_90: toNumber(agingRow.amt_61_90),
    amt_over_90: toNumber(agingRow.amt_over_90),
    cnt_0_30: toNumber(agingRow.cnt_0_30),
    cnt_31_60: toNumber(agingRow.cnt_31_60),
    cnt_61_90: toNumber(agingRow.cnt_61_90),
    cnt_over_90: toNumber(agingRow.cnt_over_90),
    amt_total: toNumber(agingRow.amt_total),
    cnt_total: toNumber(agingRow.cnt_total),
  };

  // Parse collections totals
  const collectionsTotalsNormalized = normalizeRows<CollectionsTotals>(collectionsTotalsRows);
  const collections_totals: CollectionsTotals = collectionsTotalsNormalized[0] ?? {
    total_collected_30d: 0,
    payments_count_30d: 0,
  };

  // Parse collections series
  const collectionsSeriesNormalized = normalizeRows<CollectionsPoint>(collectionsSeriesRows);
  const collections_series: CollectionsPoint[] = collectionsSeriesNormalized.map((row) => ({
    d: normalizeString(row.d),
    amount: toNumber(row.amount),
  }));

  // Parse debtors
  const debtorsNormalized = normalizeRows<DebtorRow>(debtorsRows);
  const debtors: DebtorRow[] = debtorsNormalized.map((row) => ({
    student_id: toNumber(row.student_id),
    full_name: row.full_name ?? null,
    total_overdue_amount: toNumber(row.total_overdue_amount),
    max_days_overdue: toNumber(row.max_days_overdue),
    oldest_due_date: row.oldest_due_date ? String(row.oldest_due_date) : null,
    most_recent_missed_due_date: row.most_recent_missed_due_date ? String(row.most_recent_missed_due_date) : null,
    open_invoices: toNumber(row.open_invoices),
    priority_score: toNullableNumber(row.priority_score),
  }));

  // Parse due soon summary
  const dueSoonSummaryNormalized = normalizeRows<DueSoonSummary>(dueSoonSummaryRows);
  const due_soon_summary: DueSoonSummary = dueSoonSummaryNormalized[0] ?? {
    invoices_due_7d: 0,
    students_due_7d: 0,
    amount_due_7d: 0,
    amount_due_today: 0,
  };

  // Parse due soon series
  const dueSoonSeriesNormalized = normalizeRows<DueSoonPoint>(dueSoonSeriesRows);
  const due_soon_series: DueSoonPoint[] = dueSoonSeriesNormalized.map((row) => ({
    d: normalizeString(row.d),
    amount: toNumber(row.amount),
    invoices: toNumber(row.invoices),
  }));

  return {
    last_refreshed_at: new Date().toISOString(),
    outstanding_students,
    outstanding_balance,
    aging,
    collections_totals,
    collections_series,
    debtors,
    due_soon_summary,
    due_soon_series,
  };
}

export async function getDueSoonRoster(): Promise<SqlRow[]> {
  const sql = getSqlClient();
  try {
    const res = await sql`
      SELECT *
      FROM mgmt.financial_due_soon_v
      ORDER BY due_date DESC, amount DESC
    `;
    return normalizeRows<SqlRow>(res);
  } catch (error) {
    if (isMissingRelation(error)) {
      console.warn('Vista mgmt.financial_due_soon_v no encontrada, retornando array vacío');
      return [];
    }
    throw error;
  }
}
