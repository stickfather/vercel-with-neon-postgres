import { getSqlClient, normalizeRows, SqlRow } from "@/lib/db/client";
import {
  isMissingStudentFlagRelation,
  STUDENT_FLAG_RELATION_CANDIDATES,
} from "./student-flag-relations";

export type StudentManagementEntry = {
  id: number;
  fullName: string;
  level: string | null;
  lesson: string | null;
  lastSeenAt: string | null;
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

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const numeric = Number.parseInt(value, 10);
    return Number.isFinite(numeric) ? numeric : null;
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

function isMissingColumnError(error: unknown, column: string): boolean {
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (code === "42703") {
      return true;
    }
    if (typeof message === "string") {
      return message.toLowerCase().includes(`column ${column}`.toLowerCase());
    }
  }
  return false;
}

function mapStudentManagementRow(row: SqlRow): StudentManagementEntry | null {
  const id = Number(row["student_id"] ?? row.id ?? row["id"] ?? 0);
  const fullName = ((row.full_name as string | null) ?? "").trim();

  if (!Number.isFinite(id) || id <= 0 || !fullName.length) {
    return null;
  }

  const latestLevel = coerceString(
    pick(row, [
      "latest_lesson_level",
      "lesson_level",
      "latest_level",
    ]),
  );

  const fallbackLevel = coerceString(
    pick(row, [
      "current_level",
      "level",
      "planned_level_max",
      "planned_level_min",
      "student_level",
    ]),
  );

  const resolvedLevel = latestLevel ?? fallbackLevel ?? null;

  const lessonName = coerceString(
    pick(row, ["latest_lesson_name", "lesson_name", "latest_lesson", "lesson"]),
  );
  const lessonSeq = coerceNumber(pick(row, ["latest_lesson_seq", "lesson_seq", "seq"]));
  const resolvedLesson = lessonName
    ? lessonName
    : lessonSeq != null
      ? resolvedLevel?.trim().toUpperCase() === "A1" && lessonSeq === 0
        ? "Intro Booklet"
        : `Lección ${lessonSeq}`
      : null;

  const lastSeenAt = coerceString(
    pick(row, ["latest_last_seen_at", "last_seen_at", "attended_at"]),
  );

  return {
    id,
    fullName,
    level: resolvedLevel,
    lesson: resolvedLesson,
    lastSeenAt: lastSeenAt,
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
  includeArchivedColumn = true,
  includeCoachPanelColumns = true,
): Promise<SqlRow[]> {
  const archivedSelection = includeArchivedColumn
    ? sql`COALESCE(s.archived, false) AS archived,`
    : sql`false AS archived,`;

  const coachPanelSelection = includeCoachPanelColumns
    ? sql`
          COALESCE(cp.level::text, s.planned_level_max::text, s.planned_level_min::text) AS level,
          cp.level::text AS current_level,
          cp.current_seq AS current_seq,`
    : sql`
          COALESCE(s.planned_level_max::text, s.planned_level_min::text) AS level,
          NULL::text AS current_level,
          NULL::integer AS current_seq,`;

  try {
    return normalizeRows<SqlRow>(
      await sql`
        SELECT
          s.id AS student_id,
          s.full_name AS full_name,
          latest.lesson_level AS latest_lesson_level,
          latest.lesson_name AS latest_lesson_name,
          latest.lesson_seq AS latest_lesson_seq,
          latest.last_seen_at::text AS latest_last_seen_at,
          ${coachPanelSelection}
          s.status AS status,
          s.contract_end::text AS contract_end,
          s.graduation_date::text AS graduation_date,
          ${archivedSelection}
          COALESCE(flags.is_new_student, false) AS is_new_student,
          COALESCE(flags.is_exam_preparation, false) AS is_exam_preparation,
          COALESCE(flags.has_special_needs, false) AS is_special_needs,
          COALESCE(flags.is_absent_7d, false) AS is_absent_7d,
          COALESCE(flags.is_slow_progress_14d, false) AS is_slow_progress_14d,
          COALESCE(flags.instructivo_active, false) AS instructivo_active,
          COALESCE(flags.instructivo_overdue, false) AS instructivo_overdue
        FROM public.students AS s
        ${includeCoachPanelColumns ? sql`LEFT JOIN mart.coach_panel_v AS cp ON cp.student_id = s.id` : sql``}
        LEFT JOIN LATERAL (
          SELECT
            sa.lesson_id,
            COALESCE(sa.checkout_time, sa.checkin_time) AS last_seen_at,
            l.level AS lesson_level,
            l.lesson AS lesson_name,
            l.seq AS lesson_seq
          FROM public.student_attendance sa
          LEFT JOIN public.lessons l ON l.id = sa.lesson_id
          WHERE sa.student_id = s.id
          ORDER BY COALESCE(sa.checkout_time, sa.checkin_time) DESC
          LIMIT 1
        ) AS latest ON TRUE
        LEFT JOIN ${sql.unsafe(relation)} AS flags ON flags.student_id = s.id
        WHERE TRIM(COALESCE(s.full_name, '')) <> ''
        ${studentId == null ? sql`` : sql`AND s.id = ${studentId}::bigint`}
        ORDER BY s.full_name ASC
        ${limitOne ? sql`LIMIT 1` : sql``}
      `,
    );
  } catch (error) {
    if (includeArchivedColumn && isMissingColumnError(error, "archived")) {
      console.warn(
        "La columna archived no está disponible en public.students. Continuaremos sin ese campo hasta que la base de datos se actualice.",
        error,
      );
      return runStudentManagementQuery(
        sql,
        relation,
        studentId,
        limitOne,
        false,
        includeCoachPanelColumns,
      );
    }
    if (includeCoachPanelColumns && (isMissingColumnError(error, "level") || isMissingColumnError(error, "cp.level"))) {
      console.warn(
        "Las columnas de mart.coach_panel_v no están disponibles. Continuaremos sin esos campos hasta que la base de datos se actualice.",
        error,
      );
      return runStudentManagementQuery(
        sql,
        relation,
        studentId,
        limitOne,
        includeArchivedColumn,
        false,
      );
    }
    throw error;
  }
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
    VALUES (${sanitizedName}, ${sanitizedMin}, ${sanitizedMax}, 'active')
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
