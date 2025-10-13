import { getSqlClient, normalizeRows } from "@/lib/db/client";

export type StaffDayMatrixRow = {
  staff_id: number;
  work_date: string;
  approved: boolean | null;
  approved_minutes: number | null;
  approved_by: number | null;
  approved_at: string | null;
  total_minutes: number;
  display_hours: number;
};

export async function getStaffDayMatrix({ from, to }: { from: string; to: string }) {
  const sql = await getSqlClient();
  const res = await sql.query(
    `
    WITH session_totals AS (
      SELECT
        s.staff_id,
        s.work_date,
        SUM(COALESCE(s.minutes, 0))::integer AS total_minutes
      FROM public.staff_day_sessions_v s
      WHERE s.work_date BETWEEN $1::date AND $2::date
      GROUP BY s.staff_id, s.work_date
    ),
    approvals AS (
      SELECT
        a.staff_id,
        a.work_date,
        a.approved,
        a.approved_minutes,
        a.approved_by,
        a.approved_at
      FROM payroll_day_approvals a
      WHERE a.work_date BETWEEN $1::date AND $2::date
    ),
    combined AS (
      SELECT
        COALESCE(st.staff_id, ap.staff_id) AS staff_id,
        COALESCE(st.work_date, ap.work_date) AS work_date,
        COALESCE(st.total_minutes, 0) AS total_minutes,
        ap.approved,
        ap.approved_minutes,
        ap.approved_by,
        ap.approved_at
      FROM session_totals st
      FULL OUTER JOIN approvals ap
        ON ap.staff_id = st.staff_id AND ap.work_date = st.work_date
      WHERE COALESCE(st.staff_id, ap.staff_id) IS NOT NULL
        AND COALESCE(st.work_date, ap.work_date) BETWEEN $1::date AND $2::date
    )
    SELECT
      c.staff_id,
      c.work_date,
      c.approved,
      c.approved_minutes,
      c.approved_by,
      c.approved_at,
      c.total_minutes,
      ROUND(
        CASE WHEN c.approved IS TRUE
             THEN COALESCE(c.approved_minutes, c.total_minutes)::numeric / 60.0
             ELSE c.total_minutes::numeric / 60.0 END, 2
      ) AS display_hours
    FROM combined c
    ORDER BY c.staff_id, c.work_date;`,
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
