const MAX_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const TIME_RESTRICTION_INDICATORS = [
  "check-in not allowed before",
  "check in not allowed before",
  "checkin not allowed before",
  "check-in no permitido antes",
];

export function isWithinCheckInWindow(date = new Date()): boolean {
  // Check-ins are allowed at any time of day. The parameter is kept for
  // compatibility with existing call sites, but we deliberately ignore it so
  // no hour-based restrictions are applied.
  void date;
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

export function isTimeRestrictionMessage(message: string | null | undefined): boolean {
  if (!message) {
    return false;
  }

  const normalized = message.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return TIME_RESTRICTION_INDICATORS.some((indicator) =>
    normalized.includes(indicator),
  );
}
