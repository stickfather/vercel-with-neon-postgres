import { getSqlClient, normalizeRows, TIMEZONE, type SqlRow } from "@/lib/db/client";
import {
  normalizePayrollTimestamp,
  toPayrollZonedISOString,
} from "@/lib/payroll/timezone";
import { z, ZodError } from "@/lib/validation/zod";
import type { BaseSchema } from "@/lib/validation/zod";
import type {
  DaySession,
  MonthSummaryRow,
  PayrollMatrixCell,
  PayrollMatrixResponse,
  PayrollMatrixRow,
} from "@/types/payroll";

export type SqlClientLike = ReturnType<typeof getSqlClient>;

type TransactionCapableSqlClient = SqlClientLike & {
  begin<T>(callback: (sql: SqlClientLike) => Promise<T>): Promise<T>;
};

function isTransactionCapableSqlClient(sql: SqlClientLike): sql is TransactionCapableSqlClient {
  return typeof (sql as TransactionCapableSqlClient).begin === "function";
}

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function ensureSqlClient(sql?: SqlClientLike): SqlClientLike {
  return (sql ?? getSqlClient()) as SqlClientLike;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toOptionalNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["t", "true", "1", "yes", "y", "si", "sí"].includes(normalized);
  }
  return false;
}

function getRowValue(row: SqlRow, candidates: string[]): unknown {
  for (const candidate of candidates) {
    if (candidate in row) {
      return row[candidate as keyof typeof row];
    }
    const lowerCandidate = candidate.toLowerCase();
    for (const [key, value] of Object.entries(row)) {
      if (key.toLowerCase() === lowerCandidate) {
        return value;
      }
    }
  }
  return undefined;
}

export function roundMinutesToHours(minutes: number): number {
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
  return Math.round((safeMinutes / 60) * 100) / 100;
}

function formatDateOnly(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(
    value.getUTCDate(),
  ).padStart(2, "0")}`;
}

function toDateOnly(value: unknown): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return formatDateOnly(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) return null;
    if (ISO_DATE_REGEX.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateOnly(parsed);
    }
  }

  return null;
}

function enumerateDays(start: string, end: string): string[] {
  if (start > end) return [];
  const days: string[] = [];
  let current = new Date(`${start}T00:00:00Z`);
  const target = new Date(`${end}T00:00:00Z`);
  while (current.getTime() <= target.getTime()) {
    days.push(formatDateOnly(current));
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }
  return days;
}

async function ensureStaffExists(sql: SqlClientLike, staffId: number): Promise<void> {
  const rows = normalizeRows<{ exists: boolean }>(
    await sql`SELECT EXISTS (SELECT 1 FROM public.staff_members WHERE id = ${staffId}::bigint) AS exists`,
  );
  if (!rows[0]?.exists) {
    throw new HttpError(404, "No encontramos al colaborador indicado.");
  }
}

async function fetchApprovedMinutes(
  sql: SqlClientLike,
  staffId: number,
  workDate: string,
): Promise<number> {
  const rows = normalizeRows<{ total_minutes: unknown }>(
    await sql`
      SELECT COALESCE(SUM(session_minutes), 0)::integer AS total_minutes
      FROM public.attendance_local_base_v
      WHERE staff_id = ${staffId}::bigint
        AND work_date_local = ${workDate}::date
    `,
  );
  const minutes = toNumber(rows[0]?.total_minutes ?? 0);
  return Math.max(0, Math.round(minutes));
}

async function upsertDayApproval(
  sql: SqlClientLike,
  staffId: number,
  workDate: string,
  minutes: number,
  approvedBy: string | null,
): Promise<void> {
  await sql`
    INSERT INTO public.payroll_day_approvals (
      staff_id,
      work_date,
      approved,
      approved_minutes,
      approved_by,
      approved_at
    )
    VALUES (
      ${staffId}::bigint,
      ${workDate}::date,
      TRUE,
      ${minutes}::integer,
      ${approvedBy ?? null}::varchar,
      NOW()
    )
    ON CONFLICT (staff_id, work_date) DO UPDATE
    SET
      approved = EXCLUDED.approved,
      approved_minutes = EXCLUDED.approved_minutes,
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at
  `;
}

async function revokeDayApproval(
  sql: SqlClientLike,
  staffId: number,
  workDate: string,
): Promise<void> {
  await sql`
    INSERT INTO public.payroll_day_approvals (
      staff_id,
      work_date,
      approved,
      approved_minutes,
      approved_by,
      approved_at
    )
    VALUES (
      ${staffId}::bigint,
      ${workDate}::date,
      FALSE,
      NULL,
      NULL,
      NULL
    )
    ON CONFLICT (staff_id, work_date) DO UPDATE
    SET
      approved = FALSE,
      approved_minutes = NULL,
      approved_by = NULL,
      approved_at = NULL
  `;
}

async function logPayrollAudit(
  sql: SqlClientLike,
  action: string,
  staffId: number,
  workDate: string,
  sessionId: number | null,
  details: Record<string, unknown> | null,
): Promise<void> {
  await sql`
    INSERT INTO public.payroll_audit_events (
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

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.length) {
    throw new HttpError(400, "Las horas indicadas no son válidas.");
  }
  const normalized = normalizePayrollTimestamp(trimmed);
  if (!normalized) {
    throw new HttpError(400, "Las horas indicadas no son válidas.");
  }
  return normalized;
}

