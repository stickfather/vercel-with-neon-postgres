import { unstable_noStore as noStore } from "next/cache.js";

import {
  getSqlClient,
  normalizeRows,
  SqlRow,
  TIMEZONE,
} from "@/lib/db/client";
import {
  normalizePayrollTimestamp,
  PAYROLL_TIMEZONE_OFFSET,
  toPayrollLocalTimestampText,
  toPayrollZonedISOString,
} from "@/lib/payroll/timezone";
import {
  DaySessionsQuerySchema as ReportsDaySessionsSchema,
  DayTotalsQuerySchema as ReportsDayTotalsSchema,
  executeAddStaffSessionSql,
  executeDeleteStaffSessionSql,
  getDaySessions as getPayrollDaySessions,
  getDayTotals as getPayrollDayTotals,
  parseWithSchema as parsePayrollSchema,
} from "@/lib/payroll/reports-service";
import type {
  DaySession as ReportsDaySession,
  DayTotals as ReportsDayTotals,
  PayrollDayStatus,
} from "@/types/payroll";

type SqlClient = ReturnType<typeof getSqlClient>;

export type MatrixCell = {
  date: string;
  hours: number;
  approved: boolean;
  approvedHours: number | null;
  hasEdits?: boolean;
  editedAfterApproval?: boolean;
  status?: PayrollDayStatus;
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
  minutes: number;
  hours: number;
  originalCheckinTime?: string | null;
  originalCheckoutTime?: string | null;
  originalSessionId?: number | null;
  replacementSessionId?: number | null;
  isOriginalRecord?: boolean;
  editedCheckinTime?: string | null;
  editedCheckoutTime?: string | null;
  editedByStaffId?: number | null;
  editNote?: string | null;
  wasEdited?: boolean;
};

export type DayTotals = {
  totalMinutes: number;
  totalHours: number;
};

export type PayrollMonthStatusRow = {
  staffId: number;
  staffName: string | null;
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

export function toTimeZoneDayString(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }
  const normalized = trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed;
  const directMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (directMatch) {
    return `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`;
  }
  const date = new Date(normalized);
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
    candidate = toPayrollZonedISOString(value);
  } else if (normalized) {
    candidate = normalized;
  }

  const zoned = candidate ? toTimeZoneDayString(candidate) : null;
  return zoned ?? normalized;
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

function resolveDayStatus(
  approved: boolean,
  hasEdits: boolean,
  editedAfterApproval: boolean,
): PayrollDayStatus {
  if (!approved && !hasEdits) {
    return "pending";
  }
  if (!approved && hasEdits) {
    return "edited_not_approved";
  }
  if (approved && editedAfterApproval) {
    return "edited_and_approved";
  }
  if (approved) {
    return "approved";
  }
  return "pending";
}

