const GUAYAQUIL_TIME_ZONE = "America/Guayaquil";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-EC", {
  timeZone: GUAYAQUIL_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatGuayaquilDateTime(
  value: string | number | Date | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return DATE_TIME_FORMATTER.format(date);
}

export { GUAYAQUIL_TIME_ZONE };