function toPayrollLogTimestamp(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return toPayrollZonedISOString(value) ?? normalizePayrollTimestamp(value.toISOString());
  }
  const raw = String(value);
  if (!raw.trim().length) {
    return null;
  }
  const normalized = normalizePayrollTimestamp(raw);
  if (!normalized) {
    return null;
  }
  const asDate = new Date(normalized);
  if (Number.isNaN(asDate.getTime())) {
    return normalized;
  }
  return toPayrollZonedISOString(asDate) ?? normalized;
}

function validateSessionRange(checkinIso: string, checkoutIso: string, workDate: string): void {
  const start = new Date(checkinIso).getTime();
  const end = new Date(checkoutIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new HttpError(400, "La hora de salida debe ser posterior a la hora de entrada.");
  }
  const startDay = formatLocalDate(checkinIso);
  const endDay = formatLocalDate(checkoutIso);
  if (startDay !== workDate || endDay !== workDate) {
    throw new HttpError(400, "Las sesiones deben pertenecer al día seleccionado.");
  }
}

function formatLocalDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.length) {
    return "";
  }
  const normalized = trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed;
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  if (!year || !month || !day) {
    return "";
  }
  return `${year}-${month}-${day}`;
}

function normalizePaidAt(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  if (ISO_DATE_REGEX.test(trimmed)) {
    const zoned = normalizePayrollTimestamp(`${trimmed}T00:00:00`);
    if (!zoned) {
      throw new HttpError(400, "La fecha de pago no es válida.");
    }
    return zoned;
  }
  const normalized = normalizePayrollTimestamp(trimmed);
  if (!normalized) {
    throw new HttpError(400, "La fecha de pago no es válida.");
  }
  return normalized;
}

export const MatrixQuerySchema = z
  .object({
    month: z.string().trim().regex(ISO_DATE_REGEX, "Debes indicar el mes en formato 'YYYY-MM-01'.").optional(),
    start: z.string().trim().regex(ISO_DATE_REGEX, "Debes indicar la fecha inicial en formato 'YYYY-MM-DD'.").optional(),
    end: z.string().trim().regex(ISO_DATE_REGEX, "Debes indicar la fecha final en formato 'YYYY-MM-DD'.").optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.month && (!value.start || !value.end)) {
      ctx.addIssue({ message: "Debes indicar el mes o un rango de fechas válido." });
      return;
    }
    if (value.start && value.end && value.start > value.end) {
      ctx.addIssue({ message: "La fecha inicial no puede ser posterior a la final.", path: ["start"] });
    }
  });

export const DaySessionsQuerySchema = z.object({
  staffId: z.number().int("El identificador del colaborador no es válido."),
  date: z.string().trim().regex(ISO_DATE_REGEX, "Debes indicar un día válido."),
});

const sessionOverrideSchema = z.object({
  sessionId: z.number().int("El identificador de la sesión no es válido."),
  checkinTime: z.string().trim().nonempty("La hora de entrada es obligatoria."),
  checkoutTime: z.string().trim().nonempty("La hora de salida es obligatoria."),
});

const sessionAdditionSchema = z.object({
  checkinTime: z.string().trim().nonempty("La hora de entrada es obligatoria."),
  checkoutTime: z.string().trim().nonempty("La hora de salida es obligatoria."),
});

