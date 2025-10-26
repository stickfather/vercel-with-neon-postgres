"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type {
  DaySession,
  DayTotals,
  MatrixCell,
  MatrixRow,
  PayrollMonthStatusRow,
  PayrollMatrixResponse,
} from "@/features/administration/data/payroll-reports";
import { EphemeralToast } from "@/components/ui/ephemeral-toast";
import { PinPrompt } from "@/features/security/components/PinPrompt";
import {
  getPayrollDateTimeParts,
  normalizePayrollTimestamp,
  PAYROLL_TIMEZONE,
  PAYROLL_TIMEZONE_OFFSET,
} from "@/lib/payroll/timezone";

type MatrixResponse = PayrollMatrixResponse;

type SessionRow = {
  sessionKey: string;
  sessionId: number | null;
  staffId: number;
  workDate: string;
  checkinTime: string | null;
  checkoutTime: string | null;
  minutes: number | null;
  hours: number | null;
  isNew: boolean;
  isEditing: boolean;
  draftCheckin: string;
  draftCheckout: string;
  validationError: string | null;
  feedback: string | null;
  pendingAction: null | "edit" | "create" | "delete";
  originalCheckin?: string | null;
  originalCheckout?: string | null;
  originalSessionId?: number | null;
  replacementSessionId?: number | null;
  isHistorical: boolean;
  editedCheckin?: string | null;
  editedCheckout?: string | null;
  editedByStaffId?: number | null;
  editNote?: string | null;
  wasEdited?: boolean;
};

type SessionEditorState = {
  sessionKey: string;
};

type SelectedCell = {
  staffId: number;
  staffName: string;
  workDate: string;
  hours: number;
  approvedHours: number | null;
  approved: MatrixCell["approved"];
};

type AccessMode = "read-only" | "management";

type AccessCheckResult = "granted" | "read-only" | "denied";

const STAFF_COLUMN_WIDTH = 94;
const APPROVED_AMOUNT_COLUMN_WIDTH = 96;
const PAID_COLUMN_WIDTH = 72;
const PAID_DATE_COLUMN_WIDTH = 124;
const TRAILING_COLUMNS_WIDTH =
  APPROVED_AMOUNT_COLUMN_WIDTH + PAID_COLUMN_WIDTH + PAID_DATE_COLUMN_WIDTH;
const MIN_CELL_WIDTH = 32;
const PREFERRED_CELL_WIDTH = 68;
const GRID_PADDING = 16;
const rowDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PAYROLL_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const STATUS_BUTTON_CLASSES: Record<string, string> = {
  pending: "border-[#FF8C42] bg-[#FF8C42] text-white hover:bg-[#ff7a24]",
  approved: "border-[#3CB371] bg-[#3CB371] text-white hover:bg-[#34a368]",
  edited_and_approved: "border-[#F5D76E] bg-[#F5D76E] text-[#614b00] hover:bg-[#f2cc4b]",
  edited_not_approved: "border-[#9B59B6] bg-[#9B59B6] text-white hover:bg-[#8e44ad]",
};

const STATUS_LEGEND: { key: string; label: string; chipClass: string; dotColor: string }[] = [
  {
    key: "pending",
    label: "Pendiente",
    chipClass: "bg-orange-100 text-orange-900",
    dotColor: "#FF8C42",
  },
  {
    key: "approved",
    label: "Aprobado",
    chipClass: "bg-emerald-100 text-emerald-900",
    dotColor: "#3CB371",
  },
  {
    key: "edited_and_approved",
    label: "Editado y aprobado",
    chipClass: "bg-yellow-100 text-yellow-900",
    dotColor: "#F5D76E",
  },
  {
    key: "edited_not_approved",
    label: "Editado sin aprobar",
    chipClass: "bg-[#F1E4F8] text-[#512c71]",
    dotColor: "#9B59B6",
  },
];

const timeZoneDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PAYROLL_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatSessionTimestampForDisplay(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const normalized = normalizePayrollTimestamp(value) ?? value;
  const match = normalized.match(/(?:T|\s)(\d{2}):(\d{2})/);
  if (!match) {
    return null;
  }
  const [, hour, minute] = match;
  return toEditorDisplayTime(hour, minute);
}

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? null;
}

function toTimeZoneDateString(date: Date): string | null {
  const parts = timeZoneDateFormatter.formatToParts(date);
  const year = getPart(parts, "year");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");
  if (!year || !month || !day) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

function toTimeZoneDateTimeParts(
  date: Date,
): { year: string; month: string; day: string; hour: string; minute: string } | null {
  const parts = getPayrollDateTimeParts(date);
  if (!parts) {
    return null;
  }
  const { year, month, day, hour, minute } = parts;
  return { year, month, day, hour, minute } as const;
}

function toMiddayUtc(dateString: string): Date | null {
  const trimmed = dateString.trim();
  if (!trimmed.length) {
    return null;
  }
  const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoDateMatch) {
    return null;
  }
  const candidate = new Date(`${isoDateMatch[0]}T12:00:00Z`);
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }
  return candidate;
}

type MonthSummaryRow = {
  staffId: number;
  staffName: string | null;
  month: string;
  approvedAmount: number | null;
  paid: boolean | null;
  amountPaid: number | null;
  paidAt: string | null;
  reference: string | null;
};

type RawMonthSummaryRow = {
  staff_id?: number;
  staffId?: number;
  staff_name?: string | null;
  staffName?: string | null;
  month?: string;
  approved_amount?: string | number | null;
  approvedAmount?: string | number | null;
  paid?: boolean | null;
  amount_paid?: string | number | null;
  amountPaid?: string | number | null;
  paid_at?: string | null;
  paidAt?: string | null;
  reference?: string | null;
};

const currencyFormatter = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
});

function toCurrency(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "—";
  return currencyFormatter.format(numeric);
}

function toNumeric(value: unknown): number | null {
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeTotalsPayload(value: unknown): DayTotals {
  const payload = (value ?? {}) as {
    totalMinutes?: unknown;
    total_minutes?: unknown;
    totalHours?: unknown;
    total_hours?: unknown;
  };

  const minutesCandidate =
    toNumeric(payload.totalMinutes) ?? toNumeric(payload.total_minutes);
  const safeMinutes =
    minutesCandidate != null && Number.isFinite(minutesCandidate)
      ? Math.max(0, Math.round(minutesCandidate))
      : 0;
  const hoursCandidate =
    toNumeric(payload.totalHours) ?? toNumeric(payload.total_hours);
  const safeHours =
    hoursCandidate != null && Number.isFinite(hoursCandidate)
      ? Math.round(hoursCandidate * 100) / 100
      : Math.round((safeMinutes / 60) * 100) / 100;

  return { totalMinutes: safeMinutes, totalHours: safeHours };
}

function createNoStoreInit(): RequestInit & { next: { revalidate: number } } {
  return {
    cache: "no-store",
    headers: { "Cache-Control": "no-store" },
    next: { revalidate: 0 },
  };
}

function getMonthRange(month: string): { from: string; to: string; endExclusive: string } {
  const [yearString, monthString] = month.split("-");
  const year = Number(yearString);
  const monthNumber = Number(monthString);

  if (!Number.isFinite(year) || !Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    throw new Error("Mes inválido");
  }

  const monthStart = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const nextMonthNumber = monthNumber === 12 ? 1 : monthNumber + 1;
  const nextMonthYear = monthNumber === 12 ? year + 1 : year;
  const nextMonthStart = `${nextMonthYear}-${String(nextMonthNumber).padStart(2, "0")}-01`;

  const startDate = new Date(`${monthStart}T00:00:00Z`);
  const nextMonthDate = new Date(`${nextMonthStart}T00:00:00Z`);
  const displayEndDate = new Date(nextMonthDate.getTime() - 24 * 60 * 60 * 1000);

  const format = (date: Date) =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
      date.getUTCDate(),
    ).padStart(2, "0")}`;

  return { from: monthStart, to: format(displayEndDate), endExclusive: nextMonthStart };
}

function formatDayLabel(dateString: string, formatter: Intl.DateTimeFormat) {
  const midday = toMiddayUtc(dateString);
  if (!midday) {
    return dateString;
  }
  return formatter.format(midday);
}

const TIMESTAMP_INPUT_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?(?:([+-]\d{2}(?::?\d{2})?|Z))?$/;

const FLEXIBLE_TIME_INPUT_REGEX =
  /^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?$/i;

function normalizeOffset(offset: string | null | undefined): string | null {
  if (!offset || offset === "") {
    return null;
  }
  if (offset === "Z") {
    return "Z";
  }
  if (/^[+-]\d{2}$/.test(offset)) {
    return `${offset}:00`;
  }
  if (!offset.includes(":")) {
    return `${offset.slice(0, 3)}:${offset.slice(3)}`;
  }
  return offset;
}

function extractTimestampComponents(value: string | null): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  offset: string | null;
} | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }
  const normalized = trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed;
  const match = normalized.match(TIMESTAMP_INPUT_REGEX);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second, _fractional, offset] = match;
  return {
    year,
    month,
    day,
    hour,
    minute,
    second: second ?? "00",
    offset: normalizeOffset(offset),
  };
}

function toEditorDisplayTime(hour24: string, minute: string): string {
  const numericHour = Number(hour24);
  if (!Number.isFinite(numericHour)) {
    return `${hour24}:${minute}`;
  }
  const suffix = numericHour >= 12 ? "PM" : "AM";
  const hour12 = numericHour % 12 === 0 ? 12 : numericHour % 12;
  return `${String(hour12).padStart(2, "0")}:${minute} ${suffix}`;
}

function parseFlexibleTimeInput(
  value: string,
): { hour: string; minute: string; second: string } | null {
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }
  const normalized = trimmed.replace(/\s+/g, " ");
  const match = normalized.match(FLEXIBLE_TIME_INPUT_REGEX);
  if (!match) {
    return null;
  }

  const [, hourRaw, minuteRaw, secondRaw, meridiemRaw] = match;
  const minute = minuteRaw != null ? Number(minuteRaw) : 0;
  const second = secondRaw != null ? Number(secondRaw) : 0;

  if (!Number.isFinite(minute) || minute < 0 || minute > 59) {
    return null;
  }
  if (!Number.isFinite(second) || second < 0 || second > 59) {
    return null;
  }

  let hour = Number(hourRaw);
  if (!Number.isFinite(hour)) {
    return null;
  }

  const meridiem = meridiemRaw ? meridiemRaw.toLowerCase() : null;
  if (meridiem) {
    if (hour < 1 || hour > 12) {
      return null;
    }
    if (hour === 12) {
      hour = meridiem === "am" ? 0 : 12;
    } else if (meridiem === "pm") {
      hour += 12;
    }
  } else if (hour > 23) {
    return null;
  }

  const safeHour = String(hour).padStart(2, "0");
  const safeMinute = String(minute).padStart(2, "0");
  const safeSecond = String(second).padStart(2, "0");

  return { hour: safeHour, minute: safeMinute, second: safeSecond };
}

function normalizeEditorTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.length) {
    return "";
  }
  const parsed = parseFlexibleTimeInput(trimmed);
  if (!parsed) {
    return trimmed.toUpperCase();
  }
  return toEditorDisplayTime(parsed.hour, parsed.minute);
}

type TimePeriod = "AM" | "PM";

type TimeSegments = {
  hour: string;
  minute: string;
  period: TimePeriod;
};

function toTimeSegments(value: string): TimeSegments {
  const trimmed = value.trim();
  if (!trimmed.length) {
    return { hour: "", minute: "", period: "AM" };
  }

  const parsed = parseFlexibleTimeInput(trimmed);
  if (!parsed) {
    return { hour: "", minute: "", period: "AM" };
  }

  const hour24 = Number(parsed.hour);
  const minute = parsed.minute;
  const period: TimePeriod = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return {
    hour: String(hour12).padStart(2, "0"),
    minute,
    period,
  };
}

function segmentsToValue({ hour, minute, period }: TimeSegments): string {
  if (!hour || !minute) {
    return "";
  }
  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);
  if (!Number.isFinite(hourNumber) || hourNumber < 1 || hourNumber > 12) {
    return "";
  }
  if (!Number.isFinite(minuteNumber) || minuteNumber < 0 || minuteNumber > 59) {
    return "";
  }
  const safeHour = String(hourNumber).padStart(2, "0");
  const safeMinute = String(minuteNumber).padStart(2, "0");
  const safePeriod: TimePeriod = period === "PM" ? "PM" : "AM";
  return `${safeHour}:${safeMinute} ${safePeriod}`;
}

function normalizeHourSegment(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) {
    return "";
  }
  let numeric = Number(digits);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  if (numeric < 1) {
    numeric = 1;
  }
  if (numeric > 12) {
    numeric = 12;
  }
  return String(numeric).padStart(2, "0");
}

function normalizeMinuteSegment(value: string): string {
  const digits = value.replace(/[^\d]/g, "").slice(0, 2);
  if (!digits) {
    return "";
  }
  let numeric = Number(digits);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  if (numeric < 0) {
    numeric = 0;
  }
  if (numeric > 59) {
    numeric = 59;
  }
  return String(numeric).padStart(2, "0");
}

type SegmentedTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  required?: boolean;
  "aria-describedby"?: string;
};

function SegmentedTimeInput({
  value,
  onChange,
  onBlur,
  disabled,
  required,
  "aria-describedby": ariaDescribedBy,
}: SegmentedTimeInputProps) {
  const [segments, setSegments] = useState<TimeSegments>(() => toTimeSegments(value));
  const hourRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    hourRef.current?.focus();
  }, []);

  const updateSegments = useCallback(
    (updater: (previous: TimeSegments) => TimeSegments, options?: { emit?: boolean }) => {
      setSegments((previous) => {
        const next = updater(previous);
        if (options?.emit !== false) {
          onChange(segmentsToValue(next));
        }
        return next;
      });
    },
    [onChange],
  );

  const handleHourChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/[^\d]/g, "").slice(0, 2);
    updateSegments((prev) => ({ ...prev, hour: raw }));
  };

  const handleHourBlur = () => {
    updateSegments((prev) => ({ ...prev, hour: normalizeHourSegment(prev.hour) }));
    onBlur?.();
  };

  const handleMinuteChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/[^\d]/g, "").slice(0, 2);
    updateSegments((prev) => ({ ...prev, minute: raw }));
  };

  const handleMinuteBlur = () => {
    updateSegments((prev) => ({ ...prev, minute: normalizeMinuteSegment(prev.minute) }));
    onBlur?.();
  };

  const handlePeriodChange = (nextPeriod: TimePeriod) => {
    updateSegments((prev) => ({ ...prev, period: nextPeriod }));
    onBlur?.();
  };

  return (
    <div
      className={`flex items-center justify-between rounded-2xl border border-brand-ink-muted/20 bg-white shadow-sm ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-1 px-3 py-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={segments.hour}
          onChange={handleHourChange}
          onBlur={handleHourBlur}
          disabled={disabled}
          required={required}
          aria-describedby={ariaDescribedBy}
          ref={hourRef}
          className="w-12 rounded-xl border border-transparent bg-transparent text-center text-sm font-semibold text-brand-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed"
        />
        <span className="text-sm font-semibold text-brand-ink-muted">:</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={segments.minute}
          onChange={handleMinuteChange}
          onBlur={handleMinuteBlur}
          disabled={disabled}
          required={required}
          aria-describedby={ariaDescribedBy}
          className="w-12 rounded-xl border border-transparent bg-transparent text-center text-sm font-semibold text-brand-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed"
        />
      </div>
      <div className="flex h-full">
        {(["AM", "PM"] as TimePeriod[]).map((periodOption) => {
          const isActive = segments.period === periodOption;
          return (
            <button
              key={periodOption}
              type="button"
              onClick={() => handlePeriodChange(periodOption)}
              disabled={disabled}
              aria-pressed={isActive}
              className={`inline-flex h-full w-14 items-center justify-center px-0 text-[11px] font-semibold uppercase tracking-wide transition first:rounded-l-2xl last:rounded-r-2xl ${
                isActive
                  ? "bg-brand-teal-soft text-brand-deep"
                  : "text-brand-ink-muted hover:bg-brand-deep-soft/40"
              } ${disabled ? "cursor-not-allowed" : ""}`}
            >
              {periodOption}
            </button>
          );
        })}
      </div>
    </div>
  );
}


