export const PAYROLL_TIMEZONE = "America/Guayaquil";

type DatePart = Intl.DateTimeFormatPart;

type PayrollDateParts = {
  year: string;
  month: string;
  day: string;
};

type PayrollDateTimeParts = PayrollDateParts & {
  hour: string;
  minute: string;
  second: string;
};

const payrollDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PAYROLL_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const payrollDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PAYROLL_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const payrollOffsetFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PAYROLL_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function getPart(parts: DatePart[], type: Intl.DateTimeFormatPartTypes): string | null {
  return parts.find((part) => part.type === type)?.value ?? null;
}

export function getPayrollDateParts(date: Date): PayrollDateParts | null {
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const parts = payrollDateFormatter.formatToParts(date);
  const year = getPart(parts, "year");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");
  if (!year || !month || !day) {
    return null;
  }
  return { year, month, day };
}

export function getPayrollDateTimeParts(date: Date): PayrollDateTimeParts | null {
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const parts = payrollDateTimeFormatter.formatToParts(date);
  const year = getPart(parts, "year");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");
  const hour = getPart(parts, "hour");
  const minute = getPart(parts, "minute");
  const second = getPart(parts, "second");
  if (!year || !month || !day || !hour || !minute || !second) {
    return null;
  }
  return { year, month, day, hour, minute, second };
}

export function getPayrollTimeZoneOffsetInMinutes(baseDate: Date): number {
  if (Number.isNaN(baseDate.getTime())) {
    return 0;
  }
  const parts = payrollOffsetFormatter.formatToParts(baseDate);
  const year = getPart(parts, "year");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");
  const hour = getPart(parts, "hour");
  const minute = getPart(parts, "minute");
  const second = getPart(parts, "second");
  if (!year || !month || !day || !hour || !minute || !second) {
    return 0;
  }
  const asUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  return (asUtc - baseDate.getTime()) / 60000;
}

export function formatPayrollTimeZoneOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function toPayrollZonedISOString(date: Date): string | null {
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const parts = getPayrollDateTimeParts(date);
  if (!parts) {
    return null;
  }
  const offsetMinutes = getPayrollTimeZoneOffsetInMinutes(date);
  const offset = formatPayrollTimeZoneOffset(offsetMinutes);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

export function parsePayrollLocalDateTime(value: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  const normalized = trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed;
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return null;
  }
  const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const second = Number(secondStr ?? "0");
  if (
    !Number.isFinite(year)
    || !Number.isFinite(month)
    || !Number.isFinite(day)
    || !Number.isFinite(hour)
    || !Number.isFinite(minute)
    || !Number.isFinite(second)
  ) {
    return null;
  }
  const baseUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  if (!Number.isFinite(baseUtcMs)) {
    return null;
  }
  const baseDate = new Date(baseUtcMs);
  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }
  const offsetMinutes = getPayrollTimeZoneOffsetInMinutes(baseDate);
  const adjustedMs = baseUtcMs - offsetMinutes * 60000;
  const adjustedDate = new Date(adjustedMs);
  if (Number.isNaN(adjustedDate.getTime())) {
    return null;
  }
  return toPayrollZonedISOString(adjustedDate);
}

export function normalizePayrollTimestamp(
  value: string | Date | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return toPayrollZonedISOString(value);
  }
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }
  const candidate = trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed;
  if (/[zZ]$/.test(candidate) || /[+-]\d{2}:?\d{2}$/.test(candidate)) {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return toPayrollZonedISOString(parsed);
    }
  }
  const local = parsePayrollLocalDateTime(candidate);
  if (local) {
    return local;
  }
  const parsed = new Date(candidate);
  if (!Number.isNaN(parsed.getTime())) {
    return toPayrollZonedISOString(parsed);
  }
  return null;
}
