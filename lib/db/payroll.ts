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
    SELECT
      m.staff_id, m.work_date, m.approved, m.approved_minutes,
      m.approved_by, m.approved_at, m.total_minutes,
      ROUND(
        CASE WHEN m.approved IS TRUE
             THEN COALESCE(m.approved_minutes, m.total_minutes)::numeric / 60.0
             ELSE m.total_minutes::numeric / 60.0 END, 2
      ) AS display_hours
    FROM public.staff_day_matrix_v m
    WHERE m.work_date BETWEEN $1::date AND $2::date
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