export const OverrideAndApproveSchema = z.object({
  staffId: z.number().int("El identificador del colaborador no es válido."),
  workDate: z.string().trim().regex(ISO_DATE_REGEX, "Debes indicar un día válido."),
  overrides: z.array(sessionOverrideSchema).default([]),
  additions: z.array(sessionAdditionSchema).default([]),
  deletions: z.array(z.number().int("El identificador de la sesión no es válido.")).default([]),
  approvedBy: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length ? value : undefined)),
});

export const ApproveDaySchema = z.object({
  staffId: z.number().int("El identificador del colaborador no es válido."),
  workDate: z.string().trim().regex(ISO_DATE_REGEX, "Debes indicar un día válido."),
  approved: z.boolean().optional().default(true),
  approvedBy: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length ? value : undefined)),
});

export const MonthSummaryQuerySchema = z.object({
  month: z.string().trim().regex(ISO_DATE_REGEX, "Debes indicar el mes en formato 'YYYY-MM-01'."),
});

export const SetMonthPaidSchema = z.object({
  staffId: z.number().int("El identificador del colaborador no es válido."),
  month: z.string().trim().regex(ISO_DATE_REGEX, "Debes indicar el mes en formato 'YYYY-MM-01'."),
  paid: z.boolean(),
  paidAt: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value) => (value && value.length ? value : undefined)),
  amountPaid: z.number().optional(),
  reference: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length ? value : undefined)),
  paidBy: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length ? value : undefined)),
});

function resolveRange(value: SchemaInput<typeof MatrixQuerySchema>): { start: string; end: string } {
  if (value.month) {
    const start = value.month;
    const [year, month] = start.split("-").map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const lastDay = new Date(Date.UTC(nextYear, nextMonth - 1, 0)).getUTCDate();
    const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { start, end };
  }
  return { start: value.start!, end: value.end! };
}

function normalizeStaffName(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length) {
    return value.trim();
  }
  return null;
}

function normalizeMonthDate(value: unknown, fallback: string): string {
  if (value instanceof Date) {
    const zoned = toPayrollZonedISOString(value);
    if (!zoned) {
      return fallback;
    }
    const zonedDate = zoned.slice(0, 10);
    if (zonedDate === fallback) {
      return zonedDate;
    }
    const utcDate = value.toISOString().slice(0, 10);
    if (utcDate === fallback) {
      return fallback;
    }
    return zonedDate;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length) {
      const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      }

      const normalized = normalizePayrollTimestamp(trimmed);
      if (normalized) {
        return normalized.slice(0, 10);
      }
    }
  }

  return fallback;
}

type SchemaInput<TSchema extends BaseSchema<any>> = TSchema extends BaseSchema<infer U> ? U : never;

export async function getPayrollMatrix(
  params: SchemaInput<typeof MatrixQuerySchema>,
  sqlClient?: SqlClientLike,
): Promise<PayrollMatrixResponse> {
  const sql = ensureSqlClient(sqlClient);
  const { start, end } = resolveRange(params);
  const rows = normalizeRows<SqlRow>(
    await sql`
      SELECT
        m.staff_id,
        sm.full_name AS staff_name,
        m.work_date,
        m.total_hours,
        m.approved_hours,
        m.horas_mostrar,
        m.approved,
        COALESCE(he.has_edits, FALSE) AS has_edits
      FROM public.staff_day_matrix_local_v AS m
      LEFT JOIN public.staff_members AS sm ON sm.id = m.staff_id
      LEFT JOIN public.staff_day_has_edits_v he ON he.staff_id = m.staff_id AND he.work_date = m.work_date
      WHERE m.work_date BETWEEN ${start}::date AND ${end}::date
      ORDER BY m.staff_id, m.work_date
    `,
  );

  const days = enumerateDays(start, end);
  const grouped = new Map<number, PayrollMatrixRow & { cellMap: Map<string, PayrollMatrixCell> }>();

  for (const row of rows) {
    const staffId = Number(row["staff_id"]);
    if (!Number.isFinite(staffId)) continue;
    const workDate = toDateOnly(row["work_date"]);
    if (!workDate) continue;
    const approved = toBoolean(row["approved"]);
    const approvedHoursRaw = toOptionalNumber(row["approved_hours"]);
    const approvedHoursMinutes =
      approvedHoursRaw != null && Number.isFinite(approvedHoursRaw)
        ? Math.round(approvedHoursRaw * 60)
        : null;
    const approvedHours =
      approvedHoursMinutes != null ? roundMinutesToHours(approvedHoursMinutes) : null;
    const baseHours = approved
      ? approvedHours ?? toOptionalNumber(row["horas_mostrar"]) ?? toOptionalNumber(row["total_hours"]) ?? 0
      : toOptionalNumber(row["horas_mostrar"]) ?? toOptionalNumber(row["total_hours"]) ?? 0;
    const numericBase = typeof baseHours === "number" && Number.isFinite(baseHours) ? baseHours : 0;
    const minutes = Math.round(numericBase * 60);
    const hours = roundMinutesToHours(minutes);

    if (!grouped.has(staffId)) {
      grouped.set(staffId, {
        staffId,
        staffName: normalizeStaffName(row["staff_name"]) ?? null,
        cells: [],
        cellMap: new Map(),
      });
    }
    const entry = grouped.get(staffId)!;
    entry.cellMap.set(workDate, {
      date: workDate,
      approved,
      hours,
      approvedHours,
      hasEdits: toBoolean(row["has_edits"]),
    });
  }

  const resultRows: PayrollMatrixRow[] = [];
  for (const [, value] of grouped) {
    const cells = days.map(
      (day) =>
        value.cellMap.get(day) ?? {
          date: day,
          hours: 0,
          approved: false,
          approvedHours: null,
          hasEdits: false,
        },
    );
    resultRows.push({ staffId: value.staffId, staffName: value.staffName, cells });
  }

  resultRows.sort((a, b) => a.staffId - b.staffId);

  return { days, rows: resultRows };
}

