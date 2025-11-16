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

function buildHourLabel(hour: number | null): string {
  if (hour === null || Number.isNaN(hour)) return "—";
  const clamped = Math.max(0, Math.min(23, Math.round(hour)));
  return `${hourFormatter.format(clamped)}:00`;
}

function normalizeHourRow(row: SqlRow): StaffingMixHourRow {
  // Using exact columns from final.personnel_staffing_mix_hour_mv
  const hour = toNumber(row.local_hour);
  const hourLabel = buildHourLabel(hour);

  const studentMinutes = toNumber(row.student_minutes) ?? 0;
  const staffMinutes = toNumber(row.staff_minutes) ?? 0;
  const ratio = toNumber(row.student_to_staff_minute_ratio);
  const studentCount = toNumber(row.students_count);
  const staffCount = toNumber(row.staff_count);

  return {
    hourOfDay: typeof hour === "number" ? hour : null,
    hourLabel,
    studentMinutes,
    staffMinutes,
    studentToStaffMinuteRatio: ratio,
    studentCount,
    staffCount,
  };
}

function normalizeUtilization(row: SqlRow): TeacherUtilizationRow {
  // Using exact columns from final.personnel_teacher_utilization_mv
  const teacherId = toStringValue(row.staff_id) || "unknown";
  const teacherName = toStringValue(row.staff_name) || "Profesor sin nombre";
  const utilizationPct = toNumber(row.utilization_rate_pct);
  const minutesWithStudents = toNumber(row.teaching_minutes_30d) ?? 0;
  const minutesClockedIn = toNumber(row.clocked_minutes_30d) ?? 0;

  return {
    teacherId,
    teacherName,
    utilizationPct,
    minutesWithStudents,
    minutesClockedIn,
  };
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
          await sql`
            SELECT 
              local_day,
              local_hour,
              student_minutes,
              students_count,
              staff_minutes,
              staff_count,
              student_to_staff_minute_ratio
            FROM final.personnel_staffing_mix_hour_mv 
            ORDER BY local_day, local_hour
          `,
        ),
    );

    const teacherLoadRows = await safeRows(
      "final.personnel_student_load_per_teacher_mv",
      async () =>
        normalizeRows(
          await sql`
            SELECT 
              student_minutes_30d,
              staff_minutes_30d,
              student_to_staff_minute_ratio_30d
            FROM final.personnel_student_load_per_teacher_mv
          `,
        ),
    );

    const utilizationRows = await safeRows(
      "final.personnel_teacher_utilization_mv",
      async () =>
        normalizeRows(
          await sql`
            SELECT 
              staff_id,
              staff_name,
              staff_role,
              staff_active,
              clocked_minutes_30d,
              teaching_minutes_30d,
              utilization_rate_pct
            FROM final.personnel_teacher_utilization_mv
          `,
        ),
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

    // personnel_student_load_per_teacher_mv returns a single aggregate row
    const loadRow = teacherLoadRows[0];
    const studentLoadGauge: StudentLoadGauge = {
      avgStudentsPerTeacher: loadRow ? toNumber(loadRow.student_to_staff_minute_ratio_30d) : null,
      targetStudentsPerTeacher: TARGET_STUDENTS_PER_TEACHER,
      teacherCount: utilizationRows.length,
    };

    // Use utilization data to build per-teacher load view (approximation)
    const studentLoadPerTeacher = utilizationRows
      .map((row): StudentLoadPerTeacherRow => {
        const teachingMinutes = toNumber(row.teaching_minutes_30d) ?? 0;
        const totalRatio = loadRow ? toNumber(loadRow.student_to_staff_minute_ratio_30d) ?? 0 : 0;
        
        return {
          teacherId: toStringValue(row.staff_id) || "unknown",
          teacherName: toStringValue(row.staff_name) || "Profesor sin nombre",
          avgStudentsPerHour: teachingMinutes > 0 ? (teachingMinutes / 60) * totalRatio : null,
          avgStudentsPerDay: teachingMinutes > 0 ? (teachingMinutes / (60 * 8)) * totalRatio : null,
        };
      })
      .sort((a, b) => (b.avgStudentsPerHour ?? 0) - (a.avgStudentsPerHour ?? 0));

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
