import { TIMEZONE } from "@/lib/db/client";

const CHECK_IN_START_HOUR = 0;
const CHECK_IN_END_HOUR = 23;
const MAX_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

type ZonedTimeParts = {
  hour: number;
  minute: number;
};

function getZonedTimeParts(date = new Date()): ZonedTimeParts {
  const formatter = new Intl.DateTimeFormat("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
  });

  const parts = formatter.formatToParts(date);
  const hourPart = parts.find((part) => part.type === "hour");
  const minutePart = parts.find((part) => part.type === "minute");

  const hour = hourPart ? Number.parseInt(hourPart.value, 10) : 0;
  const minute = minutePart ? Number.parseInt(minutePart.value, 10) : 0;

  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

export function isWithinCheckInWindow(date = new Date()): boolean {
  const { hour, minute } = getZonedTimeParts(date);

  if (hour < CHECK_IN_START_HOUR) return false;
  if (hour > CHECK_IN_END_HOUR) return false;
  if (CHECK_IN_END_HOUR < 23 && hour === CHECK_IN_END_HOUR && minute > 0) {
    return false;
  }
  return true;
}

export function millisecondsUntilNextMinute(date = new Date()): number {
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();
  return Math.max(0, 60_000 - seconds * 1000 - milliseconds);
}

export function exceedsSessionDurationLimit(
  checkInTimestamp: string,
  now = new Date(),
): boolean {
  const checkInDate = new Date(checkInTimestamp);
  if (Number.isNaN(checkInDate.getTime())) {
    return false;
  }

  const durationMs = now.getTime() - checkInDate.getTime();
  return durationMs > MAX_SESSION_DURATION_MS;
}

export function formatLessonWithSequence(
  name: string | null,
  sequence: number | null,
): string {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return "la lección seleccionada";
  }

  const sequenceLabel =
    sequence == null ? "sin número" : sequence.toString();
  return `${trimmedName} (Lección ${sequenceLabel})`;
}