function toLocalInputValue(value: string | null): string {
  const parts = extractTimestampComponents(value);
  if (!parts) {
    return "";
  }
  return toEditorDisplayTime(parts.hour, parts.minute);
}

function fromLocalInputValue(
  value: string,
  workDate: string,
  reference?: string | null,
): string | null {
  if (!value) return null;
  const parsed = parseFlexibleTimeInput(value);
  if (!parsed) {
    return null;
  }
  const { hour, minute, second } = parsed;
  const workDateMatch = workDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const referenceParts = extractTimestampComponents(reference ?? null);
  const year = workDateMatch?.[1] ?? referenceParts?.year;
  const month = workDateMatch?.[2] ?? referenceParts?.month;
  const day = workDateMatch?.[3] ?? referenceParts?.day;
  if (!year || !month || !day) {
    return null;
  }
  const offset = referenceParts?.offset ?? PAYROLL_TIMEZONE_OFFSET;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
}

function toIsoDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }

  const isoCandidate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoCandidate) {
    const year = isoCandidate[1];
    const month = isoCandidate[2];
    const day = isoCandidate[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const zoned = toTimeZoneDateString(parsed);
  return zoned;
}

function generateSessionKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return `${prefix}-${crypto.randomUUID()}`;
    } catch (error) {
      // Ignore failures and fallback to Math.random
    }
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function normalizeSessionDurations(
  minutes: number | null | undefined,
  hours: number | null | undefined,
): { minutes: number | null; hours: number | null } {
  const numericMinutes =
    typeof minutes === "number" && Number.isFinite(minutes) ? Math.max(0, minutes) : null;
  const safeMinutes = numericMinutes != null ? Math.round(numericMinutes) : null;
  const numericHours = typeof hours === "number" && Number.isFinite(hours) ? hours : null;
  const safeHours =
    numericHours != null
      ? numericHours
      : safeMinutes != null
        ? Math.round((safeMinutes / 60) * 100) / 100
        : null;

  return { minutes: safeMinutes, hours: safeHours };
}

function buildSessionRows(sessions: DaySession[]): SessionRow[] {
  return sessions.map((session, index) => {
    const { minutes, hours } = normalizeSessionDurations(session.minutes, session.hours);
    return {
      sessionKey:
        session.sessionId != null
          ? `existing-${session.sessionId}`
          : generateSessionKey(`session-${index}`),
      sessionId: session.sessionId,
      staffId: session.staffId,
      workDate: session.workDate,
      checkinTime: session.checkinTime,
      checkoutTime: session.checkoutTime,
      minutes,
      hours,
      isNew: false,
      isEditing: false,
      draftCheckin: toLocalInputValue(session.checkinTime),
      draftCheckout: toLocalInputValue(session.checkoutTime),
      validationError: null,
      feedback: null,
      pendingAction: null,
      originalCheckin: session.originalCheckinTime,
      originalCheckout: session.originalCheckoutTime,
      originalSessionId:
        typeof session.originalSessionId === "number" && Number.isFinite(session.originalSessionId)
          ? session.originalSessionId
          : null,
      replacementSessionId:
        typeof session.replacementSessionId === "number"
          && Number.isFinite(session.replacementSessionId)
          ? session.replacementSessionId
          : null,
      isHistorical: Boolean(session.isOriginalRecord),
      editedCheckin: session.editedCheckinTime ?? null,
      editedCheckout: session.editedCheckoutTime ?? null,
      editedByStaffId:
        typeof session.editedByStaffId === "number" && Number.isFinite(session.editedByStaffId)
          ? session.editedByStaffId
          : null,
      editNote: session.editNote ?? null,
      wasEdited: Boolean(session.wasEdited),
    };
  });
}

function createEmptySessionRow(staffId: number, workDate: string): SessionRow {
  return {
    sessionKey: generateSessionKey("new-session"),
    sessionId: null,
    staffId,
    workDate,
    checkinTime: null,
    checkoutTime: null,
    minutes: null,
    hours: null,
    isNew: true,
    isEditing: true,
    draftCheckin: "",
    draftCheckout: "",
    validationError: null,
    feedback: null,
    pendingAction: null,
    originalSessionId: null,
    replacementSessionId: null,
    isHistorical: false,
    editedCheckin: null,
    editedCheckout: null,
    editedByStaffId: null,
    editNote: null,
    wasEdited: false,
  };
}

function getActiveRowTimes(row: SessionRow): {
  checkinIso: string | null;
  checkoutIso: string | null;
} {
  if (row.isEditing) {
    return {
      checkinIso: fromLocalInputValue(row.draftCheckin, row.workDate, row.checkinTime),
      checkoutIso: fromLocalInputValue(row.draftCheckout, row.workDate, row.checkoutTime),
    };
  }
  return { checkinIso: row.checkinTime, checkoutIso: row.checkoutTime };
}

