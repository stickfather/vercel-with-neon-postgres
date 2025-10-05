import {
  getSqlClient,
  normalizeRows,
  SqlRow,
  TIMEZONE,
} from "@/lib/db/client";

export type MatrixCell = {
  date: string;
  hours: number;
  status: "approved" | "pending";
};

export type MatrixRow = {
  staffId: number;
  staffName?: string;
  cells: MatrixCell[];
  totalApprovedAmount: number;
  amountPaid: number;
};

export type PayrollMatrixResponse = {
  days: string[];
  rows: MatrixRow[];
};

export type DaySession = {
  sessionId: number | null;
  staffId: number;
  workDate: string;
  checkinTime: string | null;
  checkoutTime: string | null;
  hours: number;
};

export type PayrollMonthStatusRow = {
  staffId: number;
  month: string;
  approvedDays: number;
  approvedHours: number;
  amountPaid: number;
  paid: boolean;
  lastApprovedAt: string | null;
  reference: string | null;
  paidBy: string | null;
  paidAt: string | null;
};

function toIsoDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function enumerateDays(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));

  while (cursor.getTime() <= end.getTime()) {
    days.push(toIsoDateString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

function toNumber(value: unknown, fractionDigits = 2): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value.toFixed(fractionDigits));
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Number(parsed.toFixed(fractionDigits));
    }
  }
  return 0;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["t", "true", "1", "yes", "y", "si", "sí"].includes(normalized);
  }
  return false;
}

function coerceString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

export async function fetchPayrollMatrix({
  from,
  to,
}: {
  from: string;
  to: string;
}): Promise<PayrollMatrixResponse> {
  const sql = getSqlClient();

  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T00:00:00Z`);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error("Las fechas proporcionadas no son válidas.");
  }

  if (fromDate.getTime() > toDate.getTime()) {
    throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
  }

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      m.staff_id AS staff_id,
      m.work_date AS work_date,
      ROUND(m.total_hours::numeric, 2) AS hours,
      m.approved AS approved,
      m.approved_minutes AS approved_minutes,
      m.approved_by AS approved_by,
      m.approved_at AT TIME ZONE ${TIMEZONE} AS approved_at
    FROM public.staff_day_matrix_v m
    WHERE m.work_date BETWEEN ${from}::date AND ${to}::date
    ORDER BY m.staff_id, m.work_date
  `);

  const staffIds = Array.from(
    new Set(
      rows
        .map((row) => Number(row.staff_id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  );

  const staffInfo = new Map<
    number,
    { name: string; hourlyRate: number }
  >();

  if (staffIds.length) {
    const staffRows = normalizeRows<SqlRow>(await sql`
      SELECT id, full_name, hourly_wage
      FROM staff_members
      WHERE id = ANY(${staffIds}::bigint[])
    `);

    for (const row of staffRows) {
      const id = Number(row.id);
      if (!Number.isFinite(id)) continue;
      const name = coerceString(row.full_name) ?? undefined;
      const hourlyRate = toNumber(row.hourly_wage ?? 0);
      staffInfo.set(id, { name: name ?? "", hourlyRate });
    }
  }

  const monthStart = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), 1));
  const months: string[] = [];
  const monthCursor = new Date(monthStart);
  while (monthCursor.getTime() <= monthEnd.getTime()) {
    const monthKey = `${monthCursor.getUTCFullYear()}-${String(
      monthCursor.getUTCMonth() + 1,
    ).padStart(2, "0")}`;
    months.push(monthKey);
    monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1);
  }

  const paidAmountByStaff = new Map<number, number>();

  if (staffIds.length && months.length) {
    const monthRows = normalizeRows<SqlRow>(await sql`
      SELECT
        v.staff_id,
        to_char(v.month, 'YYYY-MM') AS month_key,
        COALESCE(v.amount_paid, 0) AS amount_paid
      FROM public.payroll_month_status_v v
      WHERE v.month BETWEEN date_trunc('month', ${from}::date)
        AND date_trunc('month', ${to}::date)
        AND v.staff_id = ANY(${staffIds}::bigint[])
    `);

    for (const row of monthRows) {
      const staffId = Number(row.staff_id);
      if (!Number.isFinite(staffId)) continue;
      const monthKey = coerceString(row.month_key);
      if (!monthKey || !months.includes(monthKey)) continue;
      const amount = toNumber(row.amount_paid ?? 0, 2);
      paidAmountByStaff.set(
        staffId,
        Number(((paidAmountByStaff.get(staffId) ?? 0) + amount).toFixed(2)),
      );
    }
  }

  const days = enumerateDays(fromDate, toDate);

  const grouped = new Map<
    number,
    {
      staffId: number;
      staffName?: string;
      hourlyRate: number;
      cells: Map<string, MatrixCell>;
    }
  >();

  for (const row of rows) {
    const staffId = Number(row.staff_id);
    if (!Number.isFinite(staffId)) continue;
    const workDate = coerceString(row.work_date);
    if (!workDate) continue;

    if (!grouped.has(staffId)) {
      const info = staffInfo.get(staffId);
      grouped.set(staffId, {
        staffId,
        staffName: info?.name,
        hourlyRate: info?.hourlyRate ?? 0,
        cells: new Map(),
      });
    }

    const container = grouped.get(staffId)!;
    const hours = toNumber(row.hours ?? row.total_hours ?? 0, 2);
    const approved = toBoolean(row.approved);

    container.cells.set(workDate, {
      date: workDate,
      hours,
      status: approved ? "approved" : "pending",
    });
  }

  const matrixRows: MatrixRow[] = [];

  for (const [, value] of grouped) {
    const cells: MatrixCell[] = days.map((day) => {
      const existing = value.cells.get(day);
      if (existing) return existing;
      return { date: day, hours: 0, status: "pending" };
    });

    const approvedHours = cells
      .filter((cell) => cell.status === "approved")
      .reduce((sum, cell) => sum + cell.hours, 0);

    matrixRows.push({
      staffId: value.staffId,
      staffName: value.staffName,
      cells,
      totalApprovedAmount: Number((approvedHours * value.hourlyRate).toFixed(2)),
      amountPaid: paidAmountByStaff.get(value.staffId) ?? 0,
    });
  }

  matrixRows.sort((a, b) => a.staffId - b.staffId);

  return { days, rows: matrixRows };
}

