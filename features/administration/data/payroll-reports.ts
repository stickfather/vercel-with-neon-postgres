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

/**
 * Resolves a month parameter (YYYY-MM) into date boundaries for queries and day enumeration.
 * Returns dates adjusted for the application timezone to prevent month boundary leakage.
 */
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

  // Create Date objects that represent the local timezone dates, not UTC
  // This ensures enumerateDays generates the correct month days without spillover
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

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toTimeZoneDayString(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const parts = dayFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  if (!year || !month || !day) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

function resolveWorkDateValue(value: unknown): string | null {
  const normalized = normalizeDateLike(value);
  
  // If we already have a clean date string (YYYY-MM-DD format), return it directly
  // without timezone conversion, as DATE types from PostgreSQL are timezone-agnostic
  if (typeof value === "string" && value.trim().length) {
    const trimmed = value.trim();
    const dateOnlyMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (dateOnlyMatch) {
      return dateOnlyMatch[1];
    }
  }
  
  // For timestamps or other date representations, apply timezone conversion
  let candidate: string | null = null;

  if (typeof value === "string" && value.trim().length) {
    candidate = value.trim();
  } else if (value instanceof Date) {
    candidate = value.toISOString();
  } else if (normalized) {
    candidate = normalized;
  }

  const zoned = candidate ? toTimeZoneDayString(candidate) : null;
  return zoned ?? normalized;
}

async function invalidateStaffDayApproval(
  sql: SqlClient,
  staffId: number,
  workDate: string,
): Promise<void> {
  await sql`
    UPDATE payroll_day_approvals
    SET
      approved = FALSE,
      approved_by = NULL,
      approved_minutes = NULL
    WHERE staff_id = ${staffId}::bigint
      AND work_date = ${workDate}::date
  `;
}

let payrollAuditReady = false;

async function ensurePayrollAuditTable(sql: SqlClient): Promise<void> {
  if (payrollAuditReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS payroll_audit_events (
      id bigserial PRIMARY KEY,
      action text NOT NULL,
      staff_id bigint NOT NULL,
      work_date date NOT NULL,
      session_id bigint NULL,
      details jsonb NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  payrollAuditReady = true;
}

type PayrollAuditAction =
  | "approve_day"
  | "update_session"
  | "create_session"
  | "delete_session";

async function logPayrollAuditEvent({
  action,
  staffId,
  workDate,
  sessionId,
  details,
  sql = getSqlClient(),
}: {
  action: PayrollAuditAction;
  staffId: number;
  workDate: string;
  sessionId?: number | null;
  details?: Record<string, unknown> | null;
  sql?: SqlClient;
}): Promise<void> {
  await ensurePayrollAuditTable(sql);

  await sql`
    INSERT INTO payroll_audit_events (
      action,
      staff_id,
      work_date,
      session_id,
      details
    )
    VALUES (
      ${action},
      ${staffId}::bigint,
      ${workDate}::date,
      ${sessionId ?? null}::bigint,
      ${details ? JSON.stringify(details) : null}::jsonb
    )
  `;
}

/**
 * Generates an array of ISO date strings (YYYY-MM-DD) for each day in the range [from, to] inclusive.
 * Works with date strings directly to avoid timezone conversion issues.
 * This prevents leakage of adjacent month days when UTC vs local timezone boundaries differ.
 */
function enumerateDaysFromStrings(fromStr: string, toStr: string): string[] {
  const days: string[] = [];
  
  // Parse the from date
  const fromMatch = fromStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const toMatch = toStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  
  if (!fromMatch || !toMatch) {
    throw new Error("Invalid date format for enumerateDays");
  }
  
  let year = Number(fromMatch[1]);
  let month = Number(fromMatch[2]);
  let day = Number(fromMatch[3]);
  
  const toYear = Number(toMatch[1]);
  const toMonth = Number(toMatch[2]);
  const toDay = Number(toMatch[3]);
  
  // Iterate day by day
  while (true) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    days.push(dateStr);
    
    // Check if we've reached the end date
    if (year === toYear && month === toMonth && day === toDay) {
      break;
    }
    
    // Increment day
    day++;
    
    // Get days in current month
    const daysInMonth = new Date(year, month, 0).getDate();
    
    if (day > daysInMonth) {
      day = 1;
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    
    // Safety check to prevent infinite loop
    if (days.length > 366) {
      throw new Error("enumerateDays exceeded maximum iteration count");
    }
  }
  
  return days;
}

/**
 * Legacy function maintained for compatibility.
 * Converts Date objects to strings and delegates to enumerateDaysFromStrings.
 */
function enumerateDays(from: Date, to: Date): string[] {
  const fromStr = toIsoDateString(from);
  const toStr = toIsoDateString(to);
  return enumerateDaysFromStrings(fromStr, toStr);
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
    WITH session_totals AS (
      SELECT
        s.staff_id,
        s.work_date,
        SUM(COALESCE(s.minutes, 0))::integer AS total_minutes
      FROM public.staff_day_sessions_v s
      WHERE s.work_date >= ${monthStart}::date
        AND s.work_date < ${monthEndExclusive}::date
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
      WHERE a.work_date >= ${monthStart}::date
        AND a.work_date < ${monthEndExclusive}::date
    )
    SELECT
      COALESCE(st.staff_id, ap.staff_id) AS staff_id,
      sm.full_name AS staff_name,
      COALESCE(st.work_date, ap.work_date) AS work_date,
      COALESCE(st.total_minutes, 0) AS total_minutes,
      ap.approved AS approved,
      ap.approved_minutes AS approved_minutes
    FROM session_totals st
    FULL OUTER JOIN approvals ap
      ON ap.staff_id = st.staff_id AND ap.work_date = st.work_date
    LEFT JOIN staff_members sm ON sm.id = COALESCE(st.staff_id, ap.staff_id)
    WHERE COALESCE(st.staff_id, ap.staff_id) IS NOT NULL
      AND COALESCE(st.work_date, ap.work_date) >= ${monthStart}::date
      AND COALESCE(st.work_date, ap.work_date) < ${monthEndExclusive}::date
    ORDER BY staff_id, work_date
  `);

  // Generate days list using date strings to avoid timezone conversion issues
  // Extract year and month to compute the last day of the month
  const [yearStr, monthStr] = monthStart.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
  const monthEnd = `${yearStr}-${monthStr}-${String(lastDayOfMonth).padStart(2, "0")}`;
  const days = enumerateDaysFromStrings(monthStart, monthEnd);

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
    const workDate = resolveWorkDateValue(
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

    const totalMinutesRaw = toInteger(
      readRowValue(row, ["total_minutes", "minutes", "total_work_minutes"]),
    );
    const totalMinutes =
      totalMinutesRaw != null ? Math.max(0, totalMinutesRaw) : 0;
    const approved = toBoolean(readRowValue(row, ["approved", "is_approved"]));
    const approvedMinutesRaw = toInteger(
      readRowValue(row, ["approved_minutes", "approved_total_minutes"]),
    );
    const approvedMinutes =
      approvedMinutesRaw != null ? Math.max(0, approvedMinutesRaw) : null;
    const minutesForDisplay = approved
      ? approvedMinutes ?? totalMinutes
      : totalMinutes;
    const hoursForDisplay = Number(
      ((minutesForDisplay ?? totalMinutes) / 60).toFixed(2),
    );

    grouped.get(staffId)!.cells.set(workDate, {
      date: workDate,
      hours: hoursForDisplay,
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

/**
 * Fetches all sessions for a specific staff member on a specific work date.
 * The work_date parameter should be in local timezone (YYYY-MM-DD format).
 * The staff_day_sessions_v view is expected to have work_date computed in the local timezone.
 * If the view provides *_local timestamp columns, they will be used; otherwise timestamps
 * will be converted to local timezone.
 */
export async function fetchDaySessions({
  staffId,
  workDate,
}: {
  staffId: number;
  workDate: string;
}): Promise<DaySession[]> {
  const sql = getSqlClient();

  const columns = await fetchTableColumns(sql, "public", "staff_day_sessions_v");

  const staffColumn =
    findColumn(columns, ["staff_id", "staffid", "staff"]) ?? "staff_id";
  const workDateColumn =
    findColumn(columns, ["work_date", "workday", "date"]) ?? "work_date";
  const checkinColumn = findColumn(columns, [
    "checkin_local",
    "checkin_time",
    "checkin",
    "start_time",
  ]);
  const checkoutColumn = findColumn(columns, [
    "checkout_local",
    "checkout_time",
    "checkout",
    "end_time",
  ]);
  const sessionColumn = findColumn(columns, [
    "session_id",
    "attendance_id",
    "id",
  ]);

  const selectSegments = ["s.*"];

  if (checkinColumn && !checkinColumn.toLowerCase().includes("local")) {
    selectSegments.push(
      `timezone('${TIMEZONE}', s.${quoteIdentifier(checkinColumn)}) AS checkin_local`,
    );
  }
  if (checkoutColumn && !checkoutColumn.toLowerCase().includes("local")) {
    selectSegments.push(
      `timezone('${TIMEZONE}', s.${quoteIdentifier(checkoutColumn)}) AS checkout_local`,
    );
  }

  const orderColumns = [workDateColumn, checkinColumn, sessionColumn]
    .filter((value, index, array): value is string =>
      Boolean(value) && array.indexOf(value) === index,
    )
    .map((column) => `s.${quoteIdentifier(column)}`);

  // Build the WHERE clause to filter by work_date
  // We try to use the work_date column directly, but if the view computes it in UTC,
  // we may need to also check via timezone-converted checkin_time
  // The safest approach is to check if work_date matches OR if the checkin falls on that local date
  const checkinDateCheck = checkinColumn
    ? `OR DATE(timezone('${TIMEZONE}', s.${quoteIdentifier(checkinColumn)})) = $2::date`
    : "";

  const query = `
    SELECT ${selectSegments.join(", ")}
    FROM public.staff_day_sessions_v s
    WHERE s.${quoteIdentifier(staffColumn)} = $1::bigint
      AND (s.${quoteIdentifier(workDateColumn)} = $2::date ${checkinDateCheck})
    ${orderColumns.length ? `ORDER BY ${orderColumns.join(", ")}` : ""}
  `;

  const client = sql as unknown as {
    unsafe: (query: string, params?: unknown[]) => Promise<unknown>;
  };

  const rows = normalizeRows<SqlRow>(await client.unsafe(query, [staffId, workDate]));

  return rows.map((row) => {
    // Use readRowValue for flexible column name matching to support various database schemas
    // This handles case-insensitive matching and column name variations
    const sessionId = Number(
      readRowValue(row, ["session_id", "attendance_id", "id"]) ?? NaN,
    );
    const checkinTime = coerceString(
      readRowValue(row, ["checkin_local", "checkin_time", "checkin", "start_time"]),
    );
    const checkoutTime = coerceString(
      readRowValue(row, ["checkout_local", "checkout_time", "checkout", "end_time"]),
    );

    const minutesValue =
      toInteger(readRowValue(row, ["minutes", "total_minutes", "duration_minutes"])) ?? null;

    let hoursValue = minutesValue != null ? minutesToHours(minutesValue) : 0;

    if (!Number.isFinite(hoursValue)) {
      hoursValue = 0;
    }

    if ((!minutesValue || hoursValue === 0) && checkinTime && checkoutTime) {
      try {
        const minutes = computeDurationMinutes(checkinTime, checkoutTime);
        hoursValue = minutesToHours(minutes);
      } catch (error) {
        console.warn("No se pudo calcular la duración de la sesión", error);
        hoursValue = 0;
      }
    }

    return {
      sessionId: Number.isFinite(sessionId) ? sessionId : null,
      staffId: Number(readRowValue(row, ["staff_id", "staffid", "staff"]) ?? staffId),
      workDate,
      checkinTime,
      checkoutTime,
      hours: Number(hoursValue.toFixed(2)),
    };
  });
}

function ensureWorkDate(value: string): string {
  const normalized = normalizeDateLike(value);
  if (!normalized) {
    throw new Error("Debes indicar un día válido.");
  }
  return normalized;
}

function ensureIsoTime(value: string | null, label: string): string {
  const iso = ensureIsoString(value);
  if (!iso) {
    throw new Error(`La hora de ${label} no es válida.`);
  }
  return iso;
}

function computeDurationMinutes(checkinIso: string, checkoutIso: string): number {
  const start = new Date(checkinIso).getTime();
  const end = new Date(checkoutIso).getTime();
  const delta = end - start;
  if (!Number.isFinite(delta) || delta <= 0) {
    throw new Error("La sesión debe tener una duración positiva.");
  }
  return Math.round(delta / 60000);
}

async function assertNoOverlap(
  sql: SqlClient,
  {
    staffId,
    workDate,
    checkinIso,
    checkoutIso,
    ignoreSessionId,
  }: {
    staffId: number;
    workDate: string;
    checkinIso: string;
    checkoutIso: string;
    ignoreSessionId?: number | null;
  },
): Promise<void> {
  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, checkin_time, checkout_time
    FROM staff_attendance
    WHERE staff_id = ${staffId}::bigint
      AND date(timezone(${TIMEZONE}, checkin_time)) = ${workDate}::date
      AND id <> ${ignoreSessionId ?? 0}::bigint
      AND ${checkoutIso}::timestamptz > checkin_time
      AND ${checkinIso}::timestamptz < COALESCE(checkout_time, ${checkoutIso}::timestamptz)
  `);

  if (rows.length) {
    throw new Error("Los horarios se superponen con otra sesión registrada.");
  }
}

function ensureSessionMatchesDay(
  checkinIso: string,
  checkoutIso: string,
  workDate: string,
): void {
  const checkinDay = toTimeZoneDayString(checkinIso);
  const checkoutDay = toTimeZoneDayString(checkoutIso);
  if (checkinDay !== workDate || checkoutDay !== workDate) {
    throw new Error("La sesión debe pertenecer al día seleccionado.");
  }
}

function minutesToHours(minutes: number): number {
  const hours = toHoursFromMinutes(minutes);
  if (hours == null) {
    throw new Error("No se pudieron calcular las horas de la sesión.");
  }
  return hours;
}

export async function updateStaffDaySession({
  sessionId,
  staffId,
  workDate,
  checkinTime,
  checkoutTime,
}: {
  sessionId: number;
  staffId: number;
  workDate: string;
  checkinTime: string | null;
  checkoutTime: string | null;
}): Promise<DaySession> {
  const sql = getSqlClient();

  const normalizedWorkDate = ensureWorkDate(workDate);
  const checkinIso = ensureIsoTime(checkinTime, "entrada");
  const checkoutIso = ensureIsoTime(checkoutTime, "salida");
  ensureSessionMatchesDay(checkinIso, checkoutIso, normalizedWorkDate);
  const minutes = computeDurationMinutes(checkinIso, checkoutIso);

  const existingRows = normalizeRows<SqlRow>(await sql`
    SELECT checkin_time, checkout_time
    FROM staff_attendance
    WHERE id = ${sessionId}::bigint
      AND staff_id = ${staffId}::bigint
    LIMIT 1
  `);

  if (!existingRows.length) {
    throw new Error("No encontramos la sesión indicada.");
  }

  await assertNoOverlap(sql, {
    staffId,
    workDate: normalizedWorkDate,
    checkinIso,
    checkoutIso,
    ignoreSessionId: sessionId,
  });

  await sql`
    UPDATE staff_attendance
    SET checkin_time = ${checkinIso}::timestamptz,
        checkout_time = ${checkoutIso}::timestamptz
    WHERE id = ${sessionId}::bigint
      AND staff_id = ${staffId}::bigint
  `;

  await invalidateStaffDayApproval(sql, staffId, normalizedWorkDate);
  await logPayrollAuditEvent({
    action: "update_session",
    staffId,
    workDate: normalizedWorkDate,
    sessionId,
    details: {
      before: {
        checkinTime: existingRows[0].checkin_time,
        checkoutTime: existingRows[0].checkout_time,
      },
      after: {
        checkinTime: checkinIso,
        checkoutTime: checkoutIso,
      },
      approvalRevoked: true,
    },
    sql,
  });

  return {
    sessionId,
    staffId,
    workDate: normalizedWorkDate,
    checkinTime: checkinIso,
    checkoutTime: checkoutIso,
    hours: minutesToHours(minutes),
  };
}

export async function createStaffDaySession({
  staffId,
  workDate,
  checkinTime,
  checkoutTime,
}: {
  staffId: number;
  workDate: string;
  checkinTime: string | null;
  checkoutTime: string | null;
}): Promise<DaySession> {
  const sql = getSqlClient();

  const normalizedWorkDate = ensureWorkDate(workDate);
  const checkinIso = ensureIsoTime(checkinTime, "entrada");
  const checkoutIso = ensureIsoTime(checkoutTime, "salida");
  ensureSessionMatchesDay(checkinIso, checkoutIso, normalizedWorkDate);
  const minutes = computeDurationMinutes(checkinIso, checkoutIso);

  await assertNoOverlap(sql, {
    staffId,
    workDate: normalizedWorkDate,
    checkinIso,
    checkoutIso,
  });

  const [nextId] = await allocateStaffAttendanceIds(sql, 1);
  const sessionId = nextId;

  await sql`
    INSERT INTO staff_attendance (id, staff_id, checkin_time, checkout_time)
    VALUES (
      ${sessionId}::bigint,
      ${staffId}::bigint,
      ${checkinIso}::timestamptz,
      ${checkoutIso}::timestamptz
    )
  `;

  await invalidateStaffDayApproval(sql, staffId, normalizedWorkDate);
  await logPayrollAuditEvent({
    action: "create_session",
    staffId,
    workDate: normalizedWorkDate,
    sessionId,
    details: {
      checkinTime: checkinIso,
      checkoutTime: checkoutIso,
      approvalRevoked: true,
    },
    sql,
  });

  return {
    sessionId,
    staffId,
    workDate: normalizedWorkDate,
    checkinTime: checkinIso,
    checkoutTime: checkoutIso,
    hours: minutesToHours(minutes),
  };
}

export async function deleteStaffDaySession({
  sessionId,
  staffId,
  workDate,
}: {
  sessionId: number;
  staffId: number;
  workDate: string;
}): Promise<void> {
  const sql = getSqlClient();
  const normalizedWorkDate = ensureWorkDate(workDate);

  const existingRows = normalizeRows<SqlRow>(await sql`
    SELECT checkin_time, checkout_time
    FROM staff_attendance
    WHERE id = ${sessionId}::bigint
      AND staff_id = ${staffId}::bigint
    LIMIT 1
  `);

  if (!existingRows.length) {
    throw new Error("No encontramos la sesión indicada.");
  }

  await sql`
    DELETE FROM staff_attendance
    WHERE id = ${sessionId}::bigint
      AND staff_id = ${staffId}::bigint
  `;

  await invalidateStaffDayApproval(sql, staffId, normalizedWorkDate);
  await logPayrollAuditEvent({
    action: "delete_session",
    staffId,
    workDate: normalizedWorkDate,
    sessionId,
    details: {
      removed: {
        checkinTime: existingRows[0].checkin_time,
        checkoutTime: existingRows[0].checkout_time,
      },
      approvalRevoked: true,
    },
    sql,
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
  const normalizedWorkDate = ensureWorkDate(workDate);
  await applyStaffDayApproval(sql, staffId, normalizedWorkDate, null);
  await logPayrollAuditEvent({
    action: "approve_day",
    staffId,
    workDate: normalizedWorkDate,
    details: { approved: true },
    sql,
  });
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
        SUM(COALESCE(s.minutes, 0))::integer AS total_minutes
      FROM public.staff_day_sessions_v s
      WHERE s.staff_id = ${staffId}::bigint
        AND s.work_date = ${workDate}::date
    `);

    const metrics = recalculatedRows[0] ?? {};
    const recalculatedMinutes =
      toInteger(metrics.total_minutes ?? metrics.minutes ?? null) ?? 0;

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
