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

function resolveMonthWindow(monthParam: string): {
  monthKey: string;
  monthStartDate: Date;
  monthEndInclusiveDate: Date;
  monthStart: string;
  monthEndExclusive: string;
} {
  const raw = monthParam.trim();
  const match = raw.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);

  if (!match) {
    throw new Error("Debes indicar el mes en formato 'YYYY-MM'.");
  }

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);

  if (!Number.isFinite(year) || !Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    throw new Error("Debes indicar el mes en formato 'YYYY-MM'.");
  }

  const paddedMonth = String(monthNumber).padStart(2, "0");
  const monthKey = `${year}-${paddedMonth}`;
  const monthStartString = `${monthKey}-01`;

  const nextMonthNumber = monthNumber === 12 ? 1 : monthNumber + 1;
  const nextMonthYear = monthNumber === 12 ? year + 1 : year;
  const monthEndExclusiveString = `${nextMonthYear}-${String(nextMonthNumber).padStart(2, "0")}-01`;

  const monthStartDate = new Date(`${monthStartString}T00:00:00Z`);
  const monthEndExclusiveDate = new Date(`${monthEndExclusiveString}T00:00:00Z`);
  const monthEndInclusiveDate = new Date(monthEndExclusiveDate.getTime() - 24 * 60 * 60 * 1000);

  if (
    Number.isNaN(monthStartDate.getTime()) ||
    Number.isNaN(monthEndExclusiveDate.getTime()) ||
    Number.isNaN(monthEndInclusiveDate.getTime())
  ) {
    throw new Error("Debes indicar el mes en formato 'YYYY-MM'.");
  }

  return {
    monthKey,
    monthStartDate,
    monthEndInclusiveDate,
    monthStart: monthStartString,
    monthEndExclusive: monthEndExclusiveString,
  };
}

function toIsoDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeDateLike(value: unknown): string | null {
  if (!value && value !== 0) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : toIsoDateString(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return null;
    }

    const directMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (directMatch) {
      return directMatch[1];
    }

    const dmyMatch = trimmed.match(/^(\d{1,2})([\/.\-])(\d{1,2})\2(\d{4})(?:\s+.*)?$/);
    if (dmyMatch) {
      const day = Number(dmyMatch[1]);
      const month = Number(dmyMatch[3]);
      const year = Number(dmyMatch[4]);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 0) {
        const isoMonth = String(month).padStart(2, "0");
        const isoDay = String(day).padStart(2, "0");
        const isoCandidate = `${year}-${isoMonth}-${isoDay}`;
        const parsedCandidate = new Date(`${isoCandidate}T00:00:00Z`);
        if (
          !Number.isNaN(parsedCandidate.getTime()) &&
          parsedCandidate.getUTCFullYear() === year &&
          parsedCandidate.getUTCMonth() + 1 === month &&
          parsedCandidate.getUTCDate() === day
        ) {
          return isoCandidate;
        }
      }
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return toIsoDateString(parsed);
    }

    return null;
  }

  return null;
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

function toOptionalNumber(value: unknown, fractionDigits = 2): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value.toFixed(fractionDigits));
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Number(parsed.toFixed(fractionDigits));
    }
  }
  return null;
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

function toHoursFromMinutes(value: unknown, fractionDigits = 2): number | null {
  const minutes = toInteger(value);
  if (minutes == null) return null;
  return Number((minutes / 60).toFixed(fractionDigits));
}

function findColumn(columns: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    const candidateLower = candidate.toLowerCase();
    for (const column of columns) {
      if (column === candidate) return column;
      if (column.toLowerCase() === candidateLower) return column;
    }
  }
  return null;
}

function readRowValue(row: SqlRow, candidates: string[]): unknown {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    if (candidate in row) {
      return row[candidate as keyof typeof row];
    }
    const lowerCandidate = candidate.toLowerCase();
    for (const [key, value] of entries) {
      if (key.toLowerCase() === lowerCandidate) {
        return value;
      }
    }
  }
  return undefined;
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