export async function getDaySessions(
  params: SchemaInput<typeof DaySessionsQuerySchema>,
  sqlClient?: SqlClientLike,
): Promise<DaySession[]> {
  const sql = ensureSqlClient(sqlClient);
  const rows = normalizeRows<SqlRow>(
    await sql`
      SELECT s.*
      FROM public.staff_day_sessions_with_edits_v AS s
      WHERE s.staff_id = ${params.staffId}::bigint
        AND s.work_date = ${params.date}::date
      ORDER BY s.checkin_local NULLS LAST, s.session_id
    `,
  );

  return rows.map((row) => {
    let minutes = toOptionalNumber(row["session_minutes"]);
    if (minutes == null) {
      const totalHours = toOptionalNumber(row["total_hours"]);
      if (totalHours != null) {
        minutes = Math.round(totalHours * 60);
      }
    }
    if (minutes == null) {
      const checkin = row["checkin_local"] ? new Date(String(row["checkin_local"])) : null;
      const checkout = row["checkout_local"] ? new Date(String(row["checkout_local"])) : null;
      if (checkin && checkout) {
        const diff = checkout.getTime() - checkin.getTime();
        if (Number.isFinite(diff) && diff > 0) {
          minutes = Math.round(diff / 60000);
        }
      }
    }
    const safeMinutes = Math.max(0, Math.round(minutes ?? 0));
    const originalSessionIdRaw = getRowValue(row, [
      "original_session_id",
      "source_session_id",
      "previous_session_id",
    ]);
    const replacementSessionIdRaw = getRowValue(row, [
      "replacement_session_id",
      "new_session_id",
      "superseding_session_id",
    ]);
    const rawOriginalFlag = getRowValue(row, [
      "is_original_record",
      "is_original",
      "is_history_record",
    ]);
    let isOriginalRecord = false;
    if (typeof rawOriginalFlag === "string") {
      const normalized = rawOriginalFlag.trim().toLowerCase();
      if (["original", "history", "historical"].includes(normalized)) {
        isOriginalRecord = true;
      } else if (["edited", "current", "replacement", "updated"].includes(normalized)) {
        isOriginalRecord = false;
      } else {
        isOriginalRecord = toBoolean(normalized);
      }
    } else if (rawOriginalFlag != null) {
      isOriginalRecord = toBoolean(rawOriginalFlag);
    }
    return {
      sessionId: Number(row["session_id"] ?? 0),
      checkinTimeLocal: row["checkin_local"] ? String(row["checkin_local"]) : null,
      checkoutTimeLocal: row["checkout_local"] ? String(row["checkout_local"]) : null,
      minutes: safeMinutes,
      hours: roundMinutesToHours(safeMinutes),
      originalCheckinLocal: row["original_checkin_local"] ? String(row["original_checkin_local"]) : null,
      originalCheckoutLocal: row["original_checkout_local"] ? String(row["original_checkout_local"]) : null,
      originalSessionId:
        originalSessionIdRaw != null && Number.isFinite(Number(originalSessionIdRaw))
          ? Number(originalSessionIdRaw)
          : null,
      replacementSessionId:
        replacementSessionIdRaw != null && Number.isFinite(Number(replacementSessionIdRaw))
          ? Number(replacementSessionIdRaw)
          : null,
      isOriginalRecord,
    };
  });
}

