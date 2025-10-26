import { getSqlClient, normalizeRows } from "@/lib/db/client";

export type StaffDayMatrixRow = {
  staff_id: number;
  work_date: string;
  approved: boolean | null;
  approved_minutes: number | null;
  approved_by: string | null;
  approved_at: string | null;
  total_minutes: number;
  display_hours: number;
  has_edits: boolean;
};

export async function getStaffDayMatrix({ from, to }: { from: string; to: string }) {
  const sql = await getSqlClient();
  const res = await sql.query(
    `
    WITH matrix AS (
      SELECT
        m.staff_id,
        m.work_date,
        m.total_hours,
        m.approved_hours,
        m.approved
      FROM public.staff_day_matrix_local_v m
      WHERE m.work_date BETWEEN $1::date AND $2::date
    ),
    approvals AS (
      SELECT
        a.staff_id,
        a.work_date,
        a.approved_by,
        a.approved_at
      FROM public.payroll_day_approvals a
      WHERE a.work_date BETWEEN $1::date AND $2::date
    ),
    edit_flags AS (
      SELECT
        s.staff_id,
        s.work_date,
        BOOL_OR(s.was_edited) AS has_edits
      FROM public.staff_day_sessions_with_edits_v s
      WHERE s.work_date BETWEEN $1::date AND $2::date
      GROUP BY s.staff_id, s.work_date
    )
    SELECT
      m.staff_id,
      m.work_date,
      m.approved,
      (CASE WHEN m.approved_hours IS NULL THEN NULL ELSE ROUND(m.approved_hours * 60)::integer END) AS approved_minutes,
      ap.approved_by,
      ap.approved_at,
      ROUND(COALESCE(m.total_hours, 0) * 60)::integer AS total_minutes,
      ROUND(COALESCE(CASE WHEN m.approved THEN COALESCE(m.approved_hours, m.total_hours) ELSE m.total_hours END, 0)::numeric, 2) AS display_hours,
      COALESCE(ef.has_edits, FALSE) AS has_edits
    FROM matrix m
    LEFT JOIN approvals ap
      ON ap.staff_id = m.staff_id AND ap.work_date = m.work_date
    LEFT JOIN edit_flags ef
      ON ef.staff_id = m.staff_id AND ef.work_date = m.work_date
    ORDER BY m.staff_id, m.work_date;`,
    [from, to],
  );
  return normalizeRows<StaffDayMatrixRow>(res);
}

export type PayrollMonthSummaryRow = {
  staff_id: number;
  staff_name: string;
  month: string;
  approved_amount: string;
  paid: boolean | null;
  amount_paid: string | null;
  paid_at: string | null;
  reference: string | null;
};

export async function getPayrollMonthSummary(monthStart: string) {
  const sql = await getSqlClient();
  const res = await sql.query(
    `
    SELECT staff_id, staff_name, month, approved_amount, paid, amount_paid, paid_at, reference
    FROM public.payroll_month_summary_v
    WHERE month = $1::date
    ORDER BY staff_name;`,
    [monthStart],
  );
  return normalizeRows<PayrollMonthSummaryRow>(res);
}