function computeRowMinutes(row: SessionRow): number | null {
  const { checkinIso, checkoutIso } = getActiveRowTimes(row);
  if (!checkinIso || !checkoutIso) return null;
  const start = new Date(checkinIso).getTime();
  const end = new Date(checkoutIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return Math.round((end - start) / 60000);
}

function getRowMinutesForTotals(row: SessionRow): number | null {
  if (row.isHistorical) {
    return null;
  }
  if (row.isEditing || row.pendingAction === "edit" || row.pendingAction === "create" || row.isNew) {
    return computeRowMinutes(row);
  }
  if (typeof row.minutes === "number" && Number.isFinite(row.minutes)) {
    return row.minutes;
  }
  if (typeof row.hours === "number" && Number.isFinite(row.hours)) {
    return Math.round(row.hours * 60);
  }
  return computeRowMinutes(row);
}

function sortSessionRows(rows: SessionRow[]): SessionRow[] {
  return [...rows].sort((a, b) => {
    const aTimes = getActiveRowTimes(a);
    const bTimes = getActiveRowTimes(b);
    if (!aTimes.checkinIso && !bTimes.checkinIso) return 0;
    if (!aTimes.checkinIso) return 1;
    if (!bTimes.checkinIso) return -1;
    return new Date(aTimes.checkinIso).getTime() - new Date(bTimes.checkinIso).getTime();
  });
}

function validateRowDraft(
  row: SessionRow,
  rows: SessionRow[],
  workDate: string,
): string | null {
  const { checkinIso, checkoutIso } = getActiveRowTimes(row);
  if (!checkinIso || !checkoutIso) {
    return "Completa las horas de entrada y salida.";
  }

  const checkinDate = new Date(checkinIso);
  const checkoutDate = new Date(checkoutIso);
  if (Number.isNaN(checkinDate.getTime()) || Number.isNaN(checkoutDate.getTime())) {
    return "Ingresa horas válidas.";
  }
  if (checkoutDate.getTime() <= checkinDate.getTime()) {
    return "La salida debe ser posterior a la entrada.";
  }

  const checkinDay = rowDayFormatter.format(checkinDate);
  const checkoutDay = rowDayFormatter.format(checkoutDate);
  if (checkinDay !== workDate || checkoutDay !== workDate) {
    return "La sesión debe corresponder al día seleccionado.";
  }

  for (const candidate of rows) {
    if (candidate.sessionKey === row.sessionKey) continue;
    if (candidate.isHistorical) continue;
    const { checkinIso: otherStart, checkoutIso: otherEnd } = getActiveRowTimes(candidate);
    if (!otherStart || !otherEnd) continue;
    const startMs = checkinDate.getTime();
    const endMs = checkoutDate.getTime();
    const otherStartMs = new Date(otherStart).getTime();
    const otherEndMs = new Date(otherEnd).getTime();
    if (!Number.isFinite(otherStartMs) || !Number.isFinite(otherEndMs)) {
      continue;
    }
    if (endMs > otherStartMs && startMs < otherEndMs) {
      return "Los horarios se superponen con otra sesión.";
    }
  }

  return null;
}

type Props = {
  initialMonth: string;
};

export function PayrollReportsDashboard({ initialMonth }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [matrixData, setMatrixData] = useState<MatrixResponse | null>(null);
  const [monthStatusRows, setMonthStatusRows] = useState<PayrollMonthStatusRow[]>([]);
  const [monthSummaryRows, setMonthSummaryRows] = useState<MonthSummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paidAtDrafts, setPaidAtDrafts] = useState<Record<number, string>>({});
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionRows, setSessionRows] = useState<SessionRow[]>([]);
  const [dayTotals, setDayTotals] = useState<DayTotals | null>(null);
  const [sessionEditor, setSessionEditor] = useState<SessionEditorState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionInFlight, setActionInFlight] = useState<null | "approve" | "unapprove">(
    null,
  );
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null,
  );
  const [isManagerUnlocked, setIsManagerUnlocked] = useState(false);
  const [hasValidatedPinThisSession, setHasValidatedPinThisSession] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(true);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [initialSelectionComplete, setInitialSelectionComplete] = useState(false);
  const pinRequestRef = useRef<((value: boolean) => void) | null>(null);
  const sessionRowsRef = useRef<SessionRow[]>([]);
  const sessionLoadTokenRef = useRef(0);
  const previousManagerStateRef = useRef<boolean>(isManagerUnlocked);
  const accessMode: AccessMode = isManagerUnlocked ? "management" : "read-only";

  const resolvePinRequest = useCallback((granted: boolean) => {
    const resolver = pinRequestRef.current;
    pinRequestRef.current = null;
    if (resolver) {
      resolver(granted);
    }
  }, []);

  const requestManagementPin = useCallback((): Promise<boolean> => {
    if (hasValidatedPinThisSession) {
      setIsManagerUnlocked(true);
      setInitialSelectionComplete(true);
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      pinRequestRef.current = resolve;
      setPinModalOpen(true);
    });
  }, [hasValidatedPinThisSession]);

  const resetManagementSession = useCallback(() => {
    setIsManagerUnlocked(false);
    setHasValidatedPinThisSession(false);
    setPinModalOpen(false);
    setAccessModalOpen(true);
    setInitialSelectionComplete(false);
    resolvePinRequest(false);
  }, [resolvePinRequest]);

  const ensureManagementAccess = useCallback(async (): Promise<AccessCheckResult> => {
    if (accessModalOpen) {
      setToast({ message: "Selecciona el modo de acceso para continuar.", tone: "error" });
      return "denied";
    }
    if (!isManagerUnlocked) {
      setToast({
        message: "Acceso de solo lectura activo. Cambia a modo gerencia para editar.",
        tone: "error",
      });
      return "read-only";
    }

    if (hasValidatedPinThisSession) {
      return "granted";
    }

    const granted = await requestManagementPin();
    if (granted) {
      setHasValidatedPinThisSession(true);
      setIsManagerUnlocked(true);
      return "granted";
    }

    setIsManagerUnlocked(false);
    return "denied";
  }, [
    accessModalOpen,
    hasValidatedPinThisSession,
    isManagerUnlocked,
    requestManagementPin,
    setToast,
  ]);

  const handleUnauthorized = useCallback(async (): Promise<boolean> => {
    setHasValidatedPinThisSession(false);
    setIsManagerUnlocked(false);
    return requestManagementPin();
  }, [requestManagementPin]);

  const performProtectedFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const access = await ensureManagementAccess();
      if (access !== "granted") {
        throw new Error(
          access === "read-only"
            ? "Modo solo lectura activo. Cambia a ingreso de gerencia para editar."
            : "PIN de gerencia requerido.",
        );
      }

      const requestInit: RequestInit = {
        ...init,
        credentials: init?.credentials ?? "include",
      };

      let response = await fetch(input, requestInit);
      if (response.status === 401) {
        const granted = await handleUnauthorized();
        if (!granted) {
          throw new Error("PIN de gerencia requerido.");
        }
        response = await fetch(input, requestInit);
        if (response.status === 401) {
          resetManagementSession();
          throw new Error("PIN de gerencia requerido.");
        }
      }

      return response;
    },
    [ensureManagementAccess, handleUnauthorized, resetManagementSession],
  );

  const handleAccessSelection = useCallback(
    (mode: AccessMode, options?: { fromGate?: boolean }) => {
      if (mode === "read-only") {
        setIsManagerUnlocked(false);
        setHasValidatedPinThisSession(false);
        setPinModalOpen(false);
        setInitialSelectionComplete(true);
        resolvePinRequest(false);
        if (options?.fromGate) {
          setAccessModalOpen(false);
        }
        return;
      }

      if (options?.fromGate) {
        setAccessModalOpen(false);
      }

      void (async () => {
        const granted = await requestManagementPin();
        if (granted) {
          setIsManagerUnlocked(true);
          setHasValidatedPinThisSession(true);
          setInitialSelectionComplete(true);
        } else {
          setIsManagerUnlocked(false);
          setHasValidatedPinThisSession(false);
          if (options?.fromGate) {
            setAccessModalOpen(true);
          }
        }
      })();
    },
    [requestManagementPin, resolvePinRequest],
  );

  const [staffNames, setStaffNames] = useState<Record<number, string>>({});
  const [monthStatusSaving, setMonthStatusSaving] = useState<Record<number, boolean>>({});
  const [monthStatusErrors, setMonthStatusErrors] = useState<Record<number, string | null>>({});
  const [revealedApprovedRows, setRevealedApprovedRows] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setPaidAtDrafts((previous) => {
      const next: Record<number, string> = {};
      monthStatusRows.forEach((row) => {
        const isoValue = toIsoDateOnly(row.paidAt);
        next[row.staffId] = isoValue ?? "";
      });

      const previousEntries = Object.entries(previous);
      const nextEntries = Object.entries(next);

      if (previousEntries.length === nextEntries.length) {
        const allEqual = nextEntries.every(([key, value]) => {
          const prevValue = (previous as Record<string, string>)[key] ?? "";
          return prevValue === value;
        });
        if (allEqual) {
          return previous;
        }
      }

      return next;
    });
  }, [monthStatusRows]);

  const summaryStaffNames = useMemo(() => {
    const map: Record<number, string> = {};
    for (const row of monthSummaryRows) {
      if (row.staffName) {
        map[row.staffId] = row.staffName;
      }
    }
    return map;
  }, [monthSummaryRows]);

  const matrixContainerRef = useRef<HTMLDivElement | null>(null);
  const [cellWidth, setCellWidth] = useState<number>(48);

  const hoursFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-EC", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const dayHeaderFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        day: "2-digit",
        month: "short",
        timeZone: PAYROLL_TIMEZONE,
      }),
    [],
  );

  const weekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        weekday: "short",
        timeZone: PAYROLL_TIMEZONE,
      }),
    [],
  );

  const humanDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
        timeZone: PAYROLL_TIMEZONE,
      }),
    [],
  );

  const paidDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        timeZone: PAYROLL_TIMEZONE,
      }),
    [],
  );

  const resolveStaffName = useCallback(
    (row: { staffId: number; staffName?: string | null }) =>
      row.staffName
      ?? summaryStaffNames[row.staffId]
      ?? staffNames[row.staffId]
      ?? `Personal #${row.staffId}`,
    [staffNames, summaryStaffNames],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadStaffDirectory() {
      try {
        const response = await fetch("/api/staff-members", createNoStoreInit());
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const message = (body as { error?: string }).error ?? "No pudimos cargar el personal.";
          throw new Error(message);
        }
        const staff = (await response.json()) as { id: number; fullName: string }[];
        if (cancelled) return;
        const map: Record<number, string> = {};
        for (const entry of staff) {
          if (typeof entry.id === "number" && entry.id > 0 && typeof entry.fullName === "string") {
            map[entry.id] = entry.fullName;
          }
        }
        setStaffNames(map);
      } catch (error) {
        console.error("No se pudieron cargar los nombres del personal", error);
      }
    }

    void loadStaffDirectory();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCell) return;
    const resolvedName = staffNames[selectedCell.staffId];
    if (!resolvedName || resolvedName === selectedCell.staffName) return;
    setSelectedCell((previous) => {
      if (!previous || previous.staffId !== selectedCell.staffId) return previous;
      return { ...previous, staffName: resolvedName };
    });
  }, [selectedCell, staffNames]);

  const monthRange = useMemo(() => {
    try {
      return getMonthRange(selectedMonth);
    } catch (error) {
      console.error("Mes inválido seleccionado", error);
      return { from: selectedMonth, to: selectedMonth, endExclusive: selectedMonth };
    }
  }, [selectedMonth]);

  const { from, to } = monthRange;

  const activeRange = useMemo(() => {
    const trimmedStart = customStartDate.trim();
    const trimmedEnd = customEndDate.trim();

    const startIso = trimmedStart.length ? toIsoDateOnly(trimmedStart) : null;
    const endIso = trimmedEnd.length ? toIsoDateOnly(trimmedEnd) : null;

    if (trimmedStart.length && !startIso) {
      return {
        start: from,
        end: to,
        usingCustom: false as const,
        error: "La fecha inicial es inválida.",
        hint: null,
      };
    }

    if (trimmedEnd.length && !endIso) {
      return {
        start: from,
        end: to,
        usingCustom: false as const,
        error: "La fecha final es inválida.",
        hint: null,
      };
    }

    if (startIso && !endIso) {
      return {
        start: from,
        end: to,
        usingCustom: false as const,
        error: null,
        hint: "Ingresa también la fecha final para activar el rango manual.",
      };
    }

    if (!startIso && endIso) {
      return {
        start: from,
        end: to,
        usingCustom: false as const,
        error: null,
        hint: "Ingresa también la fecha inicial para activar el rango manual.",
      };
    }

    if (startIso && endIso) {
      if (startIso > endIso) {
        return {
          start: from,
          end: to,
          usingCustom: false as const,
          error: "La fecha inicial debe ser anterior o igual a la final.",
          hint: null,
        };
      }
      return {
        start: startIso,
        end: endIso,
        usingCustom: true as const,
        error: null,
        hint: "Mostrando rango personalizado.",
      };
    }

    return {
      start: from,
      end: to,
      usingCustom: false as const,
      error: null,
      hint: null,
    };
  }, [customEndDate, customStartDate, from, to]);

  const activeStart = activeRange.start;
  const activeEnd = activeRange.end;
  const usingCustomRange = activeRange.usingCustom;
  const rangeError = activeRange.error;
  const rangeHint = activeRange.hint;
  const rangeStatusText =
    rangeError
      ?? rangeHint
      ?? (usingCustomRange
        ? "Mostrando sólo los días dentro del rango personalizado."
        : "El mes seleccionado define el rango cuando no hay fechas manuales.");

  const fetchMatrixData = useCallback(async (): Promise<MatrixResponse> => {
    const params = new URLSearchParams();
    if (selectedMonth) {
      params.set("month", selectedMonth);
    }
    if (activeStart) {
      params.set("start", activeStart);
    }
    if (activeEnd) {
      params.set("end", activeEnd);
    }
    if (usingCustomRange) {
      params.set("rangeSource", "custom");
    }

    const response = await fetch(
      `/api/payroll/reports/matrix?${params.toString()}`,
      createNoStoreInit(),
    );
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        (body as { error?: string } | null)?.error ?? "Error al obtener la matriz.";
      throw new Error(message);
    }
    const matrix = (body as MatrixResponse | null) ?? { days: [], rows: [] };
    return {
      ...matrix,
      rows: Array.isArray(matrix.rows)
        ? [...matrix.rows].sort((a, b) => a.staffId - b.staffId)
        : [],
    };
  }, [activeEnd, activeStart, selectedMonth, usingCustomRange]);

  const fetchMonthStatusData = useCallback(
    async (staffId?: number): Promise<PayrollMonthStatusRow[]> => {
      const staffQuery =
        staffId != null ? `&staffId=${encodeURIComponent(String(staffId))}` : "";
      const response = await fetch(
        `/api/payroll/reports/month-status?month=${encodeURIComponent(selectedMonth)}${staffQuery}`,
        createNoStoreInit(),
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          (body as { error?: string } | null)?.error ?? "Error al obtener el estado del mes.";
        throw new Error(message);
      }

      const rows = (body as { rows?: PayrollMonthStatusRow[] } | null)?.rows ?? [];
      return [...rows].sort((a, b) => a.staffId - b.staffId);
    },
    [selectedMonth],
  );

  const fetchMonthSummaryData = useCallback(async (): Promise<MonthSummaryRow[]> => {
    const response = await fetch(
      `/api/payroll/reports/month-summary?month=${encodeURIComponent(selectedMonth)}`,
      createNoStoreInit(),
    );
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        (body as { error?: string } | null)?.error
        ?? "Error al obtener el resumen mensual.";
      throw new Error(message);
    }

    const rows = (body as { rows?: RawMonthSummaryRow[] } | null)?.rows ?? [];

    return rows
      .map((row) => {
        const staffIdRaw = row.staff_id ?? row.staffId;
        const staffId = Number(staffIdRaw);
        if (!Number.isFinite(staffId) || staffId <= 0) {
          return null;
        }

        const staffNameValue =
          typeof row.staff_name === "string"
            ? row.staff_name
            : typeof row.staffName === "string"
              ? row.staffName
              : null;

        const monthValue =
          typeof row.month === "string" && row.month.length
            ? row.month
            : `${selectedMonth}-01`;

        const approvedAmountValue = row.approved_amount ?? row.approvedAmount ?? null;
        const amountPaidValue = row.amount_paid ?? row.amountPaid ?? null;
        const paidAtValue = row.paid_at ?? row.paidAt ?? null;

        const referenceValue =
          typeof row.reference === "string" && row.reference.trim().length
            ? row.reference.trim()
            : null;

        const paidValue =
          typeof row.paid === "boolean"
            ? row.paid
            : row.paid != null
              ? Boolean(row.paid)
              : null;

        return {
          staffId,
          staffName: staffNameValue,
          month: monthValue,
          approvedAmount: toNumeric(approvedAmountValue),
          paid: paidValue,
          amountPaid: toNumeric(amountPaidValue),
          paidAt:
            typeof paidAtValue === "string" && paidAtValue.trim().length > 0
              ? paidAtValue
              : null,
          reference: referenceValue,
        } satisfies MonthSummaryRow;
      })
      .filter((row): row is MonthSummaryRow => row != null)
      .sort((a, b) => a.staffId - b.staffId);
  }, [selectedMonth]);

  const refreshData = useCallback(async () => {
    if (rangeError) {
      setError(rangeError);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setMonthStatusErrors({});
    setMonthStatusSaving({});
    try {
      const [matrixJson, monthStatusList, monthSummaryList] = await Promise.all([
        fetchMatrixData(),
        fetchMonthStatusData(),
        fetchMonthSummaryData(),
      ]);
      setMatrixData(matrixJson);
      setMonthStatusRows(monthStatusList);
      setMonthSummaryRows(monthSummaryList);
    } catch (err) {
      console.error("No se pudo refrescar la información de nómina", err);
      const message = err instanceof Error ? err.message : "No pudimos cargar la información.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [
    fetchMatrixData,
    fetchMonthStatusData,
    fetchMonthSummaryData,
    rangeError,
  ]);

  const refreshMatrixOnly = useCallback(async () => {
    const matrixJson = await fetchMatrixData();
    setMatrixData(matrixJson);
  }, [fetchMatrixData]);

  const refreshMonthStatusForStaff = useCallback(
    async (staffId: number) => {
      const rows = await fetchMonthStatusData(staffId);
      setMonthStatusRows((previous) => {
        const withoutStaff = previous.filter((row) => row.staffId !== staffId);
        const merged = [...withoutStaff, ...rows];
        merged.sort((a, b) => a.staffId - b.staffId);
        return merged;
      });
    },
    [fetchMonthStatusData],
  );

  const refreshMonthSummary = useCallback(async () => {
    const rows = await fetchMonthSummaryData();
    setMonthSummaryRows(rows);
  }, [fetchMonthSummaryData]);

  const updateMonthStatus = useCallback(
    async (
      staffId: number,
      currentRow: PayrollMonthStatusRow | undefined,
      updates: { paid?: boolean; paidAt?: string | null },
    ) => {
      const monthValue = currentRow?.month ?? `${selectedMonth}-01`;
      const nextPaid = updates.paid ?? currentRow?.paid ?? false;
      const currentPaidAtInput = currentRow?.paidAt
        ? toIsoDateOnly(currentRow.paidAt)
        : null;
      const nextPaidAtInput =
        updates.paidAt !== undefined ? updates.paidAt : currentPaidAtInput;

      setMonthStatusSaving((previous) => ({ ...previous, [staffId]: true }));
      setMonthStatusErrors((previous) => ({ ...previous, [staffId]: null }));

      try {
        const response = await fetch("/api/payroll/reports/month-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId,
            month: monthValue,
            paid: nextPaid,
            paidAt: nextPaid ? nextPaidAtInput : null,
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            (body as { error?: string }).error
              ?? "No pudimos actualizar el estado del mes.",
          );
        }

        await refreshMonthStatusForStaff(staffId);
        setMonthStatusErrors((previous) => ({ ...previous, [staffId]: null }));
      } catch (error) {
        console.error("No se pudo actualizar el estado mensual", error);
        const message =
          error instanceof Error
            ? error.message
            : "No pudimos actualizar el estado del mes.";
        setMonthStatusErrors((previous) => ({ ...previous, [staffId]: message }));
      } finally {
        setMonthStatusSaving((previous) => {
          const next = { ...previous };
          delete next[staffId];
          return next;
        });
      }
    },
    [refreshMonthStatusForStaff, selectedMonth],
  );

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!isManagerUnlocked && previousManagerStateRef.current) {
      setRevealedApprovedRows({});
    }
    previousManagerStateRef.current = isManagerUnlocked;
  }, [isManagerUnlocked]);

  useEffect(() => {
    if (!monthSummaryRows.length) {
      setRevealedApprovedRows({});
      return;
    }
    setRevealedApprovedRows((previous) => {
      const allowed = new Set(monthSummaryRows.map((row) => row.staffId));
      const next: Record<number, boolean> = {};
      allowed.forEach((staffId) => {
        if (previous[staffId]) {
          next[staffId] = true;
        }
      });
      return next;
    });
  }, [monthSummaryRows]);

  const openModal = useCallback(
    (row: MatrixRow, cell: MatrixCell) => {
      setSelectedCell({
        staffId: row.staffId,
        staffName: resolveStaffName(row),
        workDate: cell.date,
        hours: cell.approved && cell.approvedHours != null ? cell.approvedHours : cell.hours,
        approvedHours: cell.approvedHours,
        approved: cell.approved,
      });
      setSessionsLoading(true);
      setSessionsError(null);
      setSessionRows([]);
      setDayTotals(null);
      setActionError(null);
    },
    [resolveStaffName],
  );

  const closeModal = useCallback(() => {
    setSelectedCell(null);
    setSessionsLoading(false);
    setSessionRows([]);
    setSessionsError(null);
    setDayTotals(null);
    setActionError(null);
    setActionLoading(false);
    setActionInFlight(null);
    setPinModalOpen(false);
    resolvePinRequest(false);
  }, [resolvePinRequest, setActionInFlight]);

  const loadSessionsFor = useCallback(
    async (
      target: { staffId: number; workDate: string },
      options?: { silent?: boolean },
    ): Promise<boolean> => {
      const requestId = ++sessionLoadTokenRef.current;
      const silent = Boolean(options?.silent);
      if (!silent) {
        setSessionsLoading(true);
        setSessionsError(null);
        setDayTotals(null);
      }

      try {
        const [sessionsResponse, totalsResponse] = await Promise.all([
          fetch(
            `/api/payroll/day-sessions?staff_id=${target.staffId}&date=${target.workDate}`,
            createNoStoreInit(),
          ),
          fetch(
            `/api/payroll/day-totals?staff_id=${target.staffId}&date=${target.workDate}`,
            createNoStoreInit(),
          ),
        ]);

        if (!sessionsResponse.ok) {
          const body = await sessionsResponse.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? "No se pudieron cargar las sesiones.");
        }

        if (!totalsResponse.ok) {
          const body = await totalsResponse.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? "No se pudieron cargar los totales del día.");
        }

        const [sessionsJson, totalsJson] = await Promise.all([
          sessionsResponse.json().catch(() => ({})),
          totalsResponse.json().catch(() => ({})),
        ]);

        const data = (sessionsJson as { sessions?: DaySession[] }).sessions ?? [];
        const totalsPayload = normalizeTotalsPayload((totalsJson as { totals?: unknown }).totals);
        if (sessionLoadTokenRef.current === requestId) {
          setSessionRows(sortSessionRows(buildSessionRows(data)));
          setDayTotals(totalsPayload);
          setSessionsError(null);
        }
        return true;
      } catch (error) {
        console.error("No se pudieron cargar las sesiones del día", error);
        const message =
          error instanceof Error ? error.message : "No se pudieron cargar las sesiones del día.";
        if (sessionLoadTokenRef.current === requestId) {
          setSessionsError((previous) => (silent ? previous ?? message : message));
          if (!silent) {
            setDayTotals(null);
          }
        }
        return false;
      } finally {
        if (sessionLoadTokenRef.current === requestId && !silent) {
          setSessionsLoading(false);
        }
      }
    },
    [],
  );

  const reloadSessions = useCallback(
    async (options?: { silent?: boolean }): Promise<boolean> => {
      if (!selectedCell) return false;
      return loadSessionsFor({ staffId: selectedCell.staffId, workDate: selectedCell.workDate }, options);
    },
    [loadSessionsFor, selectedCell],
  );

  useEffect(() => {
    if (!selectedCell) {
      return () => {
        sessionLoadTokenRef.current += 1;
      };
    }

    void loadSessionsFor({ staffId: selectedCell.staffId, workDate: selectedCell.workDate });

    return () => {
      sessionLoadTokenRef.current += 1;
    };
  }, [loadSessionsFor, selectedCell]);

  const handleDraftChange = useCallback(
    (sessionKey: string, field: "checkin" | "checkout", value: string) => {
      setSessionRows((previous) => {
        const updated = previous.map((row) => {
          if (row.sessionKey !== sessionKey) return row;
          return {
            ...row,
            draftCheckin: field === "checkin" ? value : row.draftCheckin,
            draftCheckout: field === "checkout" ? value : row.draftCheckout,
            feedback: null,
          };
        });

        return updated.map((row) => {
          if (row.sessionKey !== sessionKey) return row;
          return {
            ...row,
            validationError: validateRowDraft(row, updated, row.workDate),
          };
        });
      });
    },
    [],
  );

  const handleDraftBlur = useCallback(
    (sessionKey: string, field: "checkin" | "checkout") => {
      setSessionRows((previous) => {
        const updated = previous.map((row) => {
          if (row.sessionKey !== sessionKey) return row;
          const rawValue = field === "checkin" ? row.draftCheckin : row.draftCheckout;
          const normalizedValue = normalizeEditorTime(rawValue);
          return {
            ...row,
            draftCheckin: field === "checkin" ? normalizedValue : row.draftCheckin,
            draftCheckout: field === "checkout" ? normalizedValue : row.draftCheckout,
            feedback: null,
          };
        });

        return updated.map((row) => {
          if (row.sessionKey !== sessionKey) return row;
          return {
            ...row,
            validationError: validateRowDraft(row, updated, row.workDate),
          };
        });
      });
    },
    [],
  );

  const addBlankSession = useCallback(async () => {
    if (!selectedCell) return;
    const access = await ensureManagementAccess();
    if (access !== "granted") {
      return;
    }
    const emptyRow = createEmptySessionRow(selectedCell.staffId, selectedCell.workDate);
    setSessionRows((previous) => sortSessionRows([...previous, emptyRow]));
    setSessionEditor({ sessionKey: emptyRow.sessionKey });
  }, [ensureManagementAccess, selectedCell]);

  const enableRowEditing = useCallback(
    async (sessionKey: string) => {
      const access = await ensureManagementAccess();
      if (access !== "granted") return false;
      const currentRows = sessionRowsRef.current;
      const targetRow = currentRows.find((row) => row.sessionKey === sessionKey);
      if (!targetRow || targetRow.isHistorical) {
        return false;
      }
      setSessionRows((previous) => {
        const updated = previous.map((row) => {
          if (row.sessionKey !== sessionKey) return row;
          const draftCheckin = toLocalInputValue(row.checkinTime);
          const draftCheckout = toLocalInputValue(row.checkoutTime);
          const candidate = {
            ...row,
            isEditing: true,
            draftCheckin,
            draftCheckout,
            feedback: null,
          };
          return {
            ...candidate,
            validationError: validateRowDraft(candidate, previous, row.workDate),
          };
        });
        return sortSessionRows(updated);
      });
      return true;
    },
    [ensureManagementAccess],
  );

  const saveRowChanges = useCallback(
    async (sessionKey: string) => {
      if (!selectedCell) return false;
      const rows = sessionRowsRef.current;
      const target = rows.find((row) => row.sessionKey === sessionKey);
      if (!target) return false;
      const previousSessionId = target.sessionId;

      const validation = validateRowDraft(target, rows, target.workDate);
      if (validation) {
        setSessionRows((previous) =>
          previous.map((row) =>
            row.sessionKey === sessionKey
              ? { ...row, validationError: validation }
              : row,
          ),
        );
        return false;
      }

      const { checkinIso, checkoutIso } = getActiveRowTimes(target);
      if (!checkinIso || !checkoutIso) {
        return false;
      }

      setSessionRows((previous) =>
        previous.map((row) =>
          row.sessionKey === sessionKey
            ? {
                ...row,
                pendingAction: row.isNew ? "create" : "edit",
                feedback: null,
              }
            : row,
        ),
      );

      try {
        const response = await (async () => {
          if (target.isNew) {
            const checkinSegments = toTimeSegments(target.draftCheckin);
            const checkoutSegments = toTimeSegments(target.draftCheckout);

            if (!checkinSegments.hour || !checkoutSegments.hour) {
              throw new Error("Completa las horas de entrada y salida.");
            }

            return performProtectedFetch("/api/payroll/session/add", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                staffId: selectedCell.staffId,
                workDate: selectedCell.workDate,
                inHour: checkinSegments.hour,
                inMinute: checkinSegments.minute,
                inAmPm: checkinSegments.period,
                outHour: checkoutSegments.hour,
                outMinute: checkoutSegments.minute,
                outAmPm: checkoutSegments.period,
                note: target.editNote ?? null,
              }),
            });
          }

          return performProtectedFetch(`/api/payroll/reports/day-sessions/${target.sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              staffId: selectedCell.staffId,
              workDate: selectedCell.workDate,
              checkinTime: checkinIso,
              checkoutTime: checkoutIso,
              note: target.editNote ?? null,
            }),
          });
        })();
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = (payload as { error?: string }).error ?? "No se pudo guardar la sesión.";
          throw new Error(message);
        }

        const saved = (payload as { session?: DaySession }).session;
        if (!saved) {
          throw new Error("No se recibió la sesión actualizada.");
        }

        setSessionRows((previous) =>
          sortSessionRows(
            previous.map((row) =>
              row.sessionKey === sessionKey
                ? {
                    ...row,
                    sessionId: saved.sessionId,
                    staffId: saved.staffId,
                    workDate: saved.workDate,
                    checkinTime: saved.checkinTime,
                    checkoutTime: saved.checkoutTime,
                    ...normalizeSessionDurations(saved.minutes, saved.hours),
                    draftCheckin: toLocalInputValue(saved.checkinTime),
                    draftCheckout: toLocalInputValue(saved.checkoutTime),
                    originalCheckin:
                      saved.originalCheckinTime
                        ?? row.originalCheckin
                        ?? (row.checkinTime && row.checkinTime !== saved.checkinTime
                          ? row.checkinTime
                          : null),
                    originalCheckout:
                      saved.originalCheckoutTime
                        ?? row.originalCheckout
                        ?? (row.checkoutTime && row.checkoutTime !== saved.checkoutTime
                          ? row.checkoutTime
                          : null),
                    originalSessionId:
                      saved.originalSessionId
                        ?? row.originalSessionId
                        ?? (previousSessionId != null ? previousSessionId : null),
                    replacementSessionId:
                      saved.replacementSessionId
                        ?? row.replacementSessionId
                        ?? null,
                    isHistorical: Boolean(saved.isOriginalRecord),
                    editedCheckin:
                      saved.editedCheckinTime ?? row.editedCheckin ?? saved.checkinTime ?? row.checkinTime ?? null,
                    editedCheckout:
                      saved.editedCheckoutTime
                        ?? row.editedCheckout
                        ?? saved.checkoutTime
                        ?? row.checkoutTime
                        ?? null,
                    editedByStaffId:
                      typeof saved.editedByStaffId === "number"
                        ? saved.editedByStaffId
                        : row.editedByStaffId ?? null,
                    editNote: saved.editNote ?? row.editNote ?? null,
                    wasEdited: saved.wasEdited ?? row.wasEdited ?? false,
                    isNew: false,
                    isEditing: false,
                    validationError: null,
                    feedback: null,
                    pendingAction: null,
                  }
                : row,
            ),
          ),
        );
        await reloadSessions({ silent: true });
        await refreshMatrixOnly();
        await refreshMonthStatusForStaff(selectedCell.staffId);
        await refreshMonthSummary();
        setToast({ message: "Cambios guardados", tone: "success" });
        return true;
      } catch (error) {
        console.error("No se pudo guardar la sesión", error);
        const message =
          error instanceof Error ? error.message : "No se pudo guardar la sesión.";
        setSessionRows((previous) =>
          previous.map((row) =>
            row.sessionKey === sessionKey
              ? { ...row, feedback: message, pendingAction: null }
              : row,
          ),
        );
        setToast({ message: "No se pudo guardar", tone: "error" });
        return false;
      }
    },
    [
      performProtectedFetch,
      refreshMatrixOnly,
      refreshMonthStatusForStaff,
      refreshMonthSummary,
      reloadSessions,
      selectedCell,
    ],
  );

  const handleEditClick = useCallback(
    async (sessionKey: string) => {
      const rows = sessionRowsRef.current;
      const target = rows.find((row) => row.sessionKey === sessionKey);
      if (!target || target.pendingAction || target.isHistorical) {
        return;
      }
      const ready = await enableRowEditing(sessionKey);
      if (!ready) {
        return;
      }
      setSessionEditor({ sessionKey });
    },
    [enableRowEditing],
  );

  const handleDeleteClick = useCallback(
    async (sessionKey: string) => {
      const rows = sessionRowsRef.current;
      const target = rows.find((row) => row.sessionKey === sessionKey);
      if (!target || target.pendingAction || target.isHistorical) {
        return;
      }

      const confirmed = window.confirm("¿Eliminar esta sesión? Esta acción no se puede deshacer.");
      if (!confirmed) {
        return;
      }

      const access = await ensureManagementAccess();
      if (access !== "granted") return;

      if (target.sessionId == null) {
        setSessionRows((previous) => previous.filter((row) => row.sessionKey !== sessionKey));
        setSessionEditor((previous) =>
          previous?.sessionKey === sessionKey ? null : previous,
        );
        setToast({ message: "Cambios guardados", tone: "success" });
        return;
      }

      setSessionRows((previous) =>
        previous.map((row) =>
          row.sessionKey === sessionKey
            ? { ...row, pendingAction: "delete", feedback: null }
            : row,
        ),
      );

      try {
        const response = await performProtectedFetch(
          `/api/payroll/reports/day-sessions/${target.sessionId}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              staffId: target.staffId,
              workDate: target.workDate,
            }),
          },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = (payload as { error?: string }).error ?? "No se pudo eliminar la sesión.";
          throw new Error(message);
        }

        setSessionRows((previous) => previous.filter((row) => row.sessionKey !== sessionKey));
        setSessionEditor((previous) =>
          previous?.sessionKey === sessionKey ? null : previous,
        );
        await reloadSessions({ silent: true });
        await refreshMatrixOnly();
        await refreshMonthStatusForStaff(target.staffId);
        await refreshMonthSummary();
        setToast({ message: "Cambios guardados", tone: "success" });
      } catch (error) {
        console.error("No se pudo eliminar la sesión", error);
        const message =
          error instanceof Error ? error.message : "No se pudo eliminar la sesión.";
        setSessionRows((previous) =>
          previous.map((row) =>
            row.sessionKey === sessionKey
              ? { ...row, feedback: message, pendingAction: null }
              : row,
          ),
        );
        setToast({ message: "No se pudo guardar", tone: "error" });
      }
    },
    [
      ensureManagementAccess,
      performProtectedFetch,
      reloadSessions,
      refreshMatrixOnly,
      refreshMonthStatusForStaff,
      refreshMonthSummary,
    ],
  );

  const cancelRowEditing = useCallback((sessionKey: string) => {
    setSessionRows((previous) =>
      previous.map((row) => {
        if (row.sessionKey !== sessionKey) return row;
        return {
          ...row,
          isEditing: false,
          draftCheckin: toLocalInputValue(row.checkinTime),
          draftCheckout: toLocalInputValue(row.checkoutTime),
          validationError: null,
          feedback: null,
          pendingAction: null,
        };
      }),
    );
  }, []);

  const closeSessionEditor = useCallback(
    (options?: { discardChanges?: boolean }) => {
      setSessionEditor((current) => {
        if (!current) {
          return null;
        }
        if (options?.discardChanges) {
          cancelRowEditing(current.sessionKey);
        }
        return null;
      });
    },
    [cancelRowEditing],
  );

  const activeEditorRow = useMemo(() => {
    if (!sessionEditor) {
      return null;
    }
    const row = sessionRows.find((candidate) => candidate.sessionKey === sessionEditor.sessionKey);
    if (!row || !row.isEditing) {
      return null;
    }
    return row;
  }, [sessionEditor, sessionRows]);

  const editorPending =
    activeEditorRow?.pendingAction === "edit" || activeEditorRow?.pendingAction === "create";

  const submitSessionEditor = useCallback(async () => {
    if (!sessionEditor || editorPending) return;
    const success = await saveRowChanges(sessionEditor.sessionKey);
    if (success) {
      setSessionEditor(null);
    }
  }, [editorPending, saveRowChanges, sessionEditor]);

  const recalculateCellWidth = useCallback((containerWidth: number, daysCount: number) => {
    if (!daysCount) return;
    const available =
      containerWidth - STAFF_COLUMN_WIDTH - TRAILING_COLUMNS_WIDTH - GRID_PADDING;
    const computed = available > 0 ? Math.floor(available / daysCount) : MIN_CELL_WIDTH;
    const desired = Math.min(PREFERRED_CELL_WIDTH, computed);
    setCellWidth(Math.max(MIN_CELL_WIDTH, desired));
  }, []);

  const handleApprove = useCallback(async () => {
    if (!selectedCell) return;
    setActionLoading(true);
    setActionInFlight("approve");
    setActionError(null);
    try {
      const response = await performProtectedFetch("/api/payroll/reports/approve-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedCell.staffId,
          workDate: selectedCell.workDate,
          approved: true,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((body as { error?: string }).error ?? "No pudimos aprobar el día.");
      }
      await refreshMatrixOnly();
      await refreshMonthStatusForStaff(selectedCell.staffId);
      await refreshMonthSummary();
      setToast({ message: "Cambios guardados", tone: "success" });
      closeModal();
    } catch (err) {
      console.error("No se pudo aprobar el día", err);
      const message = err instanceof Error ? err.message : "No pudimos aprobar el día.";
      setActionError(message);
      setToast({ message: "No se pudo guardar", tone: "error" });
    } finally {
      setActionLoading(false);
      setActionInFlight(null);
    }
  }, [
    closeModal,
    performProtectedFetch,
    refreshMatrixOnly,
    refreshMonthStatusForStaff,
    refreshMonthSummary,
    selectedCell,
    setActionInFlight,
  ]);

  const handleUnapprove = useCallback(async () => {
    if (!selectedCell) return;
    setActionLoading(true);
    setActionInFlight("unapprove");
    setActionError(null);
    try {
      const response = await performProtectedFetch("/api/payroll/reports/approve-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedCell.staffId,
          workDate: selectedCell.workDate,
          approved: false,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((body as { error?: string }).error ?? "No pudimos revertir la aprobación.");
      }
      await refreshMatrixOnly();
      await refreshMonthStatusForStaff(selectedCell.staffId);
      await refreshMonthSummary();
      setToast({ message: "Aprobación revocada", tone: "success" });
      closeModal();
    } catch (err) {
      console.error("No se pudo revertir la aprobación del día", err);
      const message =
        err instanceof Error ? err.message : "No pudimos revertir la aprobación del día.";
      setActionError(message);
      setToast({ message: "No se pudo guardar", tone: "error" });
    } finally {
      setActionLoading(false);
      setActionInFlight(null);
    }
  }, [
    closeModal,
    performProtectedFetch,
    refreshMatrixOnly,
    refreshMonthStatusForStaff,
    refreshMonthSummary,
    selectedCell,
    setActionInFlight,
  ]);

  useEffect(() => {
    const element = matrixContainerRef.current;
    if (!element) return;

    const daysCount = matrixData?.days.length ?? 0;
    if (daysCount > 0) {
      recalculateCellWidth(element.getBoundingClientRect().width, daysCount);
    }

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (!width) continue;
        const days = matrixData?.days.length ?? 0;
        if (!days) continue;
        recalculateCellWidth(width, days);
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [matrixData?.days.length, recalculateCellWidth]);

  const monthStatusByStaff = useMemo(() => {
    const map = new Map<number, PayrollMonthStatusRow>();
    for (const row of monthStatusRows) {
      map.set(row.staffId, row);
    }
    return map;
  }, [monthStatusRows]);

  const monthSummaryByStaff = useMemo(() => {
    const map = new Map<number, MonthSummaryRow>();
    for (const row of monthSummaryRows) {
      map.set(row.staffId, row);
    }
    return map;
  }, [monthSummaryRows]);

  useEffect(() => {
    sessionRowsRef.current = sessionRows;
  }, [sessionRows]);

  const matrixDays = matrixData?.days ?? [];
  const effectiveCellWidth = Math.max(MIN_CELL_WIDTH, Math.floor(cellWidth));
  const cellVariant = useMemo(() => {
    if (effectiveCellWidth >= 64) return "relaxed" as const;
    if (effectiveCellWidth >= 52) return "comfortable" as const;
    if (effectiveCellWidth >= 44) return "compact" as const;
    return "tight" as const;
  }, [effectiveCellWidth]);
  const cellVisual = useMemo(() => {
    switch (cellVariant) {
      case "relaxed":
        return { height: "h-12", padding: "px-3 py-2", font: "text-sm" } as const;
      case "comfortable":
        return { height: "h-11", padding: "px-2.5 py-1.5", font: "text-[13px]" } as const;
      case "compact":
        return { height: "h-10", padding: "px-2 py-1.5", font: "text-xs" } as const;
      default:
        return { height: "h-9", padding: "px-1.5 py-1", font: "text-[11px]" } as const;
    }
  }, [cellVariant]);
  const compactCellText = cellVariant === "tight";
  const staffCount = matrixData?.rows.length ?? 0;

  const computedMinutes = useMemo(
    () =>
      sessionRows.reduce((accumulator, row) => {
        const minutes = getRowMinutesForTotals(row);
        return minutes != null ? accumulator + minutes : accumulator;
      }, 0),
    [sessionRows],
  );

  const computedHours = useMemo(
    () => Math.round((computedMinutes / 60) * 100) / 100,
    [computedMinutes],
  );

  const effectiveTotals = useMemo(() => {
    if (dayTotals) {
      return dayTotals;
    }
    return { totalMinutes: computedMinutes, totalHours: computedHours };
  }, [computedHours, computedMinutes, dayTotals]);

  const totalMinutes = effectiveTotals.totalMinutes;
  const totalHours = effectiveTotals.totalHours;

  useEffect(() => {
    if (!selectedCell || sessionsLoading) return;
    setSelectedCell((previous) => {
      if (!previous) return previous;
      if (Math.abs(previous.hours - totalHours) < 0.01) {
        return previous;
      }
      return { ...previous, hours: totalHours };
    });
  }, [selectedCell, sessionsLoading, totalHours]);

  useEffect(() => {
    if (!selectedCell) {
      setSessionEditor(null);
    }
  }, [selectedCell]);

  const displayHours = sessionsLoading
    ? selectedCell?.hours ?? totalHours
    : totalHours;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-20 h-72 w-72 -rotate-[18deg] rounded-[38px] bg-[#ffe6d2] opacity-70" />
        <div className="absolute right-0 top-6 h-60 w-60 rotate-[10deg] rounded-[34px] bg-[#dff8f2] opacity-80" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[120%] -translate-x-1/2 rounded-t-[180px] bg-gradient-to-r from-[#ffeede] via-white to-[#c9f5ed]" />
      </div>

      <main className="relative mx-auto flex w-full max-w-[2000px] flex-1 flex-col gap-10 px-4 py-12 sm:px-6 md:px-10 lg:px-12">
        {toast ? (
          <EphemeralToast
            message={toast.message}
            tone={toast.tone}
            onDismiss={() => setToast(null)}
          />
        ) : null}
        <header className="flex flex-col gap-5 rounded-[28px] border border-white/70 bg-white/92 px-6 py-6 shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-deep-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-deep">
              Control de nómina
            </span>
            <Link
              href="/administracion"
              className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/40 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
            >
              Volver a panel
            </Link>
          </div>
          <div className="flex flex-col gap-2 text-brand-deep">
            <h1 className="text-3xl font-black sm:text-4xl">Reportes de nómina</h1>
            <p className="max-w-3xl text-sm text-brand-ink-muted sm:text-base">
              Visualiza las horas trabajadas por el equipo, aprueba los días registrados y lleva un seguimiento de los pagos por mes.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-3 text-sm font-medium text-brand-deep">
                <span>Mes de trabajo</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => {
                    setSelectedMonth(event.target.value);
                  }}
                  className="rounded-full border border-brand-ink-muted/20 bg-white px-4 py-1.5 text-sm font-semibold text-brand-deep shadow focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                />
              </label>
              <button
                type="button"
                onClick={() => void refreshData()}
                className="inline-flex items-center justify-center rounded-full border border-brand-teal-soft bg-brand-teal-soft/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              >
                Refrescar datos
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-brand-ink-muted sm:text-sm">
              <label className="flex items-center gap-2">
                <span>Desde</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(event) => setCustomStartDate(event.target.value)}
                  className="rounded-full border border-brand-ink-muted/20 bg-white px-3 py-1 text-xs font-semibold text-brand-deep shadow focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] sm:text-sm"
                />
              </label>
              <label className="flex items-center gap-2">
                <span>Hasta</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(event) => setCustomEndDate(event.target.value)}
                  className="rounded-full border border-brand-ink-muted/20 bg-white px-3 py-1 text-xs font-semibold text-brand-deep shadow focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] sm:text-sm"
                />
              </label>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold sm:text-sm ${
                  usingCustomRange
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-600"
                    : "border border-brand-deep-soft/30 bg-brand-deep-soft/20 text-brand-ink-muted"
                }`}
              >
                {usingCustomRange ? "Rango manual activo" : "Usando mes completo"}
              </span>
              {customStartDate || customEndDate ? (
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                  className="inline-flex items-center rounded-full border border-brand-ink-muted/20 px-3 py-1 text-xs font-semibold text-brand-ink-muted shadow-sm transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/30 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] sm:text-sm"
                >
                  Limpiar rango
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-brand-deep sm:text-sm">
              <span className="text-brand-ink-muted">Modo de acceso</span>
              <div className="inline-flex overflow-hidden rounded-full border border-brand-ink-muted/30 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => handleAccessSelection("read-only")}
                  aria-pressed={accessMode === "read-only"}
                  className={`px-3 py-1 text-[11px] uppercase tracking-wide transition sm:text-xs ${
                    accessMode === "read-only"
                      ? "bg-brand-deep-soft/30 text-brand-deep"
                      : "text-brand-ink-muted hover:bg-brand-deep-soft/20"
                  }`}
                >
                  Solo lectura
                </button>
                <button
                  type="button"
                  onClick={() => handleAccessSelection("management")}
                  aria-pressed={accessMode === "management"}
                  className={`border-l border-brand-ink-muted/20 px-3 py-1 text-[11px] uppercase tracking-wide transition sm:text-xs ${
                    accessMode === "management"
                      ? "bg-emerald-100 text-emerald-700"
                      : "text-brand-ink-muted hover:bg-emerald-50"
                  }`}
                >
                  Ingreso de gerencia
                </button>
              </div>
            </div>
            <p className={`text-xs ${rangeError ? "text-rose-600" : "text-brand-ink-muted"}`}>
              {rangeStatusText}
            </p>
          </div>
        </header>

        {error ? (
          <div className="rounded-[32px] border border-brand-orange bg-white/85 px-6 py-5 text-sm font-medium text-brand-ink">
            {error}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <section className="rounded-[32px] border border-white/70 bg-white/90 shadow-[0_18px_36px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex items-center justify-between gap-4 border-b border-brand-ink-muted/10 px-6 py-4">
                <div className="flex flex-col text-brand-deep">
                  <span className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-ink-muted">
                    Matriz de días
                  </span>
                  <p className="text-lg font-black">
                    {staffCount > 0 ? `${staffCount} integrantes` : "Sin personal registrado"}
                  </p>
                </div>
                <div className="text-right text-sm text-brand-ink-muted">
                  <p>
                    Rango: <span className="font-semibold text-brand-deep">{activeStart}</span> a {" "}
                    <span className="font-semibold text-brand-deep">{activeEnd}</span>
                    <span className="ml-2 rounded-full border border-brand-ink-muted/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                      {usingCustomRange ? "Manual" : "Mes"}
                    </span>
                  </p>
                  <p>Actualizado automáticamente al aprobar días.</p>
                </div>
              </div>

              <div ref={matrixContainerRef} className="px-4 pb-6 pt-4">
                {isLoading ? (
                  <div className="flex h-40 items-center justify-center text-sm text-brand-ink-muted">
                    Cargando matriz…
                  </div>
                ) : !matrixData || !matrixData.rows.length ? (
                  <div className="flex h-40 items-center justify-center text-sm text-brand-ink-muted">
                    No encontramos registros de asistencia en el mes seleccionado.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-brand-deep">
                      {STATUS_LEGEND.map(({ key, label, chipClass, dotColor }) => (
                        <span
                          key={key}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${chipClass}`}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: dotColor }}
                          />
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="overflow-x-auto overflow-y-hidden rounded-2xl border border-brand-ink-muted/10">
                      <table className="w-full table-fixed border-collapse text-[10px] leading-tight text-brand-deep">
                        <colgroup>
                          <col style={{ width: `${STAFF_COLUMN_WIDTH}px` }} />
                          {matrixDays.map((day) => (
                            <col key={`col-${day}`} style={{ width: `${effectiveCellWidth}px` }} />
                          ))}
                          <col style={{ width: `${APPROVED_AMOUNT_COLUMN_WIDTH}px` }} />
                          <col style={{ width: `${PAID_COLUMN_WIDTH}px` }} />
                          <col style={{ width: `${PAID_DATE_COLUMN_WIDTH}px` }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-brand-deep-soft/40 text-brand-ink">
                            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide">
                              Personal
                            </th>
                            {matrixDays.map((day) => (
                              <th
                                key={day}
                                className="px-1 py-2 text-center font-semibold uppercase text-brand-ink-muted"
                              >
                                <div className="flex flex-col items-center leading-tight text-brand-ink">
                                  <span className="text-[11px]">
                                    {formatDayLabel(day, dayHeaderFormatter)}
                                  </span>
                                  <span className="text-[9px] uppercase text-brand-ink-muted">
                                    {formatDayLabel(day, weekdayFormatter)}
                                  </span>
                                </div>
                              </th>
                            ))}
                            <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-brand-ink">
                              Monto aprobado
                            </th>
                            <th className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-brand-ink">
                              Pagado
                            </th>
                            <th className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-brand-ink">
                              Fecha de pago
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {matrixData.rows.map((row) => {
                            const monthStatus = monthStatusByStaff.get(row.staffId);
                            const monthSummary = monthSummaryByStaff.get(row.staffId);
                            const staffName = resolveStaffName(row);
                            const paidValue = monthStatus?.paid ?? false;
                            const paidAtIsoValue = toIsoDateOnly(monthStatus?.paidAt ?? null);
                            const paidAtInputValue =
                              paidAtDrafts[row.staffId] ?? (paidAtIsoValue ?? "");
                            const isStatusSaving = Boolean(monthStatusSaving[row.staffId]);
                            const statusError = monthStatusErrors[row.staffId] ?? null;

                            return (
                              <tr key={row.staffId} className="odd:bg-white even:bg-brand-deep-soft/20">
                                <th className="px-3 py-2 text-left text-[11px] font-semibold text-brand-deep">
                                  <div className="flex flex-col gap-0.5 whitespace-nowrap">
                                    <span
                                      className={`${compactCellText ? "text-[12px]" : "text-[14px]"} max-w-[84px] truncate`}
                                      title={staffName}
                                    >
                                      {staffName}
                                    </span>
                                    <span className="text-[9px] font-medium text-brand-ink-muted">
                                      ID: {row.staffId}
                                    </span>
                                  </div>
                                </th>
                                {row.cells.map((cell) => {
                                  const cellHours =
                                    cell.approved && cell.approvedHours != null
                                      ? cell.approvedHours
                                      : cell.hours;
                                  const cellStatus =
                                    cell.status ??
                                    (cell as { dayStatus?: string }).dayStatus ??
                                    (cell.hasEdits
                                      ? cell.approved
                                        ? "edited_and_approved"
                                        : "edited_not_approved"
                                      : cell.approved
                                        ? "approved"
                                        : "pending");
                                  const cellClass =
                                    STATUS_BUTTON_CLASSES[cellStatus] ?? STATUS_BUTTON_CLASSES.pending;
                                  return (
                                    <td key={cell.date} className="px-1 py-1 text-center">
                                      <button
                                        type="button"
                                        onClick={() => openModal(row, cell)}
                                        className={`inline-flex w-full items-center justify-center rounded-full border font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal-soft ${cellClass} ${cellVisual.height} ${cellVisual.padding} ${cellVisual.font}`}
                                        style={{ minWidth: `${effectiveCellWidth}px` }}
                                      >
                                        <span className="whitespace-nowrap">
                                          {hoursFormatter.format(cellHours)}
                                        </span>
                                      </button>
                                    </td>
                                  );
                                })}
                                <td className="px-2 py-1 text-right font-semibold text-brand-deep">
                                  {isManagerUnlocked ? (
                                    <span>{toCurrency(monthSummary?.approvedAmount ?? null)}</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRevealedApprovedRows((previous) => ({
                                          ...previous,
                                          [row.staffId]: !previous[row.staffId],
                                        }))
                                      }
                                      aria-label={
                                        revealedApprovedRows[row.staffId]
                                          ? "Ocultar monto aprobado"
                                          : "Mostrar monto aprobado"
                                      }
                                      className="inline-flex w-full items-center justify-center rounded-full border border-brand-ink-muted/30 bg-brand-deep-soft/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted shadow-inner transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                                    >
                                      {revealedApprovedRows[row.staffId] ? (
                                        <span>{toCurrency(monthSummary?.approvedAmount ?? null)}</span>
                                      ) : (
                                        <span className="flex w-full flex-col items-center leading-tight">
                                          <span className="text-base font-black tracking-[0.45em]">•••</span>
                                          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide">
                                            Haz clic para ver
                                          </span>
                                        </span>
                                      )}
                                    </button>
                                  )}
                                </td>
                                <td className="px-2 py-1 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (paidValue) {
                                        setPaidAtDrafts((previous) => ({
                                          ...previous,
                                          [row.staffId]: "",
                                        }));
                                      }
                                      void updateMonthStatus(row.staffId, monthStatus, {
                                        paid: !paidValue,
                                      });
                                    }}
                                    disabled={isStatusSaving}
                                    className={`inline-flex min-w-[52px] items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal-soft ${
                                      paidValue
                                        ? "border-emerald-500 bg-emerald-500/80 text-white hover:bg-emerald-500"
                                        : "border-orange-400 bg-orange-100 text-orange-900 hover:bg-orange-200"
                                    } ${isStatusSaving ? "opacity-60" : ""}`}
                                  >
                                    {paidValue ? "Sí" : "No"}
                                  </button>
                                </td>
                                <td className="px-2 py-1 text-center text-brand-ink-muted">
                                  <div className="flex flex-col items-center gap-1">
                                    <input
                                      type="date"
                                      value={paidAtInputValue}
                                      onChange={(event) => {
                                        const { value } = event.target;
                                        setPaidAtDrafts((previous) => ({
                                          ...previous,
                                          [row.staffId]: value,
                                        }));
                                        setMonthStatusErrors((previous) => ({
                                          ...previous,
                                          [row.staffId]: null,
                                        }));

                                        if (!value.length) {
                                          if (paidAtIsoValue) {
                                            void updateMonthStatus(row.staffId, monthStatus, {
                                              paid: paidValue,
                                              paidAt: null,
                                            });
                                          }
                                          return;
                                        }

                                        if (value === paidAtIsoValue) {
                                          return;
                                        }

                                        void updateMonthStatus(row.staffId, monthStatus, {
                                          paid: paidValue,
                                          paidAt: value,
                                        });
                                      }}
                                      disabled={isStatusSaving}
                                      className="w-full max-w-[140px] rounded-full border border-brand-ink-muted/30 bg-white px-3 py-1 text-[11px] font-medium text-brand-deep shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal-soft disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                    {isStatusSaving ? (
                                      <span className="text-[10px] text-brand-ink-muted">Guardando…</span>
                                    ) : statusError ? (
                                      <span className="text-[10px] font-medium text-brand-orange">{statusError}</span>
                                    ) : paidAtIsoValue ? (
                                      <span className="text-[10px] text-brand-ink-muted">
                                        {paidDateFormatter.format(new Date(`${paidAtIsoValue}T12:00:00Z`))}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-brand-ink-muted">—</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>

          </div>
        )}
      </main>

      {selectedCell ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4 py-10 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-[32px] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-ink-muted/10 bg-white text-xl font-bold text-brand-ink transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/40 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              aria-label="Cerrar"
            >
              ×
            </button>
            <div className="flex flex-col gap-4 pr-10 text-brand-deep">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
                  {selectedCell.approved ? "Día aprobado" : "Pendiente de aprobación"}
                </span>
                <h2 className="text-2xl font-black">{selectedCell.staffName}</h2>
                <p className="text-sm text-brand-ink-muted">
                  {humanDateFormatter.format(new Date(`${selectedCell.workDate}T12:00:00Z`))}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 pr-10 text-brand-deep sm:flex-row sm:items-center sm:justify-between">
              <div className="rounded-[24px] border border-brand-ink-muted/10 bg-brand-deep-soft/30 px-5 py-4 text-sm text-brand-deep">
                Horas registradas: {hoursFormatter.format(displayHours)} h
              </div>
              <button
                type="button"
                onClick={addBlankSession}
                disabled={!isManagerUnlocked || sessionsLoading || actionLoading}
                title={
                  !isManagerUnlocked ? "Disponible solo en modo gerencia" : undefined
                }
                className="inline-flex items-center justify-center rounded-full border border-emerald-500/80 bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-emerald-600 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Agregar sesión
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {sessionsLoading ? (
                <div className="flex h-32 items-center justify-center text-sm text-brand-ink-muted">
                  Cargando sesiones del día…
                </div>
              ) : sessionsError ? (
                <div className="rounded-3xl border border-brand-orange/70 bg-brand-orange/10 px-5 py-4 text-sm font-medium text-brand-ink">
                  {sessionsError}
                </div>
              ) : (
                <div className="space-y-4">
                  {sessionRows.length ? (
                    sessionRows.map((session, index) => {
                      const isHistorical = session.isHistorical;
                      const editingDisabled =
                        isHistorical
                        || !isManagerUnlocked
                        || sessionsLoading
                        || actionLoading
                        || session.pendingAction === "delete";
                      const deletingDisabled =
                        isHistorical
                        || !isManagerUnlocked
                        || sessionsLoading
                        || actionLoading
                        || session.pendingAction === "edit"
                        || session.pendingAction === "create";
                      const saving =
                        session.pendingAction === "edit" || session.pendingAction === "create";
                      const editorActive = sessionEditor?.sessionKey === session.sessionKey;
                      const formattedCheckin = formatSessionTimestampForDisplay(session.checkinTime);
                      const formattedCheckout = formatSessionTimestampForDisplay(session.checkoutTime);
                      const currentCheckin = formattedCheckin ?? "—";
                      const currentCheckout = formattedCheckout ?? "—";

                      return (
                        <div
                          key={session.sessionKey}
                          className={`rounded-3xl border px-5 py-4 shadow-inner ${
                            isHistorical
                              ? "border-brand-ink-muted/10 bg-brand-deep-soft/30"
                              : "border-brand-ink-muted/15 bg-white"
                          }`}
                        >
                          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div
                              className={`flex flex-wrap items-center gap-2 ${
                                isHistorical ? "text-brand-ink-muted" : "text-brand-deep"
                              }`}
                            >
                              <span className="text-sm font-semibold">
                                {session.sessionId != null
                                  ? `Sesión ID ${session.sessionId}`
                                  : `Nueva sesión ${index + 1}`}
                              </span>
                              {session.isNew ? (
                                <span className="inline-flex items-center rounded-full bg-brand-teal-soft/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-deep">
                                  Nueva
                                </span>
                              ) : null}
                              {session.pendingAction ? (
                                <span className="inline-flex items-center rounded-full bg-brand-ink-muted/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                                  {session.pendingAction === "delete" ? "Eliminando…" : "Guardando…"}
                                </span>
                              ) : null}
                              {session.wasEdited && !session.isHistorical ? (
                                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-800">
                                  Editada
                                </span>
                              ) : null}
                              {isHistorical ? (
                                <span className="inline-flex items-center rounded-full bg-brand-ink-muted/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                                  Registro original
                                </span>
                              ) : null}
                              {!isHistorical && session.originalSessionId ? (
                                <span className="inline-flex items-center rounded-full bg-brand-ink-muted/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                                  {`Reemplaza ID ${session.originalSessionId}`}
                                </span>
                              ) : null}
                              {isHistorical && session.replacementSessionId ? (
                                <span className="inline-flex items-center rounded-full bg-brand-ink-muted/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                                  {`Reemplazada por ID ${session.replacementSessionId}`}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditClick(session.sessionKey)}
                                disabled={editingDisabled}
                                title={
                                  !isManagerUnlocked
                                    ? "Disponible solo en modo gerencia"
                                    : undefined
                                }
                                className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {saving
                                  ? "Guardando…"
                                  : editorActive
                                    ? "Editando…"
                                    : "Editar"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(session.sessionKey)}
                                disabled={deletingDisabled}
                                title={
                                  !isManagerUnlocked
                                    ? "Disponible solo en modo gerencia"
                                    : undefined
                                }
                                className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {session.pendingAction === "delete" ? "Eliminando…" : "Eliminar"}
                              </button>
                            </div>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div
                              className={`flex flex-col gap-1 text-sm ${
                                isHistorical ? "text-brand-ink-muted" : "text-brand-deep"
                              }`}
                            >
                              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
                                {isHistorical ? "Entrada registrada" : "Entrada actual"}
                              </span>
                              <span
                                className={`rounded-2xl border border-brand-ink-muted/20 px-3 py-2 text-sm font-semibold ${
                                  isHistorical
                                    ? "bg-white text-brand-ink-muted"
                                    : "bg-brand-deep-soft/20 text-brand-deep"
                                }`}
                              >
                                {currentCheckin}
                              </span>
                            </div>
                            <div
                              className={`flex flex-col gap-1 text-sm ${
                                isHistorical ? "text-brand-ink-muted" : "text-brand-deep"
                              }`}
                            >
                              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
                                {isHistorical ? "Salida registrada" : "Salida actual"}
                              </span>
                              <span
                                className={`rounded-2xl border border-brand-ink-muted/20 px-3 py-2 text-sm font-semibold ${
                                  isHistorical
                                    ? "bg-white text-brand-ink-muted"
                                    : "bg-brand-deep-soft/20 text-brand-deep"
                                }`}
                              >
                                {currentCheckout}
                              </span>
                            </div>
                          </div>
                          {!isHistorical && (session.originalCheckin || session.originalCheckout) ? (
                            <div className="mt-3 rounded-2xl border border-yellow-300 bg-yellow-50 px-4 py-3">
                              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-yellow-900">
                                <span>Original</span>
                                {session.originalSessionId ? (
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-yellow-800">
                                    {`ID ${session.originalSessionId}`}
                                  </span>
                                ) : null}
                              </div>
                              <div className="grid gap-3 text-sm sm:grid-cols-2">
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs font-medium text-yellow-800">Entrada</span>
                                  <span className="text-sm font-semibold text-yellow-900">
                                    {session.originalCheckin
                                      ? formatSessionTimestampForDisplay(session.originalCheckin) ?? "—"
                                      : "—"}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs font-medium text-yellow-800">Salida</span>
                                  <span className="text-sm font-semibold text-yellow-900">
                                    {session.originalCheckout
                                      ? formatSessionTimestampForDisplay(session.originalCheckout) ?? "—"
                                      : "—"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : null}
                          {!isHistorical && session.wasEdited ? (
                            <div className="mt-2 rounded-2xl border border-yellow-200 bg-yellow-50/70 px-4 py-2 text-xs text-yellow-800">
                              <div className="font-semibold uppercase tracking-[0.25em] text-yellow-700">
                                Ajuste registrado
                              </div>
                              <div className="mt-1 space-y-1">
                                {session.editedByStaffId ? (
                                  <p className="font-medium">{`Editor ID ${session.editedByStaffId}`}</p>
                                ) : null}
                                {session.editNote ? (
                                  <p className="italic text-yellow-900">{session.editNote}</p>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                          {session.validationError ? (
                            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand-orange">
                              {session.validationError}
                            </p>
                          ) : null}
                          {session.feedback ? (
                            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand-orange">
                              {session.feedback}
                            </p>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-3xl border border-brand-ink-muted/20 bg-brand-deep-soft/40 px-5 py-4 text-sm text-brand-ink-muted">
                      <div>No hay sesiones registradas para este día.</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {actionError ? (
              <div className="mt-4 rounded-3xl border border-brand-orange/70 bg-brand-orange/10 px-5 py-3 text-sm font-medium text-brand-ink">
                {actionError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              >
                Cancelar
              </button>
              {selectedCell?.approved ? (
                <button
                  type="button"
                  onClick={handleUnapprove}
                  disabled={!isManagerUnlocked || actionLoading}
                  title={
                    !isManagerUnlocked ? "Disponible solo en modo gerencia" : undefined
                  }
                  className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 shadow transition hover:-translate-y-[1px] hover:bg-rose-200 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionInFlight === "unapprove" ? "Procesando…" : "Revocar aprobación"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleApprove}
                disabled={!isManagerUnlocked || actionLoading}
                title={
                  !isManagerUnlocked ? "Disponible solo en modo gerencia" : undefined
                }
                className="inline-flex items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-emerald-500 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionInFlight === "approve"
                  ? "Procesando…"
                  : selectedCell?.approved
                    ? "Actualizar aprobación"
                    : "Aprobar día"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {sessionEditor && activeEditorRow ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur-sm"
          onClick={() => {
            if (!editorPending) {
              closeSessionEditor({ discardChanges: true });
            }
          }}
        >
          <div
            className="relative w-full max-w-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => closeSessionEditor({ discardChanges: true })}
              disabled={editorPending}
              className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white text-lg font-semibold text-brand-ink shadow transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/40 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Cerrar editor de sesión"
            >
              ×
            </button>
            <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
              <div className="px-6 py-6 sm:px-8">
                <div className="flex flex-col gap-2 text-brand-deep">
                  <h2 className="text-xl font-black">Editar sesión</h2>
                  <p className="text-sm text-brand-ink-muted">
                    Actualiza los horarios de entrada y salida. Conservaremos el registro original para referencia.
                  </p>
                </div>
                <form
                  className="mt-6 space-y-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitSessionEditor();
                  }}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm text-brand-deep">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
                        Entrada
                      </span>
                      <SegmentedTimeInput
                        value={activeEditorRow.draftCheckin}
                        onChange={(value) =>
                          handleDraftChange(activeEditorRow.sessionKey, "checkin", value)
                        }
                        onBlur={() => handleDraftBlur(activeEditorRow.sessionKey, "checkin")}
                        disabled={activeEditorRow.pendingAction != null}
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-brand-deep">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
                        Salida
                      </span>
                      <SegmentedTimeInput
                        value={activeEditorRow.draftCheckout}
                        onChange={(value) =>
                          handleDraftChange(activeEditorRow.sessionKey, "checkout", value)
                        }
                        onBlur={() => handleDraftBlur(activeEditorRow.sessionKey, "checkout")}
                        disabled={activeEditorRow.pendingAction != null}
                        required
                      />
                    </label>
                  </div>
                  {activeEditorRow.originalCheckin || activeEditorRow.originalCheckout ? (
                    <div className="rounded-2xl border border-yellow-300 bg-yellow-50 px-4 py-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-yellow-900">
                        Horarios originales
                      </div>
                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-yellow-800">Entrada</span>
                          <span className="text-sm font-semibold text-yellow-900">
                            {activeEditorRow.originalCheckin
                              ? formatSessionTimestampForDisplay(activeEditorRow.originalCheckin) ?? "—"
                              : "—"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-yellow-800">Salida</span>
                          <span className="text-sm font-semibold text-yellow-900">
                            {activeEditorRow.originalCheckout
                              ? formatSessionTimestampForDisplay(activeEditorRow.originalCheckout) ?? "—"
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {activeEditorRow.validationError ? (
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
                      {activeEditorRow.validationError}
                    </p>
                  ) : null}
                  {activeEditorRow.feedback ? (
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
                      {activeEditorRow.feedback}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => closeSessionEditor({ discardChanges: true })}
                      disabled={editorPending}
                      className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={editorPending}
                      className="inline-flex items-center justify-center rounded-full border border-brand-teal-soft/70 bg-brand-teal-soft px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/80 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {editorPending
                        ? "Guardando…"
                        : "Actualizar sesión"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {accessModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-10 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-[32px] border border-white/70 bg-white/95 p-8 text-left shadow-[0_26px_60px_rgba(15,23,42,0.18)]">
            <h2 className="text-2xl font-black text-brand-deep">Selecciona el modo de acceso</h2>
            <p className="mt-2 text-sm text-brand-ink-muted">
              Ingresa en modo de gerencia para editar, crear o aprobar sesiones. También puedes continuar en modo solo lectura para revisar la información sin cambios.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => handleAccessSelection("read-only", { fromGate: true })}
                className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/40 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              >
                Solo lectura
              </button>
              <button
                type="button"
                onClick={() => handleAccessSelection("management", { fromGate: true })}
                className="inline-flex items-center justify-center rounded-full border border-brand-teal-soft bg-brand-teal-soft px-5 py-3 text-sm font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              >
                Ingreso de gerencia
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pinModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm">
          <div className="relative w-full max-w-md">
            <button
              type="button"
              onClick={() => {
                setPinModalOpen(false);
                setHasValidatedPinThisSession(false);
                setIsManagerUnlocked(false);
                if (!initialSelectionComplete) {
                  setAccessModalOpen(true);
                  setInitialSelectionComplete(false);
                }
                resolvePinRequest(false);
              }}
              className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white text-lg font-semibold text-brand-ink shadow hover:-translate-y-[1px] hover:bg-brand-teal-soft/40 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              aria-label="Cerrar validación"
            >
              ×
            </button>
            <PinPrompt
              scope="manager"
              title="PIN de gerencia requerido"
              description="Confirma el PIN de gerencia para continuar."
              ctaLabel="Validar PIN"
              onSuccess={() => {
                setHasValidatedPinThisSession(true);
                setIsManagerUnlocked(true);
                setAccessModalOpen(false);
                setPinModalOpen(false);
                setInitialSelectionComplete(true);
                resolvePinRequest(true);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