export async function approveDay(
  payload: SchemaInput<typeof ApproveDaySchema>,
  sqlClient?: SqlClientLike,
): Promise<void> {
  const sql = ensureSqlClient(sqlClient);
  await ensureStaffExists(sql, payload.staffId);
  if (payload.approved === false) {
    await revokeDayApproval(sql, payload.staffId, payload.workDate);
    await logPayrollAudit(sql, "unapprove_day", payload.staffId, payload.workDate, null, {
      approved: false,
      approvedBy: payload.approvedBy ?? null,
    });
    return;
  }
  const minutes = await fetchApprovedMinutes(sql, payload.staffId, payload.workDate);
  await upsertDayApproval(sql, payload.staffId, payload.workDate, minutes, payload.approvedBy ?? null);
  await logPayrollAudit(sql, "approve_day", payload.staffId, payload.workDate, null, {
    approvedMinutes: minutes,
    approvedBy: payload.approvedBy ?? null,
  });
}

export async function overrideAndApprove(
  payload: SchemaInput<typeof OverrideAndApproveSchema>,
  sqlClient?: SqlClientLike,
): Promise<void> {
  const sql = ensureSqlClient(sqlClient);
  await ensureStaffExists(sql, payload.staffId);
  if (!isTransactionCapableSqlClient(sql)) {
    throw new Error("SQL client does not support transactions");
  }
  await sql.begin(async (transaction) => {
    if (payload.deletions.length) {
      await transaction`
        DELETE FROM public.staff_attendance
        WHERE staff_id = ${payload.staffId}::bigint
          AND id = ANY(${payload.deletions}::bigint[])
      `;
      for (const sessionId of payload.deletions) {
        await logPayrollAudit(transaction, "delete_session", payload.staffId, payload.workDate, sessionId, null);
      }
    }

    for (const override of payload.overrides) {
      const checkinIso = normalizeTime(override.checkinTime);
      const checkoutIso = normalizeTime(override.checkoutTime);
      validateSessionRange(checkinIso, checkoutIso, payload.workDate);

      const existingSessions = normalizeRows<{
        checkin_time: string | Date | null;
        checkout_time: string | Date | null;
      }>(
        await transaction`
          SELECT checkin_time, checkout_time
          FROM public.staff_attendance
          WHERE id = ${override.sessionId}::bigint
            AND staff_id = ${payload.staffId}::bigint
          FOR UPDATE
        `,
      );

      const currentSession = existingSessions[0];
      if (!currentSession) {
        throw new HttpError(404, "No encontramos la sesión que intentas editar.");
      }

      const originalCheckin = toPayrollLogTimestamp(currentSession.checkin_time);
      const originalCheckout = toPayrollLogTimestamp(currentSession.checkout_time);

      await transaction`
        UPDATE public.staff_attendance
        SET checkin_time = ${checkinIso}::timestamptz,
          checkout_time = ${checkoutIso}::timestamptz
        WHERE id = ${override.sessionId}::bigint
          AND staff_id = ${payload.staffId}::bigint
      `;
      await logPayrollAudit(transaction, "update_session", payload.staffId, payload.workDate, override.sessionId, {
        replacedSessionId: override.sessionId,
        before: {
          checkinTime: originalCheckin,
          checkoutTime: originalCheckout,
        },
        after: {
          checkinTime: checkinIso,
          checkoutTime: checkoutIso,
        },
      });
    }

    for (const addition of payload.additions) {
      const checkinIso = normalizeTime(addition.checkinTime);
      const checkoutIso = normalizeTime(addition.checkoutTime);
      validateSessionRange(checkinIso, checkoutIso, payload.workDate);
      const inserted = normalizeRows<{ id: number }>(
        await transaction`
          INSERT INTO public.staff_attendance (staff_id, checkin_time, checkout_time)
          VALUES (${payload.staffId}::bigint, ${checkinIso}::timestamptz, ${checkoutIso}::timestamptz)
          RETURNING id
        `,
      );
      const sessionId = Number(inserted[0]?.id ?? 0);
      await logPayrollAudit(transaction, "create_session", payload.staffId, payload.workDate, sessionId, {
        checkinTime: checkinIso,
        checkoutTime: checkoutIso,
      });
    }

    const minutes = await fetchApprovedMinutes(transaction, payload.staffId, payload.workDate);
    await upsertDayApproval(transaction, payload.staffId, payload.workDate, minutes, payload.approvedBy ?? null);
    await logPayrollAudit(transaction, "approve_day", payload.staffId, payload.workDate, null, {
      approvedMinutes: minutes,
      approvedBy: payload.approvedBy ?? null,
    });
  });
}