async function applyStaffDayApproval(
  sql: SqlClient,
  staffId: number,
  workDate: string,
  approvedMinutes: number | null,
): Promise<void> {
  const roundedMinutes =
    approvedMinutes != null && Number.isFinite(approvedMinutes)
      ? Math.max(0, Math.round(approvedMinutes))
      : null;

  await sql`
    INSERT INTO payroll_day_approvals (
      staff_id,
      work_date,
      approved,
      approved_by,
      approved_at,
      approved_minutes
    )
    VALUES (
      ${staffId}::bigint,
      ${workDate}::date,
      TRUE,
      ${null}::varchar,
      NOW(),
      ${roundedMinutes}::integer
    )
    ON CONFLICT (staff_id, work_date) DO UPDATE
    SET
      approved = EXCLUDED.approved,
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at,
      approved_minutes = EXCLUDED.approved_minutes
  `;
}

type PayrollMonthStatusTableInfo = {
  schema: string;
  name: string;
  staffIdColumn: string;
  monthColumn: string;
  paidColumn: string;
  paidAtColumn: string | null;
};

let payrollMonthStatusTableCache: PayrollMonthStatusTableInfo | null = null;

async function resolvePayrollMonthStatusTable(
  sql: SqlClient,
): Promise<PayrollMonthStatusTableInfo> {
  if (payrollMonthStatusTableCache) return payrollMonthStatusTableCache;

  const usageRows = normalizeRows<SqlRow>(await sql`
    SELECT table_schema, table_name
    FROM information_schema.view_table_usage
    WHERE view_schema = 'public'
      AND view_name = 'payroll_month_status_v'
  `);

  for (const row of usageRows) {
    const schema = coerceString(row.table_schema) ?? "public";
    const tableName = coerceString(row.table_name);
    if (!tableName) continue;

    const columns = await fetchTableColumns(sql, schema, tableName);
    const staffIdColumn = findColumn(columns, ["staff_id"]);
    const monthColumn = findColumn(columns, ["month", "period"]);
    const paidColumn = findColumn(columns, ["paid", "is_paid"]);
    const paidAtColumn = findColumn(columns, ["paid_at", "payment_date"]);

    if (staffIdColumn && monthColumn && paidColumn) {
      payrollMonthStatusTableCache = {
        schema,
        name: tableName,
        staffIdColumn,
        monthColumn,
        paidColumn,
        paidAtColumn: paidAtColumn ?? null,
      };
      return payrollMonthStatusTableCache;
    }
  }

  throw new Error(
    "No se pudo identificar la tabla base para actualizar el estado mensual de nómina.",
  );
}

function normalizeMonthInput(month: string): string {
  const normalized = normalizeDateLike(month);
  if (normalized) return normalized;

  const trimmed = month.trim();
  const match = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (match) {
    const year = Number(match[1]);
    const monthNumber = Number(match[2]);
    if (Number.isFinite(year) && Number.isFinite(monthNumber) && monthNumber >= 1 && monthNumber <= 12) {
      return `${year}-${String(monthNumber).padStart(2, "0")}-01`;
    }
  }

  throw new Error("El mes indicado no es válido.");
}

