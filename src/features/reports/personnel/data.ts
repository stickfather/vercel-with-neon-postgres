import {
  getSqlClient,
  isMissingRelationError,
  normalizeRows,
  type SqlRow,
} from "@/lib/db/client";
import {
  createEmptyPersonnelReport,
  type PeakCoveragePoint,
  type PersonnelReportResponse,
  type StaffingHeatmapCell,
  type StaffingMixHourRow,
  type StudentLoadGauge,
  type StudentLoadPerTeacherRow,
  type TeacherUtilizationRow,
  type UnderOverRow,
} from "@/types/personnel";

const TARGET_STUDENTS_PER_TEACHER = 10;
const OVERSTAFFED_RATIO_THRESHOLD = 6;
const HOURS_RANGE = Array.from({ length: 13 }, (_, index) => 8 + index);

const hourFormatter = new Intl.NumberFormat("es-EC", {
  minimumIntegerDigits: 2,
});

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) return null;
    const parsed = Number(trimmed.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return "";
}

function findKey(row: SqlRow, candidates: string[], includes: string[][] = []): string | null {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    if (!candidate) continue;
    const exact = keys.find((key) => key === candidate);
    if (exact) return exact;
    const insensitive = keys.find((key) => key.toLowerCase() === candidate.toLowerCase());
    if (insensitive) return insensitive;
  }
  for (const parts of includes) {
    const match = keys.find((key) => {
      const lower = key.toLowerCase();
      return parts.every((part) => lower.includes(part));
    });
    if (match) return match;
  }
  return null;
}

function readNumber(row: SqlRow, candidates: string[], includes: string[][] = []): number | null {
  const key = findKey(row, candidates, includes);
  if (!key) return null;
  return toNumber(row[key]);
}

function readString(
  row: SqlRow,
  candidates: string[],
  includes: string[][] = [],
  fallback = "",
): string {
  const key = findKey(row, candidates, includes);
  if (!key) return fallback;
  const value = toStringValue(row[key]);
  return value.length ? value : fallback;
}

function buildHourLabel(hour: number | null): string {
  if (hour === null || Number.isNaN(hour)) return "—";
  const clamped = Math.max(0, Math.min(23, Math.round(hour)));
  return `${hourFormatter.format(clamped)}:00`;
}

function normalizeHourRow(row: SqlRow): StaffingMixHourRow {
  const hour = readNumber(row, ["hour_of_day", "hour", "hora"], [["hour"], ["hora"], ["block"]]);
  const hourLabel = readString(
    row,
    ["hour_label", "label", "hora"],
    [["hour"], ["bloque"], ["slot"]],
    buildHourLabel(hour),
  );

  const studentMinutes = readNumber(
    row,
    ["student_minutes", "minutos_estudiantes", "student_min"],
    [["student"], ["estudiante"], ["minutos"]],
  ) ?? 0;
  const staffMinutes = readNumber(
    row,
    ["staff_minutes", "minutos_personal", "teacher_minutes"],
    [["staff"], ["teacher"], ["personal"], ["minutos"]],
  ) ?? 0;
  const ratio = readNumber(
    row,
    [
      "student_to_staff_minute_ratio",
      "ratio_estudiantes_personal",
      "carga_relativa",
      "student_staff_ratio",
    ],
    [["ratio"], ["carga"], ["estudiante", "personal"]],
  );
  const studentCount = readNumber(
    row,
    ["student_count", "students", "studentas"],
    [["students"], ["alumnos"], ["estudiantes"]],
  );
  const staffCount = readNumber(
    row,
    ["staff_count", "teachers", "docentes"],
    [["staff"], ["docente"], ["profesor"]],
  );

  return {
    hourOfDay: typeof hour === "number" ? hour : null,
    hourLabel: hourLabel || buildHourLabel(hour),
    studentMinutes,
    staffMinutes,
    studentToStaffMinuteRatio: ratio,
    studentCount,
    staffCount,
  };
}

function normalizeTeacherLoad(row: SqlRow): StudentLoadPerTeacherRow {
  const teacherId = readString(row, ["teacher_id", "staff_id", "id"], [["teacher"], ["docente"]]) || "unknown";
  const teacherName =
    readString(row, ["teacher_name", "nombre_docente", "teacher"], [["docente"], ["teacher"]]) ||
    "Profesor sin nombre";
  const avgStudentsPerHour = readNumber(
    row,
    ["avg_students_per_hour", "students_per_hour", "estudiantes_por_hora"],
    [["promedio"], ["hora"]],
  );
  const avgStudentsPerDay = readNumber(
    row,
    ["avg_students_per_day", "students_per_day", "estudiantes_por_dia"],
    [["dia"], ["day"]],
  );

  return {
    teacherId,
    teacherName,
    avgStudentsPerHour,
    avgStudentsPerDay,
  };
}

function normalizeUtilization(row: SqlRow): TeacherUtilizationRow {
  const teacherId = readString(row, ["teacher_id", "staff_id", "id"], [["teacher"], ["docente"]]) || "unknown";
  const teacherName =
    readString(row, ["teacher_name", "nombre_docente", "teacher"], [["docente"], ["teacher"]]) ||
    "Profesor sin nombre";
  const utilizationPct = readNumber(
    row,
    ["utilization_pct", "utilization", "porcentaje_utilizacion"],
    [["util"], ["porcentaje"], ["uso"]],
  );
  const minutesWithStudents =
    readNumber(row, ["minutes_with_students", "minutos_con_estudiantes"], [["student"], ["estudiante"]]) ?? 0;
  const minutesClockedIn =
    readNumber(row, ["minutes_clocked_in", "minutos_registrados", "minutos_laborados"], [
      ["clock"],
      ["labor"],
    ]) ?? 0;

  return {
    teacherId,
    teacherName,
    utilizationPct,
    minutesWithStudents,
    minutesClockedIn,
  };
}

