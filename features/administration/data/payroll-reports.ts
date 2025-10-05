import {
  getSqlClient,
  normalizeRows,
  SqlRow,
  TIMEZONE,
} from "@/lib/db/client";

type SqlClient = ReturnType<typeof getSqlClient>;

export type MatrixCell = {
  date: string;
  hours: number;
  approved: boolean;
};

export type MatrixRow = {
  staffId: number;
  staffName?: string;
  cells: MatrixCell[];
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

function toInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }
  return null;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function toMinutesFromHours(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 60);
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.round(parsed * 60);
    }
  }
  return null;
}

function findColumn(columns: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (columns.includes(candidate)) return candidate;
  }
  return null;
}

async function fetchTableColumns(
  sql: SqlClient,
  schema: string,
  table: string,
): Promise<string[]> {
  const rows = normalizeRows<SqlRow>(await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = ${schema}
      AND table_name = ${table}
  `);

  return rows
    .map((row) => coerceString(row.column_name))
    .filter((name): name is string => Boolean(name))
    .map((name) => name);
}

type StaffDayTableInfo = {
  schema: string;
  name: string;
  staffIdColumn: string;
  workDateColumn: string;
  approvedColumn: string;
  approvedMinutesColumn: string;
  totalMinutesColumn: string | null;
  approvedAtColumn: string | null;
  approvedByColumn: string | null;
};

let staffDayTableCache: StaffDayTableInfo | null = null;

async function resolveStaffDayTable(sql: SqlClient): Promise<StaffDayTableInfo> {
  if (staffDayTableCache) return staffDayTableCache;

  const usageRows = normalizeRows<SqlRow>(await sql`
    SELECT table_schema, table_name
    FROM information_schema.view_table_usage
    WHERE view_schema = 'public'
      AND view_name = 'staff_day_matrix_v'
  `);

  for (const row of usageRows) {
    const schema = coerceString(row.table_schema) ?? "public";
    const tableName = coerceString(row.table_name);
    if (!tableName) continue;

    const columns = await fetchTableColumns(sql, schema, tableName);
    const staffIdColumn = findColumn(columns, ["staff_id"]);
    const workDateColumn = findColumn(columns, ["work_date", "workday", "date"]);
    const approvedColumn = findColumn(columns, ["approved", "is_approved"]);
    const approvedMinutesColumn = findColumn(columns, [
      "approved_minutes",
      "approved_total_minutes",
    ]);
    const totalMinutesColumn = findColumn(columns, [
      "total_minutes",
      "minutes",
      "total_work_minutes",
    ]);
    const approvedAtColumn = findColumn(columns, ["approved_at"]);
    const approvedByColumn = findColumn(columns, ["approved_by", "approved_by_user"]);

    if (staffIdColumn && workDateColumn && approvedColumn && approvedMinutesColumn) {
      staffDayTableCache = {
        schema,
        name: tableName,
        staffIdColumn,
        workDateColumn,
        approvedColumn,
        approvedMinutesColumn,
        totalMinutesColumn: totalMinutesColumn ?? null,
        approvedAtColumn: approvedAtColumn ?? null,
        approvedByColumn: approvedByColumn ?? null,
      };
      return staffDayTableCache;
    }
  }

  throw new Error(
    "No se pudo identificar la tabla base para las aprobaciones de asistencia del personal.",
  );
}

async function applyStaffDayApproval(
  sql: SqlClient,
  staffId: number,
  workDate: string,
  approvedMinutes: number | null,
): Promise<void> {
  const table = await resolveStaffDayTable(sql);
  const alias = "t";
  const params: Array<number | string> = [staffId, workDate];

  let approvedMinutesExpression: string;
  if (approvedMinutes != null && Number.isFinite(approvedMinutes)) {
    const rounded = Math.max(0, Math.round(approvedMinutes));
    params.push(rounded);
    approvedMinutesExpression = `$${params.length}`;
  } else if (table.totalMinutesColumn) {
    approvedMinutesExpression = `COALESCE(${alias}.${quoteIdentifier(table.approvedMinutesColumn)}, ${alias}.${quoteIdentifier(table.totalMinutesColumn)})`;
  } else {
    approvedMinutesExpression = `${alias}.${quoteIdentifier(table.approvedMinutesColumn)}`;
  }

  const updates: string[] = [
    `${quoteIdentifier(table.approvedColumn)} = TRUE`,
    `${quoteIdentifier(table.approvedMinutesColumn)} = ${approvedMinutesExpression}`,
  ];

  if (table.approvedAtColumn) {
    updates.push(`${quoteIdentifier(table.approvedAtColumn)} = NOW()`);
  }
  if (table.approvedByColumn) {
    updates.push(`${quoteIdentifier(table.approvedByColumn)} = current_user`);
  }

  const tableRef = `${quoteIdentifier(table.schema)}.${quoteIdentifier(table.name)}`;
  const query = `
    UPDATE ${tableRef} AS ${alias}
    SET ${updates.join(", ")}
    WHERE ${alias}.${quoteIdentifier(table.staffIdColumn)} = $1::bigint
      AND ${alias}.${quoteIdentifier(table.workDateColumn)} = $2::date
  `;

  const client = sql as unknown as {
    unsafe: (query: string, params?: unknown[]) => Promise<unknown>;
  };
  await client.unsafe(query, params);
}

export async function fetchPayrollMatrix({
  month,
}: {
  month: string;
}): Promise<PayrollMatrixResponse> {
  const sql = getSqlClient();

  const viewColumns = await fetchTableColumns(sql, "public", "staff_day_matrix_v");
  const staffNameColumn = findColumn(viewColumns, [
    "staff_name",
    "staff_full_name",
    "full_name",
    "name",
  ]);

  const [rawYear, rawMonth] = month.split("-");
  const year = Number(rawYear);
  const monthIndex = Number(rawMonth) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new Error("Debes indicar el mes en formato 'YYYY-MM'.");
  }

  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const nextMonthStart = new Date(Date.UTC(year, monthIndex + 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0));

  const monthStartIso = toIsoDateString(monthStart);
  const nextMonthIso = toIsoDateString(nextMonthStart);

  const selectColumns = [
    "m.staff_id AS staff_id",
    staffNameColumn
      ? `m.${quoteIdentifier(staffNameColumn)} AS staff_name`
      : null,
    "m.work_date AS work_date",
    "m.total_hours AS total_hours",
    "m.approved AS approved",
    "m.approved_hours AS approved_hours",
  ]
    .filter((value): value is string => Boolean(value))
    .join(",\n      ");

  const query = `
    SELECT
      ${selectColumns}
    FROM public.staff_day_matrix_v m
    WHERE m.work_date >= $1::date
      AND m.work_date < $2::date
    ORDER BY m.staff_id, m.work_date
  `;

  const unsafeSql = sql as unknown as {
    unsafe: (text: string, params?: unknown[]) => Promise<unknown>;
  };

  const rows = normalizeRows<SqlRow>(
    await unsafeSql.unsafe(query, [monthStartIso, nextMonthIso]),
  );

  const days = enumerateDays(monthStart, monthEnd);

  const grouped = new Map<
    number,
    {
      staffId: number;
      staffName?: string;
      cells: Map<string, MatrixCell>;
    }
  >();

  for (const row of rows) {
    const staffId = Number(row.staff_id);
    if (!Number.isFinite(staffId)) continue;
    const workDate = coerceString(row.work_date);
    if (!workDate) continue;

    if (!grouped.has(staffId)) {
      grouped.set(staffId, {
        staffId,
        staffName: coerceString(row.staff_name) ?? undefined,
        cells: new Map(),
      });
    }

    const totalHours = toNumber(row.total_hours ?? 0, 2);
    const approved = toBoolean(row.approved);
    const approvedHours = toNumber(row.approved_hours ?? row.total_hours ?? 0, 2);

    grouped.get(staffId)!.cells.set(workDate, {
      date: workDate,
      hours: approved ? approvedHours : totalHours,
      approved,
    });
  }

  const matrixRows: MatrixRow[] = [];

  for (const [, value] of grouped) {
    const cells: MatrixCell[] = days.map((day) => {
      const existing = value.cells.get(day);
      if (existing) return existing;
      return { date: day, hours: 0, approved: false };
    });

    matrixRows.push({
      staffId: value.staffId,
      staffName: value.staffName,
      cells,
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
  await applyStaffDayApproval(sql, staffId, workDate, null);
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

    const recalculatedRows = normalizeRows<SqlRow>(await sql`
      SELECT
        m.total_minutes AS total_minutes,
        m.approved_minutes AS approved_minutes,
        m.total_hours AS total_hours
      FROM public.staff_day_matrix_v m
      WHERE m.staff_id = ${staffId}::bigint
        AND m.work_date = ${workDate}::date
      LIMIT 1
    `);

    const metrics = recalculatedRows[0] ?? {};
    const recalculatedMinutes =
      toInteger(metrics.total_minutes ?? metrics.minutes ?? null) ??
      toMinutesFromHours(metrics.total_hours ?? metrics.hours ?? null);

    await applyStaffDayApproval(sql, staffId, workDate, recalculatedMinutes);
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