function toIsoStartOfDay(dateString: string | null): string | null {
  if (!dateString) return null;
  const normalized = normalizeDateLike(dateString);
  if (!normalized) return null;
  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export async function updatePayrollMonthStatus({
  staffId,
  month,
  paid,
  paidAt,
}: {
  staffId: number;
  month: string;
  paid: boolean;
  paidAt: string | null;
}): Promise<void> {
  const sql = getSqlClient();
  const table = await resolvePayrollMonthStatusTable(sql);

  const normalizedMonth = normalizeMonthInput(month);
  const paidAtIso = paid ? toIsoStartOfDay(paidAt) : null;

  const tableRef = `${quoteIdentifier(table.schema)}.${quoteIdentifier(table.name)}`;
  const alias = "p";

  const updates: string[] = [`${quoteIdentifier(table.paidColumn)} = $3::boolean`];
  const params: Array<number | string | boolean | null> = [staffId, normalizedMonth, paid];

  if (table.paidAtColumn) {
    updates.push(`${quoteIdentifier(table.paidAtColumn)} = $4::timestamptz`);
    params.push(paidAtIso);
  }

  const query = `
    UPDATE ${tableRef} AS ${alias}
    SET ${updates.join(", ")}
    WHERE ${alias}.${quoteIdentifier(table.staffIdColumn)} = $1::bigint
      AND ${alias}.${quoteIdentifier(table.monthColumn)} = $2::date
  `;

  const client = sql as unknown as {
    unsafe: (query: string, params?: unknown[]) => Promise<{ rowCount?: number }>;
  };

  const result = await client.unsafe(query, params);

  if (!result || ("rowCount" in result && (result as { rowCount?: number }).rowCount === 0)) {
    throw new Error("No se pudo actualizar el estado mensual de nómina.");
  }
}

export async function fetchPayrollMatrix({
  month,
}: {
  month: string;
}): Promise<PayrollMatrixResponse> {
  const sql = getSqlClient();

  const {
    monthKey,
    monthStartDate,
    monthEndInclusiveDate,
    monthStart,
    monthEndExclusive,
  } = resolveMonthWindow(month);

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.staff_day_matrix_v
    WHERE work_date >= ${monthStart}::date
      AND work_date < ${monthEndExclusive}::date
    ORDER BY staff_id, work_date
  `);

  const days = enumerateDays(monthStartDate, monthEndInclusiveDate);

  const grouped = new Map<
    number,
    {
      staffId: number;
      staffName?: string;
      cells: Map<string, MatrixCell>;
    }
  >();

  for (const row of rows) {
    const staffId = Number(
      readRowValue(row, ["staff_id", "staffid", "staff"]),
    );
    if (!Number.isFinite(staffId)) continue;
    const workDate = normalizeDateLike(
      readRowValue(row, ["work_date", "workday", "date"]),
    );
    if (!workDate || workDate.slice(0, 7) !== monthKey) continue;

    if (!grouped.has(staffId)) {
      grouped.set(staffId, {
        staffId,
        staffName:
          coerceString(
            readRowValue(row, [
              "staff_name",
              "staff_full_name",
              "full_name",
              "name",
            ]),
          ) ?? undefined,
        cells: new Map(),
      });
    }

    const totalHoursDirect = toOptionalNumber(
      readRowValue(row, ["total_hours", "hours"]),
      2,
    );
    const totalMinutes = toInteger(
      readRowValue(row, ["total_minutes", "minutes", "total_work_minutes"]),
    );
    const totalHours =
      totalHoursDirect ?? toHoursFromMinutes(totalMinutes) ?? 0;
    const approved = toBoolean(readRowValue(row, ["approved", "is_approved"]));
    const approvedHoursDirect = toOptionalNumber(
      readRowValue(row, [
        "approved_hours",
        "hours_approved",
        "approved_total_hours",
      ]),
      2,
    );
    const approvedMinutes = toInteger(
      readRowValue(row, ["approved_minutes", "approved_total_minutes"]),
    );
    const approvedHours = approvedHoursDirect
      ?? (approvedMinutes != null
        ? Number((Math.max(0, approvedMinutes) / 60).toFixed(2))
        : totalHours);

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

async function allocateStaffAttendanceIds(
  sql: SqlClient,
  count: number,
): Promise<number[]> {
  if (count <= 0) return [];

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT COALESCE(MAX(id), 0) + 1 AS next_id
    FROM staff_attendance
  `);

  let nextId = Number(rows[0]?.next_id ?? 1);
  if (!Number.isFinite(nextId) || nextId <= 0) {
    nextId = 1;
  }

  const identifiers: number[] = [];
  for (let index = 0; index < count; index += 1) {
    identifiers.push(nextId + index);
  }

  return identifiers;
}

