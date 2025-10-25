import { getSqlClient, normalizeRows, SqlRow } from "@/lib/db/client";

export type StudentManagementEntry = {
  id: number;
  fullName: string;
  level: string | null;
  state: string | null;
  isNewStudent: boolean;
  isExamApproaching: boolean;
  isExamPreparation: boolean;
  hasSpecialNeeds: boolean;
  isAbsent7Days: boolean;
  isSlowProgress14Days: boolean;
  hasActiveInstructive: boolean;
  hasOverdueInstructive: boolean;
};

function coerceString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  return null;
}

function coerceBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    const asciiNormalized = normalized
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (
      ["true", "t", "1", "yes", "y", "si", "s"].includes(asciiNormalized)
    )
      return true;
    if (["false", "f", "0", "no", "n"].includes(asciiNormalized))
      return false;
  }
  return null;
}

function pick<T = unknown>(row: SqlRow, keys: string[]): T | null {
  for (const key of keys) {
    if (key in row && row[key] != null) {
      return row[key] as T;
    }
  }
  return null;
}

function mapStudentManagementRow(row: SqlRow): StudentManagementEntry | null {
  const id = Number(row["student_id"] ?? row.id ?? row["id"] ?? 0);
  const fullName = ((row.full_name as string | null) ?? "").trim();

  if (!Number.isFinite(id) || id <= 0 || !fullName.length) {
    return null;
  }

  return {
    id,
    fullName,
    level:
      coerceString(
        pick(row, ["level", "current_level", "last_level", "student_level"]),
      ) ?? null,
    state:
      coerceString(pick(row, ["state", "status", "student_state"])) ?? null,
    isNewStudent:
      coerceBoolean(pick(row, ["is_new_student", "new_student", "is_new"])) ??
      false,
    isExamApproaching:
      coerceBoolean(
        pick(row, ["is_exam_approaching", "exam_approaching", "upcoming_exam"]),
      ) ?? false,
    isExamPreparation:
      coerceBoolean(
        pick(row, [
          "is_exam_preparation",
          "exam_preparation",
          "is_exam",
          "preparation",
        ]),
      ) ?? false,
    hasSpecialNeeds:
      coerceBoolean(
        pick(row, [
          "has_special_needs",
          "special_needs",
          "is_special_needs",
        ]),
      ) ?? false,
    isAbsent7Days:
      coerceBoolean(
        pick(row, [
          "is_absent_7d",
          "absent_7d",
          "is_absent_seven_days",
          "absent_7_days",
        ]),
      ) ?? false,
    isSlowProgress14Days:
      coerceBoolean(
        pick(row, [
          "is_slow_progress_14d",
          "slow_progress_14d",
          "is_slow_progress",
          "slow_progress",
        ]),
      ) ?? false,
    hasActiveInstructive:
      coerceBoolean(
        pick(row, [
          "instructivo_active",
          "has_instructive_active",
          "active_instructive",
        ]),
      ) ?? false,
    hasOverdueInstructive:
      coerceBoolean(
        pick(row, [
          "instructivo_overdue",
          "has_instructive_overdue",
          "overdue_instructive",
        ]),
      ) ?? false,
  };
}

export async function listStudentManagementEntries(): Promise<StudentManagementEntry[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.student_management_v
    ORDER BY full_name ASC
  `);

  return rows
    .map(mapStudentManagementRow)
    .filter((student): student is StudentManagementEntry => Boolean(student));
}

export async function getStudentManagementEntry(
  studentId: number,
): Promise<StudentManagementEntry | null> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.student_management_v
    WHERE student_id = ${studentId}::bigint
      OR id = ${studentId}::bigint
    ORDER BY full_name ASC
    LIMIT 1
  `);

  if (!rows.length) {
    return null;
  }

  return mapStudentManagementRow(rows[0]);
}

export async function createStudentManagementEntry({
  fullName,
  plannedLevelMin,
  plannedLevelMax,
}: {
  fullName: string;
  plannedLevelMin: string;
  plannedLevelMax: string;
}): Promise<StudentManagementEntry> {
  const sql = getSqlClient();

  const sanitizedName = fullName.trim();
  if (!sanitizedName.length) {
    throw new Error("El nombre del estudiante es obligatorio.");
  }

  const sanitizedMin = plannedLevelMin.trim();
  const sanitizedMax = plannedLevelMax.trim();

  if (!sanitizedMin.length || !sanitizedMax.length) {
    throw new Error(
      "Debes indicar el nivel planificado mínimo y máximo para crear al estudiante.",
    );
  }

  const insertRows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.students (full_name, planned_level_min, planned_level_max, status)
    VALUES (${sanitizedName}, ${sanitizedMin}, ${sanitizedMax}, 'Activo')
    RETURNING id
  `);

  if (!insertRows.length) {
    throw new Error("No se pudo registrar al estudiante solicitado.");
  }

  const insertedId = Number(insertRows[0].id);

  const entry = await getStudentManagementEntry(insertedId);
  if (!entry) {
    throw new Error("No se pudo obtener el registro del estudiante creado.");
  }

  return entry;
}
