import type {
  PeakLoadWindowRow,
  StaffByHourRow,
  StudentStaffRatioRow,
  StudentsByHourRow,
} from "../../data/ops.read";

export type HourRange = { start: number; end: number };

export const DEFAULT_HOUR_RANGE: HourRange = { start: 8, end: 20 };
export const FULL_DAY_RANGE: HourRange = { start: 0, end: 23 };

export const DOW_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

export function getDowLabel(dow: number) {
  return DOW_LABELS[dow] ?? `Día ${dow}`;
}

export function formatHourLabel(hour: number) {
  return hour.toString().padStart(2, "0");
}

export function selectHourRange(showAllHours: boolean): HourRange {
  return showAllHours ? FULL_DAY_RANGE : DEFAULT_HOUR_RANGE;
}

export function filterRowsByHourRange<T extends { hour: number }>(rows: T[], range: HourRange) {
  return rows.filter((row) => row.hour >= range.start && row.hour <= range.end);
}

export function createHeatmapLookup<T extends { dow: number; hour: number }>(rows: T[]) {
  return new Map(rows.map((row) => [`${row.dow}-${row.hour}`, row] as const));
}

export function clampRatio(value: number | null | undefined, max = 6) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return Math.min(Math.max(value, 0), max);
}

export function normalizeRatioDisplay(row: StudentStaffRatioRow) {
  if (!row || row.avg_staff === null || row.avg_staff === 0) {
    return {
      ratio: null,
      avgStudents: row?.avg_students ?? null,
      avgStaff: row?.avg_staff ?? null,
    };
  }
  return {
    ratio: row.avg_student_staff_ratio,
    avgStudents: row.avg_students,
    avgStaff: row.avg_staff,
  };
}

export function sortPeakWindows(
  rows: PeakLoadWindowRow[],
  range: HourRange,
  limit = 24,
): PeakLoadWindowRow[] {
  const filtered = filterRowsByHourRange(rows, range);
  return filtered
    .sort((a, b) => {
      const aAvg = a.avg_students ?? -Infinity;
      const bAvg = b.avg_students ?? -Infinity;
      if (aAvg !== bAvg) return bAvg - aAvg;
      const aP95 = a.p95_students ?? -Infinity;
      const bP95 = b.p95_students ?? -Infinity;
      if (aP95 !== bP95) return bP95 - aP95;
      if (a.dow !== b.dow) return a.dow - b.dow;
      return a.hour - b.hour;
    })
    .slice(0, limit);
}

export function hasOpsData(
  students: StudentsByHourRow[],
  staff: StaffByHourRow[],
  ratios: StudentStaffRatioRow[],
  peaks: PeakLoadWindowRow[],
) {
  return [students, staff, ratios, peaks].some((rows) => rows.some((row) => {
    const values = Object.values(row).filter((value) => typeof value === "number");
    return values.some((value) => value !== null && !Number.isNaN(value));
  }));
}
