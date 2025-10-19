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

const PAYROLL_OFFSET_PROBE = new Date(Date.UTC(2024, 0, 1, 12, 0, 0));

export const PAYROLL_TIMEZONE_OFFSET = formatPayrollTimeZoneOffset(
  getPayrollTimeZoneOffsetInMinutes(PAYROLL_OFFSET_PROBE),
);

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

const LOCAL_TIMESTAMP_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?(?:([+-]\d{2}(?::?\d{2})?|Z))?$/;

const VERBOSE_TIMESTAMP_REGEX =
  /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?\s+GMT([+-]\d{4})(?:\s+\(.+\))?$/;

const MONTH_NAME_TO_INDEX: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

export function parsePayrollLocalDateTime(value: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  const normalized = trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed;
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  const safeSecond = second ?? "00";
  return `${year}-${month}-${day}T${hour}:${minute}:${safeSecond}`;
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

  const verboseMatch = trimmed.match(VERBOSE_TIMESTAMP_REGEX);
  if (verboseMatch) {
    const [, monthName, day, year, hour, minute, second, compactOffset] = verboseMatch;
    const month = MONTH_NAME_TO_INDEX[monthName.toLowerCase()];
    if (!month) {
      return null;
    }
    const paddedDay = day.padStart(2, "0");
    const safeSecond = second ?? "00";
    const safeOffset = `${compactOffset.slice(0, 3)}:${compactOffset.slice(3)}`;
    return `${year}-${month}-${paddedDay}T${hour}:${minute}:${safeSecond}${safeOffset}`;
  }

  const normalized = trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed;
  const match = normalized.match(LOCAL_TIMESTAMP_REGEX);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second, fractional, offset] = match;
  const safeSecond = second ?? "00";
  const safeFraction = fractional ? `.${fractional}` : "";
  let safeOffset = offset ?? "";
  if (safeOffset && safeOffset !== "Z") {
    if (/^[+-]\d{2}$/.test(safeOffset)) {
      safeOffset = `${safeOffset}:00`;
    } else if (!safeOffset.includes(":")) {
      safeOffset = `${safeOffset.slice(0, 3)}:${safeOffset.slice(3)}`;
    }
  }
  return `${year}-${month}-${day}T${hour}:${minute}:${safeSecond}${safeFraction}${safeOffset}`;
}
