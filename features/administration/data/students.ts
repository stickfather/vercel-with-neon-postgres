import { getSqlClient, normalizeRows, SqlRow } from "@/lib/db/client";
import {
  isMissingStudentFlagRelation,
  STUDENT_FLAG_RELATION_CANDIDATES,
} from "./student-flag-relations";

export type StudentManagementEntry = {
  id: number;
  fullName: string;
  level: string | null;
  status: string | null;
  contractEnd: string | null;
  graduationDate: string | null;
  isNewStudent: boolean;
  isExamPreparation: boolean;
  hasSpecialNeeds: boolean;
  isAbsent7Days: boolean;
  isSlowProgress14Days: boolean;
  hasActiveInstructive: boolean;
  hasOverdueInstructive: boolean;
  archived: boolean;
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
    status:
      coerceString(pick(row, ["status", "state", "student_state"])) ?? null,
    contractEnd:
      coerceString(pick(row, ["contract_end", "contractEnd", "end_date"])) ??
      null,
    graduationDate:
      coerceString(
        pick(row, ["graduation_date", "graduationDate", "grad_date"]),
      ) ?? null,
    isNewStudent:
      coerceBoolean(pick(row, ["is_new_student", "new_student", "is_new"])) ??
      false,
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
    archived:
      coerceBoolean(pick(row, ["archived", "is_archived"])) ?? false,
  };
}

async function runStudentManagementQuery(
  sql: ReturnType<typeof getSqlClient>,
  relation: (typeof STUDENT_FLAG_RELATION_CANDIDATES)[number],
  studentId?: number,
  limitOne = false,
): Promise<SqlRow[]> {
  return normalizeRows<SqlRow>(
    await sql`
      SELECT
        s.id AS student_id,
        s.full_name AS full_name,
        s.current_level::text AS level,
      s.status AS status,
      s.contract_end::text AS contract_end,
      s.graduation_date::text AS graduation_date,
      COALESCE(s.archived, false) AS archived,
      COALESCE(flags.is_new_student, false) AS is_new_student,
        COALESCE(flags.is_exam_preparation, false) AS is_exam_preparation,
        COALESCE(flags.has_special_needs, false) AS has_special_needs,
        COALESCE(flags.is_absent_7d, false) AS is_absent_7d,
        COALESCE(flags.is_slow_progress_14d, false) AS is_slow_progress_14d,
        COALESCE(flags.instructivo_active, false) AS instructivo_active,
        COALESCE(flags.instructivo_overdue, false) AS instructivo_overdue
      FROM public.students AS s
      LEFT JOIN ${sql.unsafe(relation)} AS flags ON flags.student_id = s.id
      WHERE TRIM(COALESCE(s.full_name, '')) <> ''
      ${studentId == null ? sql`` : sql`AND s.id = ${studentId}::bigint`}
      ORDER BY s.full_name ASC
      ${limitOne ? sql`LIMIT 1` : sql``}
    `,
  );
}

export async function listStudentManagementEntries(): Promise<StudentManagementEntry[]> {
  const sql = getSqlClient();
  const rows = await fetchStudentManagementRows(sql);

  return rows
    .map(mapStudentManagementRow)
    .filter((student): student is StudentManagementEntry => Boolean(student));
}

export async function getStudentManagementEntry(
  studentId: number,
): Promise<StudentManagementEntry | null> {
  const sql = getSqlClient();
  const rows = await fetchStudentManagementRows(sql, studentId, true);
  if (!rows.length) {
    return null;
  }

  return mapStudentManagementRow(rows[0]);
}

async function fetchStudentManagementRows(
  sql: ReturnType<typeof getSqlClient>,
  studentId?: number,
  limitOne = false,
): Promise<SqlRow[]> {
  let lastError: unknown = null;

  for (const relation of STUDENT_FLAG_RELATION_CANDIDATES) {
    try {
      return await runStudentManagementQuery(sql, relation, studentId, limitOne);
    } catch (error) {
      if (isMissingStudentFlagRelation(error, relation)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  if (lastError) {
    console.warn(
      "No pudimos encontrar una relación de banderas de estudiantes compatible."
        + " Continuaremos sin banderas hasta que la base de datos se actualice.",
      lastError,
    );
  }

  return [];
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