export async function getMonthSummary(
  params: SchemaInput<typeof MonthSummaryQuerySchema>,
  sqlClient?: SqlClientLike,
): Promise<MonthSummaryRow[]> {
  const sql = ensureSqlClient(sqlClient);
  const rows = normalizeRows<SqlRow>(
    await sql`
      SELECT
        staff_id,
        staff_name,
        month,
        approved_hours_month,
        hourly_wage,
        approved_amount,
        paid,
        paid_at,
        amount_paid,
        reference,
        paid_by
      FROM public.payroll_month_summary_v
      WHERE month = ${params.month}::date
      ORDER BY staff_name NULLS LAST, staff_id
    `,
  );

  return rows.map((row) => {
    const approvedHoursRaw = toOptionalNumber(row["approved_hours_month"]) ?? 0;
    const approvedHours = Number(approvedHoursRaw.toFixed(2));
    const hourlyWageRaw = toOptionalNumber(row["hourly_wage"]) ?? 0;
    const hourlyWage = Number(hourlyWageRaw.toFixed(2));
    const approvedAmountRaw = toOptionalNumber(row["approved_amount"]);
    const computedApprovedAmount = Number((approvedHours * hourlyWage).toFixed(2));
    const approvedAmount =
      approvedAmountRaw != null
        ? Number(approvedAmountRaw.toFixed(2))
        : computedApprovedAmount;
    const amountPaidRaw = toOptionalNumber(row["amount_paid"]);
    const paidAtValue = row["paid_at"];
    const paidAt =
      paidAtValue == null
        ? null
        : paidAtValue instanceof Date
          ? toPayrollZonedISOString(paidAtValue)
          : normalizePayrollTimestamp(String(paidAtValue));
    const monthValue = normalizeMonthDate(row["month"], params.month);
    return {
      staffId: Number(row["staff_id"] ?? 0),
      staffName: normalizeStaffName(row["staff_name"]),
      month: monthValue,
      approvedHours,
      hourlyWage,
      approvedAmount,
      paid: toBoolean(row["paid"]),
      paidAt,
      amountPaid: amountPaidRaw != null ? Number(amountPaidRaw.toFixed(2)) : null,
      reference: normalizeStaffName(row["reference"]),
      paidBy: normalizeStaffName(row["paid_by"]),
    };
  });
}

export async function setMonthPaid(
  payload: SchemaInput<typeof SetMonthPaidSchema>,
  sqlClient?: SqlClientLike,
): Promise<void> {
  const sql = ensureSqlClient(sqlClient);
  await ensureStaffExists(sql, payload.staffId);
  const paidAt = normalizePaidAt(payload.paid ? payload.paidAt ?? null : null);
  const amountPaid = payload.amountPaid != null ? Number(payload.amountPaid.toFixed(2)) : null;
  await sql`
    INSERT INTO public.payroll_month_payments (
      staff_id,
      month,
      paid,
      paid_at,
      amount_paid,
      reference,
      paid_by
    )
    VALUES (
      ${payload.staffId}::bigint,
      ${payload.month}::date,
      ${payload.paid}::boolean,
      ${paidAt}::timestamptz,
      ${amountPaid}::numeric,
      ${payload.reference ?? null}::text,
      ${payload.paidBy ?? null}::varchar
    )
    ON CONFLICT (staff_id, month) DO UPDATE
    SET
      paid = EXCLUDED.paid,
      paid_at = EXCLUDED.paid_at,
      amount_paid = EXCLUDED.amount_paid,
      reference = EXCLUDED.reference,
      paid_by = EXCLUDED.paid_by
  `;
}

export function parseWithSchema<TSchema extends { parse: (input: unknown) => unknown }>(
  schema: TSchema,
  value: unknown,
): ReturnType<TSchema["parse"]> {
  try {
    return schema.parse(value) as ReturnType<TSchema["parse"]>;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HttpError(400, error.issues[0]?.message ?? "Datos inválidos.");
    }
    throw error;
  }
}