function coerceString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (value instanceof Date) {
    return toPayrollZonedISOString(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function normalizeTimestampValue(value: unknown): string | null {
  if (!(value instanceof Date) && typeof value !== "string") {
    return null;
  }
  const normalized = normalizePayrollTimestamp(value as string | Date);
  if (!normalized) {
    return null;
  }
  if (/(?:[+-]\d{2}:\d{2}|Z)$/i.test(normalized)) {
    return normalized;
  }
  return `${normalized}${PAYROLL_TIMEZONE_OFFSET}`;
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

function toHoursFromMinutes(value: unknown, fractionDigits = 2): number | null {
  const minutes = toInteger(value);
  if (minutes == null) return null;
  return Number((minutes / 60).toFixed(fractionDigits));
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

async function applyStaffDayApproval(
  sql: SqlClient,
  staffId: number,
  workDate: string,
  approvedMinutes: number | null,
  options?: { approvedBy?: string | null; preserveApprover?: boolean },
): Promise<void> {
  const roundedMinutes =
    approvedMinutes != null && Number.isFinite(approvedMinutes)
      ? Math.max(0, Math.round(approvedMinutes))
      : null;

  const normalizedApprovedBy = coerceString(options?.approvedBy);

  if (options?.preserveApprover) {
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
        ${normalizedApprovedBy}::varchar,
        NOW(),
        ${roundedMinutes}::integer
      )
      ON CONFLICT (staff_id, work_date) DO UPDATE
      SET
        approved = EXCLUDED.approved,
        approved_by = COALESCE(EXCLUDED.approved_by, payroll_day_approvals.approved_by),
        approved_at = EXCLUDED.approved_at,
        approved_minutes = EXCLUDED.approved_minutes
    `;
    return;
  }

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
      ${normalizedApprovedBy}::varchar,
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
  const zoned = normalizePayrollTimestamp(`${normalized}T00:00:00`);
  return zoned;
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
  const normalizedMonth = normalizeMonthInput(month);
  const paidAtIso = paid ? toIsoStartOfDay(paidAt) : null;

  await sql`
    INSERT INTO public.payroll_month_payments (
      staff_id,
      month,
      paid,
      paid_at
    )
    VALUES (
      ${staffId}::bigint,
      date_trunc('month', ${normalizedMonth}::date),
      ${paid}::boolean,
      ${paidAtIso}::timestamptz
    )
    ON CONFLICT (staff_id, month) DO UPDATE
    SET
      paid = EXCLUDED.paid,
      paid_at = EXCLUDED.paid_at
  `;
}

export async function fetchPayrollMatrix({
  month,
  start,
  end,
}: {
  month?: string | null;
  start?: string | null;
  end?: string | null;
}): Promise<PayrollMatrixResponse> {
  noStore();
  const sql = getSqlClient();

  const normalizedStart = normalizeDateLike(start ?? null);
  const normalizedEnd = normalizeDateLike(end ?? null);

  let rangeStart: string;
  let rangeEnd: string;

  if (normalizedStart && normalizedEnd) {
    if (normalizedStart > normalizedEnd) {
      throw new Error(
        "El rango de fechas es inválido: la fecha inicial debe ser anterior o igual a la final.",
      );
    }
    rangeStart = normalizedStart;
    rangeEnd = normalizedEnd;
  } else if (typeof month === "string" && month.trim().length) {
    const { monthEndInclusiveDate, monthStart } = resolveMonthWindow(month);
    rangeStart = monthStart;
    rangeEnd = toIsoDateString(monthEndInclusiveDate);
  } else {
    throw new Error(
      "Debes indicar un mes o un rango de fechas válido para cargar la matriz de nómina.",
    );
  }

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      m.staff_id,
      sm.full_name AS staff_name,
      m.work_date,
      m.horas_mostrar,
      m.approved,
      m.approved_hours,
      m.total_hours,
      m.has_edits,
      m.edited_after_approval
    FROM public.staff_day_matrix_local_v AS m
    LEFT JOIN public.staff_members AS sm ON sm.id = m.staff_id
    WHERE m.work_date BETWEEN ${rangeStart}::date AND ${rangeEnd}::date
    ORDER BY m.staff_id, m.work_date
  `);

  const days = enumerateDaysFromStrings(rangeStart, rangeEnd);

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
      readRowValue(row, [
        "work_date",
        "work_date_local",
        "local_work_date",
        "workday",
        "work_day",
        "date",
      ]),
    );
    if (!workDate) continue;

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

    const horasMostrar = toOptionalNumber(
      readRowValue(row, [
        "horas_mostrar",
        "hours_display",
        "hours",
        "horas",
      ]),
      2,
    );
    const approved = toBoolean(readRowValue(row, ["approved", "is_approved"]));
    const approvedHours = toOptionalNumber(
      readRowValue(row, ["approved_hours", "horas_aprobadas"]),
      2,
    );
    const totalHours = toOptionalNumber(
      readRowValue(row, ["total_hours", "horas_totales", "hours_total"]),
      2,
    );

    const safeApprovedHours =
      typeof approvedHours === "number" && Number.isFinite(approvedHours)
        ? Math.max(0, Number(approvedHours.toFixed(2)))
        : null;
    const baseHours = horasMostrar ?? totalHours ?? safeApprovedHours ?? 0;
    const safeHours =
      typeof baseHours === "number" && Number.isFinite(baseHours)
        ? Math.max(0, Number(baseHours.toFixed(2)))
        : 0;
    const hasEdits = toBoolean(readRowValue(row, ["has_edits", "hasEdits"]));
    const editedAfterApproval = toBoolean(
      readRowValue(row, ["edited_after_approval", "editedAfterApproval"]),
    );
    const dayStatus = resolveDayStatus(approved, hasEdits, editedAfterApproval);

    grouped.get(staffId)!.cells.set(workDate, {
      date: workDate,
      hours: safeHours,
      approved,
      approvedHours: safeApprovedHours,
      hasEdits,
      editedAfterApproval,
      status: dayStatus,
    });
  }

  const matrixRows: MatrixRow[] = [];

  for (const [, value] of grouped) {
    const cells: MatrixCell[] = days.map((day) => {
      const existing = value.cells.get(day);
      if (existing) return existing;
      return {
        date: day,
        hours: 0,
        approved: false,
        approvedHours: null,
        hasEdits: false,
        editedAfterApproval: false,
        status: "pending",
      };
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
 * The staff_day_sessions_local_v view already returns timestamps aligned to the local timezone,
 * but we keep flexible column resolution to remain compatible with future view adjustments.
 */
export async function fetchDaySessions({
  staffId,
  workDate,
}: {
  staffId: number;
  workDate: string;
}): Promise<DaySession[]> {
  noStore();
  const sql = getSqlClient();
  const params = parsePayrollSchema(ReportsDaySessionsSchema, {
    staffId,
    date: workDate,
  });
  // Session timing values (check-in/out) already arrive in local-time form because
  // lib/payroll/reports-service#getDaySessions pulls straight from
  // public.staff_day_sessions_with_edits_v (see scripts/payroll_sessions_with_edits.sql).
  // That view materializes the checkin_local/checkout_local fields by converting the
  // underlying timestamptz values from staff_attendance into the payroll timezone, so the
  // UI only needs to normalize formatting below.
  const sessions = await getPayrollDaySessions(params, sql);

  return sessions.map((session: ReportsDaySession) => ({
    sessionId: toInteger(session.sessionId ?? null),
    staffId: params.staffId,
    workDate: params.date,
    checkinTime:
      normalizeTimestampValue(session.checkinTimeLocal) ?? coerceString(session.checkinTimeLocal),
    checkoutTime:
      normalizeTimestampValue(session.checkoutTimeLocal) ?? coerceString(session.checkoutTimeLocal),
    minutes: session.minutes,
    hours: session.hours,
    originalCheckinTime:
      normalizeTimestampValue(session.originalCheckinLocal) ?? coerceString(session.originalCheckinLocal),
    originalCheckoutTime:
      normalizeTimestampValue(session.originalCheckoutLocal) ?? coerceString(session.originalCheckoutLocal),
    originalSessionId: toInteger(session.originalSessionId ?? null),
    replacementSessionId: toInteger(session.replacementSessionId ?? null),
    isOriginalRecord: Boolean(session.isOriginalRecord),
    editedCheckinTime:
      normalizeTimestampValue(session.editedCheckinLocal) ?? coerceString(session.editedCheckinLocal),
    editedCheckoutTime:
      normalizeTimestampValue(session.editedCheckoutLocal) ?? coerceString(session.editedCheckoutLocal),
    editedByStaffId: toInteger(session.editedByStaffId ?? null),
    editNote: coerceString(session.editNote),
    wasEdited: Boolean(session.wasEdited),
  }));
}

export async function fetchDayTotals({
  staffId,
  workDate,
}: {
  staffId: number;
  workDate: string;
}): Promise<DayTotals> {
  noStore();
  const sql = getSqlClient();
  const params = parsePayrollSchema(ReportsDayTotalsSchema, {
    staffId,
    date: workDate,
  });

  const totals: ReportsDayTotals = await getPayrollDayTotals(params, sql);

  return {
    totalMinutes: totals.totalMinutes,
    totalHours: totals.totalHours,
  };
}

function ensureWorkDate(value: string): string {
  const normalized = normalizeDateLike(value);
  if (!normalized) {
    throw new Error("Debes indicar un día válido.");
  }
  return normalized;
}

const TIME_ONLY_REGEX = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const TIME_WITH_PERIOD_REGEX = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i;

const TIMESTAMP_WITH_OPTIONAL_OFFSET_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?(?:([+-]\d{2}(?::?\d{2})?|Z))?$/;

function ensurePayrollSessionTimestamp(
  value: string | null,
  workDate: string,
  label: string,
): string {
  if (!value) {
    throw new Error(`La hora de ${label} no es válida.`);
  }

  const trimmed = value.trim();
  if (!trimmed.length) {
    throw new Error(`La hora de ${label} no es válida.`);
  }

  const timeWithPeriodMatch = trimmed.match(TIME_WITH_PERIOD_REGEX);
  const timeOnlyMatch = trimmed.match(TIME_ONLY_REGEX);
  let year: string | null = null;
  let month: string | null = null;
  let day: string | null = null;
  let hour: string | null = null;
  let minute: string | null = null;
  let second: string | null = null;
  let fractional: string | null = null;

  if (timeWithPeriodMatch) {
    const workDateMatch = workDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!workDateMatch) {
      throw new Error("La sesión debe pertenecer al día seleccionado.");
    }
    const [, hourRaw, minuteRaw, secondRaw, periodRaw] = timeWithPeriodMatch;
    const numericHour = Number(hourRaw);
    if (!Number.isFinite(numericHour) || numericHour < 1 || numericHour > 12) {
      throw new Error(`La hora de ${label} no es válida.`);
    }
    const period = periodRaw.toUpperCase();
    const baseHour = numericHour % 12;
    const offset = period === "PM" ? 12 : 0;
    const convertedHour = (baseHour + offset) % 24;
    year = workDateMatch[1];
    month = workDateMatch[2];
    day = workDateMatch[3];
    hour = String(convertedHour).padStart(2, "0");
    minute = minuteRaw;
    second = secondRaw ?? "00";
  } else if (timeOnlyMatch) {
    const workDateMatch = workDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!workDateMatch) {
      throw new Error("La sesión debe pertenecer al día seleccionado.");
    }
    year = workDateMatch[1];
    month = workDateMatch[2];
    day = workDateMatch[3];
    hour = timeOnlyMatch[1];
    minute = timeOnlyMatch[2];
    second = timeOnlyMatch[3] ?? "00";
  } else {
    const normalized = normalizePayrollTimestamp(trimmed);
    if (!normalized) {
      throw new Error(`La hora de ${label} no es válida.`);
    }

    const match = normalized.match(TIMESTAMP_WITH_OPTIONAL_OFFSET_REGEX);
    if (!match) {
      throw new Error(`La hora de ${label} no es válida.`);
    }

    year = match[1];
    month = match[2];
    day = match[3];
    hour = match[4];
    minute = match[5];
    second = match[6] ?? "00";
    fractional = match[7] ?? null;
  }

  if (!year || !month || !day || !hour || !minute || !second) {
    throw new Error(`La hora de ${label} no es válida.`);
  }

  const safeFraction = fractional ? `.${fractional}` : "";
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${safeFraction}${PAYROLL_TIMEZONE_OFFSET}`;
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
    FROM public.staff_attendance
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

function toLocalClockTextOrThrow(label: string, iso: string): string {
  const localized = toPayrollLocalTimestampText(iso);
  if (!localized) {
    throw new Error(`La hora de ${label} no es válida.`);
  }

  const match = localized.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (!match) {
    throw new Error(`La hora de ${label} no es válida.`);
  }

  const hour24 = Number(match[4]);
  const minute = match[5];

  if (!Number.isFinite(hour24)) {
    throw new Error(`La hora de ${label} no es válida.`);
  }

  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const safeHour = String(hour12).padStart(2, "0");

  return `${safeHour}:${minute} ${period}`;
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
  note,
}: {
  sessionId: number;
  staffId: number;
  workDate: string;
  checkinTime: string | null;
  checkoutTime: string | null;
  note?: string | null;
}): Promise<DaySession> {
  const sql = getSqlClient();

  const normalizedWorkDate = ensureWorkDate(workDate);
  const checkinIso = ensurePayrollSessionTimestamp(checkinTime, normalizedWorkDate, "entrada");
  const checkoutIso = ensurePayrollSessionTimestamp(checkoutTime, normalizedWorkDate, "salida");
  ensureSessionMatchesDay(checkinIso, checkoutIso, normalizedWorkDate);
  const minutes = computeDurationMinutes(checkinIso, checkoutIso);
  const transactionalSql = sql as SqlClient & {
    begin?: (callback: (client: SqlClient) => Promise<void>) => Promise<void>;
  };

  const sanitizedNote = note && note.trim().length ? note.trim() : null;

  const executeUpdate = async (client: SqlClient) => {
    await assertNoOverlap(client, {
      staffId,
      workDate: normalizedWorkDate,
      checkinIso,
      checkoutIso,
      ignoreSessionId: sessionId,
    });

    const checkinLocal = toLocalClockTextOrThrow("entrada", checkinIso);
    const checkoutLocal = toLocalClockTextOrThrow("salida", checkoutIso);

    const updatedRows = normalizeRows<SqlRow>(await client`
      SELECT *
      FROM public.edit_staff_session(
        ${sessionId}::bigint,
        ${checkinLocal}::text,
        ${checkoutLocal}::text,
        ${sanitizedNote ?? null}::text
      )
    `);

    if (!updatedRows.length) {
      throw new Error("No pudimos actualizar la sesión indicada.");
    }
  };

  if (typeof transactionalSql.begin === "function") {
    await transactionalSql.begin(executeUpdate);
  } else {
    await executeUpdate(sql);
  }

  const refreshedRows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.staff_day_sessions_with_edits_v
    WHERE session_id = ${sessionId}::bigint
    LIMIT 1
  `);

  const refreshed = refreshedRows[0];
  if (!refreshed) {
    throw new Error("No pudimos recuperar la sesión actualizada.");
  }

  const currentCheckin = refreshed["checkin_local"];
  const currentCheckout = refreshed["checkout_local"];
  const currentMinutes =
    toInteger(refreshed["session_minutes"] ?? refreshed["minutes"] ?? null) ?? minutes;

  return {
    sessionId,
    staffId,
    workDate: normalizedWorkDate,
    checkinTime: normalizeTimestampValue(currentCheckin) ?? coerceString(currentCheckin),
    checkoutTime: normalizeTimestampValue(currentCheckout) ?? coerceString(currentCheckout),
    minutes: currentMinutes,
    hours: minutesToHours(currentMinutes),
    originalSessionId: toInteger(refreshed["session_id"] ?? null),
    originalCheckinTime:
      normalizeTimestampValue(refreshed["original_checkin_local"]) ?? coerceString(refreshed["original_checkin_local"]),
    originalCheckoutTime:
      normalizeTimestampValue(refreshed["original_checkout_local"]) ?? coerceString(refreshed["original_checkout_local"]),
    replacementSessionId: null,
    isOriginalRecord: false,
    editedCheckinTime:
      normalizeTimestampValue(refreshed["edited_checkin_local"]) ?? coerceString(refreshed["edited_checkin_local"]),
    editedCheckoutTime:
      normalizeTimestampValue(refreshed["edited_checkout_local"]) ?? coerceString(refreshed["edited_checkout_local"]),
    editedByStaffId: toInteger(refreshed["edited_by_staff_id"] ?? null),
    editNote: coerceString(refreshed["edit_note"]),
    wasEdited: toBoolean(refreshed["was_edited"]),
  };
}

export async function createStaffDaySession({
  staffId,
  workDate,
  checkinTime,
  checkoutTime,
  note,
}: {
  staffId: number;
  workDate: string;
  checkinTime: string | null;
  checkoutTime: string | null;
  note?: string | null;
}): Promise<DaySession> {
  const sql = getSqlClient();

  const normalizedWorkDate = ensureWorkDate(workDate);
  const checkinIso = ensurePayrollSessionTimestamp(checkinTime, normalizedWorkDate, "entrada");
  const checkoutIso = ensurePayrollSessionTimestamp(checkoutTime, normalizedWorkDate, "salida");
  ensureSessionMatchesDay(checkinIso, checkoutIso, normalizedWorkDate);
  const minutes = computeDurationMinutes(checkinIso, checkoutIso);
  const sanitizedNote = note && note.trim().length ? note.trim() : null;

  await assertNoOverlap(sql, {
    staffId,
    workDate: normalizedWorkDate,
    checkinIso,
    checkoutIso,
  });

  const checkinLocal = toLocalClockTextOrThrow("entrada", checkinIso);
  const checkoutLocal = toLocalClockTextOrThrow("salida", checkoutIso);

  const insertedRows = await executeAddStaffSessionSql(sql, {
    staffId,
    workDate: normalizedWorkDate,
    checkinClock: checkinLocal,
    checkoutClock: checkoutLocal,
    note: sanitizedNote,
  });

  const inserted = insertedRows[0];
  if (!inserted) {
    throw new Error("No pudimos crear la sesión solicitada.");
  }

  const sessionId = toInteger(inserted["session_id"] ?? inserted["id"] ?? null);
  if (!sessionId) {
    throw new Error("No pudimos determinar el identificador de la nueva sesión.");
  }

  const refreshedRows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.staff_day_sessions_with_edits_v
    WHERE session_id = ${sessionId}::bigint
    LIMIT 1
  `);

  const refreshed = refreshedRows[0];
  const checkinCurrent = refreshed?.["checkin_local"] ?? inserted["checkin_local"];
  const checkoutCurrent = refreshed?.["checkout_local"] ?? inserted["checkout_local"];
  const currentMinutes =
    toInteger(
      refreshed?.["session_minutes"] ??
        inserted["session_minutes"] ??
        inserted["minutes"] ??
        null,
    ) ?? minutes;

  const wasEdited = toBoolean(refreshed?.["was_edited"] ?? false);

  return {
    sessionId,
    staffId,
    workDate: normalizedWorkDate,
    checkinTime: normalizeTimestampValue(checkinCurrent) ?? coerceString(checkinCurrent) ?? checkinIso,
    checkoutTime:
      normalizeTimestampValue(checkoutCurrent) ?? coerceString(checkoutCurrent) ?? checkoutIso,
    minutes: currentMinutes,
    hours: minutesToHours(currentMinutes),
    originalSessionId: null,
    replacementSessionId: null,
    isOriginalRecord: false,
    originalCheckinTime:
      normalizeTimestampValue(refreshed?.["original_checkin_local"]) ??
      coerceString(refreshed?.["original_checkin_local"]) ??
      null,
    originalCheckoutTime:
      normalizeTimestampValue(refreshed?.["original_checkout_local"]) ??
      coerceString(refreshed?.["original_checkout_local"]) ??
      null,
    editedCheckinTime:
      normalizeTimestampValue(refreshed?.["edited_checkin_local"]) ??
      coerceString(refreshed?.["edited_checkin_local"]) ??
      null,
    editedCheckoutTime:
      normalizeTimestampValue(refreshed?.["edited_checkout_local"]) ??
      coerceString(refreshed?.["edited_checkout_local"]) ??
      null,
    editedByStaffId: toInteger(refreshed?.["edited_by_staff_id"] ?? null),
    editNote: coerceString(refreshed?.["edit_note"]),
    wasEdited,
  };
}

export async function deleteStaffDaySession({
  sessionId,
  staffId,
  workDate,
  note,
}: {
  sessionId: number;
  staffId: number;
  workDate: string;
  note?: string | null;
}): Promise<void> {
  const sql = getSqlClient();
  ensureWorkDate(workDate);
  const sanitizedNote = note && note.trim().length ? note.trim() : null;

  const deletedRows = await executeDeleteStaffSessionSql(sql, {
    sessionId,
    note: sanitizedNote,
  });

  if (!deletedRows.length) {
    throw new Error("No encontramos la sesión indicada.");
  }
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
  await sql`
    INSERT INTO public.payroll_audit_events (
      action,
      staff_id,
      work_date,
      details
    )
    VALUES (
      'approve_day',
      ${staffId}::bigint,
      ${normalizedWorkDate}::date,
      ${JSON.stringify({ approved: true })}::jsonb
    )
  `;
}

export async function overrideSessionsAndApprove({
  staffId,
  workDate,
  overrides = [],
  additions = [],
  deletions = [],
  note = null,
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
  note?: string | null;
}): Promise<void> {
  const sql = getSqlClient();
  const normalizedWorkDate = ensureWorkDate(workDate);
  const sanitizedNote = note && note.trim().length ? note.trim() : null;

  await sql`BEGIN`;
  try {
    const sanitizedDeletions = deletions.filter((value) => Number.isFinite(value));
    for (const sessionId of sanitizedDeletions) {
      const result = await executeDeleteStaffSessionSql(sql, {
        sessionId: Number(sessionId),
        note: sanitizedNote,
      });
      if (!result.length) {
        throw new Error("No encontramos una de las sesiones a eliminar.");
      }
    }

    for (const override of overrides) {
      const checkinIso = ensurePayrollSessionTimestamp(
        override.checkinTime,
        normalizedWorkDate,
        "entrada",
      );
      const checkoutIso = ensurePayrollSessionTimestamp(
        override.checkoutTime,
        normalizedWorkDate,
        "salida",
      );
      if (!checkinIso || !checkoutIso) {
        throw new Error("Las horas de entrada y salida deben ser válidas.");
      }
      if (new Date(checkoutIso).getTime() <= new Date(checkinIso).getTime()) {
        throw new Error(
          "La hora de salida debe ser posterior a la hora de entrada.",
        );
      }
      await assertNoOverlap(sql, {
        staffId,
        workDate: normalizedWorkDate,
        checkinIso,
        checkoutIso,
        ignoreSessionId: override.sessionId,
      });

      const checkinLocal = toLocalClockTextOrThrow("entrada", checkinIso);
      const checkoutLocal = toLocalClockTextOrThrow("salida", checkoutIso);

      await sql`
        SELECT *
        FROM public.edit_staff_session(
          ${override.sessionId}::bigint,
          ${checkinLocal}::text,
          ${checkoutLocal}::text,
          ${sanitizedNote ?? null}::text
        )
      `;
    }

    const sanitizedAdditions = additions.map((entry) => ({
      checkinTime: ensurePayrollSessionTimestamp(
        entry.checkinTime,
        normalizedWorkDate,
        "entrada",
      ),
      checkoutTime: ensurePayrollSessionTimestamp(
        entry.checkoutTime,
        normalizedWorkDate,
        "salida",
      ),
    }));

    const validAdditions = sanitizedAdditions.filter(
      (entry): entry is { checkinTime: string; checkoutTime: string } =>
        Boolean(entry.checkinTime) && Boolean(entry.checkoutTime),
    );

    if (validAdditions.length !== sanitizedAdditions.length) {
      throw new Error("Las nuevas sesiones deben tener horas válidas.");
    }

    if (validAdditions.length) {
      for (const addition of validAdditions) {
        if (
          new Date(addition.checkoutTime).getTime()
          <= new Date(addition.checkinTime).getTime()
        ) {
          throw new Error(
            "La hora de salida debe ser posterior a la hora de entrada.",
          );
        }

        await assertNoOverlap(sql, {
          staffId,
          workDate: normalizedWorkDate,
          checkinIso: addition.checkinTime,
          checkoutIso: addition.checkoutTime,
        });

        const checkinLocal = toLocalClockTextOrThrow("entrada", addition.checkinTime);
        const checkoutLocal = toLocalClockTextOrThrow("salida", addition.checkoutTime);

        const inserted = await executeAddStaffSessionSql(sql, {
          staffId,
          workDate: normalizedWorkDate,
          checkinClock: checkinLocal,
          checkoutClock: checkoutLocal,
          note: sanitizedNote,
        });
        if (!inserted.length) {
          throw new Error("No pudimos crear la sesión solicitada.");
        }
      }
    }

    const recalculatedRows = normalizeRows<SqlRow>(await sql`
      SELECT COALESCE(SUM(session_minutes), 0)::integer AS total_minutes
      FROM public.attendance_local_base_v
      WHERE staff_id = ${staffId}::bigint
        AND work_date_local = ${normalizedWorkDate}::date
    `);

    const metrics = recalculatedRows[0] ?? {};
    const recalculatedMinutes =
      toInteger(metrics.total_minutes ?? metrics.minutes ?? null) ?? 0;

    await applyStaffDayApproval(sql, staffId, normalizedWorkDate, recalculatedMinutes);
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
  noStore();
  const sql = getSqlClient();
  const { monthKey, monthStart } = resolveMonthWindow(month);

  const client = sql as unknown as {
    unsafe: (query: string, params?: unknown[]) => Promise<unknown>;
  };

  let query = `
    SELECT
      v.staff_id AS staff_id,
      sm.full_name AS staff_name,
      v.month AS month,
      v.approved_days AS approved_days,
      v.approved_hours AS approved_hours,
      v.amount_paid AS amount_paid,
      v.paid AS paid,
      v.last_approved_at AT TIME ZONE '${TIMEZONE}' AS last_approved_at,
      v.reference AS reference,
      v.paid_by AS paid_by,
      v.paid_at AT TIME ZONE '${TIMEZONE}' AS paid_at
    FROM public.payroll_month_status_v v
    LEFT JOIN public.staff_members sm ON sm.id = v.staff_id
    WHERE v.month = date_trunc('month', $1::date)
  `;
  const params: Array<string | number> = [monthStart];

  if (staffId != null) {
    query += ` AND v.staff_id = $2::bigint`;
    params.push(Number(staffId));
  }

  query += ` ORDER BY v.staff_id`;

  const rows = normalizeRows<SqlRow>(await client.unsafe(query, params));

  return rows.map((row) => ({
    staffId: Number(row.staff_id),
    staffName: coerceString(row.staff_name),
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
