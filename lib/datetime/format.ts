const TIMEZONE = "America/Guayaquil";

function isIsoWithZone(value: string): boolean {
  return /[zZ]$/.test(value) || /[+-]\d{2}:?\d{2}$/.test(value);
}

function toDate(input: string | Date): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (isIsoWithZone(trimmed)) {
    const withZone = new Date(trimmed);
    return Number.isNaN(withZone.getTime()) ? null : withZone;
  }

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [_, year, month, day] = dateOnlyMatch;
    const candidate = new Date(`${year}-${month}-${day}T00:00:00-05:00`);
    return Number.isNaN(candidate.getTime()) ? null : candidate;
  }

  const dateTimeMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?$/,
  );
  if (dateTimeMatch) {
    const [, datePart, timePart, secondsPart] = dateTimeMatch;
    const seconds = secondsPart ?? "00";
    const candidate = new Date(`${datePart}T${timePart}:${seconds}-05:00`);
    return Number.isNaN(candidate.getTime()) ? null : candidate;
  }

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const normalized = trimmed.replace(" ", "T");
  const fallback = new Date(normalized);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function applyOptions(
  defaults: Intl.DateTimeFormatOptions,
  overrides: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
  const finalOptions: Intl.DateTimeFormatOptions = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    const typedKey = key as keyof Intl.DateTimeFormatOptions;
    if (value == null) {
      delete finalOptions[typedKey];
    } else {
      finalOptions[typedKey] = value;
    }
  }
  return finalOptions;
}

export function formatLocalDateTime(
  input: string | Date,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  const date = toDate(input);
  if (!date) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat(
    "es-EC",
    applyOptions(
      {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
      opts,
    ),
  );

  return formatter.format(date);
}

export function formatLocalDate(
  input: string | Date,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  const date = toDate(input);
  if (!date) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat(
    "es-EC",
    applyOptions(
      {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
      opts,
    ),
  );

  return formatter.format(date);
}

export function formatLocalTime(
  input: string | Date,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  const date = toDate(input);
  if (!date) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat(
    "es-EC",
    applyOptions(
      {
        timeZone: TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
      opts,
    ),
  );

  return formatter.format(date);
}

export function parseLocalDateKey(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  const candidate = new Date(`${year}-${month}-${day}T00:00:00-05:00`);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}