export async function overrideSessionsAndApprove({
  staffId,
  workDate,
  overrides = [],
  additions = [],
  deletions = [],
}: {
  staffId: number;
  workDate: string;
  overrides?: {
    sessionId: number;
    checkinTime: string;
    checkoutTime: string;
  }[];
  additions?: {
    checkinTime: string;
    checkoutTime: string;
  }[];
  deletions?: number[];
}): Promise<void> {
  const sql = getSqlClient();

  await sql`BEGIN`;
  try {
    const sanitizedDeletions = deletions.filter((value) =>
      Number.isFinite(value),
    );
    for (const sessionId of sanitizedDeletions) {
      await sql`
        DELETE FROM staff_attendance
        WHERE id = ${Number(sessionId)}::bigint
          AND staff_id = ${staffId}::bigint
      `;
    }

    for (const override of overrides) {
      const checkinIso = ensureIsoString(override.checkinTime);
      const checkoutIso = ensureIsoString(override.checkoutTime);
      if (!checkinIso || !checkoutIso) {
        throw new Error("Las horas de entrada y salida deben ser válidas.");
      }
      if (new Date(checkoutIso).getTime() <= new Date(checkinIso).getTime()) {
        throw new Error(
          "La hora de salida debe ser posterior a la hora de entrada.",
        );
      }

      await sql`
        UPDATE staff_attendance
        SET checkin_time = ${checkinIso}::timestamptz,
            checkout_time = ${checkoutIso}::timestamptz
        WHERE id = ${override.sessionId}::bigint
          AND staff_id = ${staffId}::bigint
      `;
    }

    const sanitizedAdditions = additions.map((entry) => ({
      checkinTime: ensureIsoString(entry.checkinTime),
      checkoutTime: ensureIsoString(entry.checkoutTime),
    }));

    const validAdditions = sanitizedAdditions.filter(
      (entry): entry is { checkinTime: string; checkoutTime: string } =>
        Boolean(entry.checkinTime) && Boolean(entry.checkoutTime),
    );

    if (validAdditions.length !== sanitizedAdditions.length) {
      throw new Error("Las nuevas sesiones deben tener horas válidas.");
    }

    if (validAdditions.length) {
      const identifiers = await allocateStaffAttendanceIds(sql, validAdditions.length);

      for (const [index, addition] of validAdditions.entries()) {
        if (
          new Date(addition.checkoutTime).getTime()
          <= new Date(addition.checkinTime).getTime()
        ) {
          throw new Error(
            "La hora de salida debe ser posterior a la hora de entrada.",
          );
        }
        await sql`
          INSERT INTO staff_attendance (id, staff_id, checkin_time, checkout_time)
          VALUES (
            ${identifiers[index]}::bigint,
            ${staffId}::bigint,
            ${addition.checkinTime}::timestamptz,
            ${addition.checkoutTime}::timestamptz
          )
        `;
      }
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
  const { monthKey, monthStart, monthEndExclusive } = resolveMonthWindow(month);

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      v.staff_id AS staff_id,
      v.month AS month,
      v.approved_days AS approved_days,
      v.approved_hours AS approved_hours,
      v.amount_paid AS amount_paid,
      v.paid AS paid,
      v.last_approved_at AT TIME ZONE ${TIMEZONE} AS last_approved_at,
      v.reference AS reference,
      v.paid_by AS paid_by,
      v.paid_at AT TIME ZONE ${TIMEZONE} AS paid_at
    FROM public.payroll_month_status_v v
    WHERE v.month >= ${monthStart}::date
      AND v.month < ${monthEndExclusive}::date
      AND (${staffId ?? null}::bigint IS NULL OR v.staff_id = ${staffId ?? null}::bigint)
    ORDER BY v.staff_id
  `);

  return rows.map((row) => ({
    staffId: Number(row.staff_id),
    month: coerceString(row.month) ?? monthKey,
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