export async function fetchDaySessions({
  staffId,
  workDate,
}: {
  staffId: number;
  workDate: string;
}): Promise<DaySession[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      s.staff_id AS staff_id,
      s.work_date AS work_date,
      s.checkin_time AS checkin_time,
      s.checkout_time AS checkout_time,
      ROUND((s.minutes / 60.0)::numeric, 2) AS hours
    FROM public.staff_day_sessions_v s
    WHERE s.staff_id = ${staffId}::bigint
      AND s.work_date = ${workDate}::date
    ORDER BY s.checkin_time NULLS LAST
  `);

  const attendanceRows = normalizeRows<SqlRow>(await sql`
    SELECT
      sa.id,
      timezone(${TIMEZONE}, sa.checkin_time) AS checkin_local,
      timezone(${TIMEZONE}, sa.checkout_time) AS checkout_local
    FROM staff_attendance sa
    WHERE sa.staff_id = ${staffId}::bigint
      AND date(timezone(${TIMEZONE}, sa.checkin_time)) = ${workDate}::date
    ORDER BY sa.checkin_time ASC
  `);

  return rows.map((row, index) => {
    const sessionId = Number(attendanceRows[index]?.id ?? NaN);
    const checkinTime = coerceString(row.checkin_time);
    const checkoutTime = coerceString(row.checkout_time);
    return {
      sessionId: Number.isFinite(sessionId) ? sessionId : null,
      staffId: Number(row.staff_id ?? staffId),
      workDate: coerceString(row.work_date) ?? workDate,
      checkinTime,
      checkoutTime,
      hours: toNumber(row.hours ?? row.minutes ?? 0, 2),
    };
  });
}

export async function approveStaffDay({
  staffId,
  workDate,
}: {
  staffId: number;
  workDate: string;
}): Promise<void> {
  const sql = getSqlClient();
  await sql`SELECT public.approve_staff_day(${staffId}::bigint, ${workDate}::date)`;
}

function ensureIsoString(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export async function overrideSessionsAndApprove({
  staffId,
  workDate,
  overrides,
}: {
  staffId: number;
  workDate: string;
  overrides: {
    sessionId: number;
    checkinTime: string;
    checkoutTime: string;
  }[];
}): Promise<void> {
  const sql = getSqlClient();

  await sql`BEGIN`;
  try {
    for (const override of overrides) {
      const checkinIso = ensureIsoString(override.checkinTime);
      const checkoutIso = ensureIsoString(override.checkoutTime);
      if (!checkinIso || !checkoutIso) {
        throw new Error("Las horas de entrada y salida deben ser válidas.");
      }

      await sql`
        UPDATE staff_attendance
        SET checkin_time = ${checkinIso}::timestamptz,
            checkout_time = ${checkoutIso}::timestamptz
        WHERE id = ${override.sessionId}::bigint
          AND staff_id = ${staffId}::bigint
      `;
    }

    await sql`SELECT public.approve_staff_day(${staffId}::bigint, ${workDate}::date)`;
    await sql`COMMIT`;
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }
}

export async function fetchPayrollMonthStatus({
  month,
  staffId,
}: {
  month: string;
  staffId?: number | null;
}): Promise<PayrollMonthStatusRow[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      v.staff_id AS staff_id,
      to_char(v.month, 'YYYY-MM') AS month_key,
      v.approved_days AS approved_days,
      v.approved_hours AS approved_hours,
      v.amount_paid AS amount_paid,
      v.paid AS paid,
      v.last_approved_at AT TIME ZONE ${TIMEZONE} AS last_approved_at,
      v.reference AS reference,
      v.paid_by AS paid_by,
      v.paid_at AT TIME ZONE ${TIMEZONE} AS paid_at
    FROM public.payroll_month_status_v v
    WHERE to_char(v.month, 'YYYY-MM') = ${month}
      AND (${staffId ?? null}::bigint IS NULL OR v.staff_id = ${staffId ?? null}::bigint)
    ORDER BY v.staff_id
  `);

  return rows.map((row) => ({
    staffId: Number(row.staff_id),
    month: coerceString(row.month_key) ?? month,
    approvedDays: Number(row.approved_days ?? 0),
    approvedHours: toNumber(row.approved_hours ?? 0, 2),
    amountPaid: toNumber(row.amount_paid ?? 0, 2),
    paid: toBoolean(row.paid),
    lastApprovedAt: coerceString(row.last_approved_at),
    reference: coerceString(row.reference),
    paidBy: coerceString(row.paid_by),
    paidAt: coerceString(row.paid_at),
  }));
}