function safeAverage(values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!numeric.length) return null;
  const sum = numeric.reduce((acc, value) => acc + value, 0);
  return sum / numeric.length;
}

function fillHours(cells: StaffingMixHourRow[]): StaffingMixHourRow[] {
  return HOURS_RANGE.map((hour) => {
    const match = cells.find((row) => row.hourOfDay === hour);
    if (match) return match;
    return {
      hourOfDay: hour,
      hourLabel: buildHourLabel(hour),
      studentMinutes: 0,
      staffMinutes: 0,
      studentToStaffMinuteRatio: null,
      studentCount: null,
      staffCount: null,
    } satisfies StaffingMixHourRow;
  });
}

function deriveHeatmap(rows: StaffingMixHourRow[]): StaffingHeatmapCell[] {
  return rows.map((row) => ({
    hourLabel: row.hourLabel,
    ratio: row.studentToStaffMinuteRatio,
    studentMinutes: row.studentMinutes,
    staffMinutes: row.staffMinutes,
  }));
}

function derivePeakCoverage(rows: StaffingMixHourRow[]): PeakCoveragePoint[] {
  return rows.map((row) => ({
    hourLabel: row.hourLabel,
    studentMinutes: row.studentMinutes,
    staffMinutes: row.staffMinutes,
  }));
}

function computeGapRows(rows: StaffingMixHourRow[], direction: "under" | "over"): UnderOverRow[] {
  const gaps: UnderOverRow[] = [];

  for (const row of rows) {
    const ratio =
      row.studentToStaffMinuteRatio ??
      (row.staffMinutes > 0 ? row.studentMinutes / row.staffMinutes : null);
    if (ratio === null) continue;
    if (direction === "under" && ratio <= TARGET_STUDENTS_PER_TEACHER) continue;
    if (direction === "over" && ratio >= OVERSTAFFED_RATIO_THRESHOLD) continue;

    const gapMetric =
      direction === "under"
        ? ratio - TARGET_STUDENTS_PER_TEACHER
        : Math.max(0, Math.min(TARGET_STUDENTS_PER_TEACHER, TARGET_STUDENTS_PER_TEACHER - ratio));

    gaps.push({
      hourLabel: row.hourLabel,
      studentMinutes: row.studentMinutes,
      staffMinutes: row.staffMinutes,
      ratio,
      gapMetric,
    });
  }

  return gaps.sort((a, b) => b.gapMetric - a.gapMetric).slice(0, 6);
}

export async function getPersonnelReport(): Promise<PersonnelReportResponse> {
  const sql = getSqlClient();
  let fallback = false;

  async function safeRows(label: string, runner: () => Promise<SqlRow[]>): Promise<SqlRow[]> {
    try {
      return await runner();
    } catch (error) {
      fallback = true;
      if (isMissingRelationError(error, label)) {
        console.warn(`Vista faltante: ${label}`);
        return [];
      }
      console.error(`Error consultando ${label}`, error);
      return [];
    }
  }

  try {
    const staffingRows = await safeRows(
      "final.personnel_staffing_mix_hour_mv",
      async () =>
        normalizeRows(
          await sql`SELECT * FROM final.personnel_staffing_mix_hour_mv ORDER BY 1`,
        ),
    );

    const teacherLoadRows = await safeRows(
      "final.personnel_student_load_per_teacher_mv",
      async () =>
        normalizeRows(
          await sql`SELECT * FROM final.personnel_student_load_per_teacher_mv`,
        ),
    );

    const utilizationRows = await safeRows(
      "final.personnel_teacher_utilization_mv",
      async () =>
        normalizeRows(await sql`SELECT * FROM final.personnel_teacher_utilization_mv`),
    );

    const normalizedHourRows = staffingRows
      .map((row) => normalizeHourRow(row))
      .filter((row) => {
        if (row.hourOfDay === null) return true;
        return row.hourOfDay >= 8 && row.hourOfDay <= 20;
      });
    const hourRows = fillHours(normalizedHourRows);

    const staffingMixByHour = deriveHeatmap(hourRows);
    const peakCoverage = derivePeakCoverage(hourRows);

    const studentLoadPerTeacher = teacherLoadRows
      .map((row) => normalizeTeacherLoad(row))
      .sort((a, b) => (b.avgStudentsPerHour ?? 0) - (a.avgStudentsPerHour ?? 0));
    const studentLoadGauge: StudentLoadGauge = {
      avgStudentsPerTeacher: safeAverage(
        studentLoadPerTeacher.map((row) => row.avgStudentsPerHour),
      ),
      targetStudentsPerTeacher: TARGET_STUDENTS_PER_TEACHER,
      teacherCount: studentLoadPerTeacher.length,
    };

    const teacherUtilization = utilizationRows
      .map((row) => normalizeUtilization(row))
      .sort((a, b) => (b.utilizationPct ?? 0) - (a.utilizationPct ?? 0));

    const understaffedHours = computeGapRows(normalizedHourRows, "under");
    const overstaffedHours = computeGapRows(normalizedHourRows, "over");

    return {
      staffingMixByHour,
      peakCoverage,
      studentLoadGauge,
      studentLoadPerTeacher,
      understaffedHours,
      overstaffedHours,
      teacherUtilization,
      fallback,
      generatedAt: new Date().toISOString(),
    } satisfies PersonnelReportResponse;
  } catch (error) {
    console.error("Error general al construir el reporte de personal", error);
    return createEmptyPersonnelReport();
  }
}
