export function normalizePercent(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  const normalized = value > 1 ? value / 100 : value;
  return Number.isFinite(normalized) ? normalized : null;
}

export function formatPercentDisplay(value: number | null | undefined) {
  const normalized = normalizePercent(value);
  if (normalized === null) return "--";
  return new Intl.NumberFormat("es-EC", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(normalized);
}

export function isExamDataEmpty(
  available: boolean,
  passTrendLength: number,
  hasLatest: boolean,
) {
  if (!available) return false;
  return passTrendLength === 0 && !hasLatest;
}
