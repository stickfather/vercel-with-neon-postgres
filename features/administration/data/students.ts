import {
  getSqlClient,
  isFeatureNotSupportedError,
  isMissingRelationError,
  isPermissionDeniedError,
  normalizeRows,
  SqlRow,
} from "@/lib/db/client";

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

export type StudentFlagKey =
  | "isNewStudent"
  | "isExamApproaching"
  | "isExamPreparation"
  | "hasSpecialNeeds"
  | "isAbsent7Days"
  | "isSlowProgress14Days"
  | "hasActiveInstructive"
  | "hasOverdueInstructive";

const STUDENT_FLAG_KEYS: readonly StudentFlagKey[] = [
  "isNewStudent",
  "isExamApproaching",
  "isExamPreparation",
  "hasSpecialNeeds",
  "isAbsent7Days",
  "isSlowProgress14Days",
  "hasActiveInstructive",
  "hasOverdueInstructive",
];

const FLAG_SOURCE_COLUMNS: Record<StudentFlagKey, string[]> = {
  isNewStudent: ["is_new_student", "new_student", "is_new"],
  isExamApproaching: [
    "is_exam_approaching",
    "exam_approaching",
    "upcoming_exam",
  ],
  isExamPreparation: [
    "is_exam_preparation",
    "exam_preparation",
    "is_exam",
    "preparation",
  ],
  hasSpecialNeeds: [
    "has_special_needs",
    "special_needs",
    "is_special_needs",
  ],
  isAbsent7Days: [
    "is_absent_7d",
    "absent_7d",
    "is_absent_seven_days",
    "absent_7_days",
  ],
  isSlowProgress14Days: [
    "is_slow_progress_14d",
    "slow_progress_14d",
    "is_slow_progress",
    "slow_progress",
  ],
  hasActiveInstructive: [
    "instructivo_active",
    "has_instructive_active",
    "active_instructive",
  ],
  hasOverdueInstructive: [
    "instructivo_overdue",
    "has_instructive_overdue",
    "overdue_instructive",
  ],
};

const LEVEL_COLUMN_CANDIDATES = [
  "level",
  "current_level",
  "last_level",
  "student_level",
];

const STATE_COLUMN_CANDIDATES = [
  "state",
  "status",
  "student_state",
];

const NAME_COLUMN_CANDIDATES = ["full_name", "student_name", "name"];

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

function normalizeLevelCode(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }
  return trimmed.toUpperCase();
}

function pick<T = unknown>(row: SqlRow, keys: string[]): T | null {
  for (const key of keys) {
    if (key in row && row[key] != null) {
      return row[key] as T;
    }
  }
  return null;
}

function extractFlagValues(
  row: SqlRow,
): Partial<Record<StudentFlagKey, boolean>> {
  const result: Partial<Record<StudentFlagKey, boolean>> = {};
  for (const flagKey of STUDENT_FLAG_KEYS) {
    const value = coerceBoolean(pick(row, FLAG_SOURCE_COLUMNS[flagKey]));
    if (value != null) {
      result[flagKey] = value;
    }
  }
  return result;
}

function applyFlagValues(
  entry: StudentManagementEntry,
  values: Partial<Record<StudentFlagKey, boolean>>,
) {
  for (const flagKey of STUDENT_FLAG_KEYS) {
    if (values[flagKey] != null) {
      entry[flagKey] = values[flagKey]!;
    }
  }
}

function createEmptyManagementEntry(
  id: number,
  fullName: string | null,
): StudentManagementEntry {
  return {
    id,
    fullName: (fullName ?? "").trim(),
    level: null,
    state: null,
    isNewStudent: false,
    isExamApproaching: false,
    isExamPreparation: false,
    hasSpecialNeeds: false,
    isAbsent7Days: false,
    isSlowProgress14Days: false,
    hasActiveInstructive: false,
    hasOverdueInstructive: false,
  };
}

type StudentFlagSnapshot = {
  id: number;
  fullName: string | null;
  level?: string | null;
  state?: string | null;
  flags: Partial<Record<StudentFlagKey, boolean>>;
};

function mapStudentFlagSnapshot(row: SqlRow): StudentFlagSnapshot | null {
  const id = Number(row["student_id"] ?? row.id ?? row["id"] ?? 0);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  const rawName = coerceString(pick(row, NAME_COLUMN_CANDIDATES));
  const levelValue = coerceString(pick(row, LEVEL_COLUMN_CANDIDATES));
  const stateValue = coerceString(pick(row, STATE_COLUMN_CANDIDATES));

  return {
    id,
    fullName: rawName,
    ...(levelValue !== null ? { level: normalizeLevelCode(levelValue) } : {}),
    ...(stateValue !== null ? { state: stateValue } : {}),
    flags: extractFlagValues(row),
  };
}

async function refreshStudentFlagsView() {
  const sql = getSqlClient();

  const refresh = async (concurrent: boolean) => {
    if (concurrent) {
      await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY public.student_flags_v`;
    } else {
      await sql`REFRESH MATERIALIZED VIEW public.student_flags_v`;
    }
  };

  try {
    await refresh(true);
  } catch (error) {
    if (isMissingRelationError(error, "student_flags_v")) {
      return;
    }
    if (isPermissionDeniedError(error)) {
      console.warn(
        "No pudimos refrescar 'student_flags_v' por falta de permisos.",
        error,
      );
      return;
    }
    if (isFeatureNotSupportedError(error)) {
      try {
        await refresh(false);
      } catch (fallbackError) {
        if (isMissingRelationError(fallbackError, "student_flags_v")) {
          return;
        }
        if (isPermissionDeniedError(fallbackError)) {
          console.warn(
            "No pudimos refrescar 'student_flags_v' por falta de permisos.",
            fallbackError,
          );
          return;
        }
        if (isFeatureNotSupportedError(fallbackError)) {
          console.warn(
            "El entorno no soporta refrescar 'student_flags_v'. Se utilizarán los datos existentes.",
            fallbackError,
          );
          return;
        }
        console.warn(
          "No pudimos refrescar 'student_flags_v' por un error inesperado.",
          fallbackError,
        );
        return;
      }
      return;
    }
    console.warn(
      "No pudimos refrescar 'student_flags_v' por un error inesperado.",
      error,
    );
  }
}

function mapStudentManagementRow(row: SqlRow): StudentManagementEntry | null {
  const id = Number(row["student_id"] ?? row.id ?? row["id"] ?? 0);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  const nameValue = coerceString(pick(row, NAME_COLUMN_CANDIDATES)) ?? "";
  const trimmedName = nameValue.trim();
  if (!trimmedName.length) {
    return null;
  }

  const entry = createEmptyManagementEntry(id, trimmedName);

  const levelValue = coerceString(pick(row, LEVEL_COLUMN_CANDIDATES));
  if (levelValue !== null) {
    entry.level = normalizeLevelCode(levelValue);
  }

  const stateValue = coerceString(pick(row, STATE_COLUMN_CANDIDATES));
  if (stateValue !== null) {
    entry.state = stateValue;
  }

  applyFlagValues(entry, extractFlagValues(row));

  return entry;
}

export async function listStudentManagementEntries(): Promise<StudentManagementEntry[]> {
  const sql = getSqlClient();

  await refreshStudentFlagsView();

  let managementRows: SqlRow[] = [];
  try {
    managementRows = normalizeRows<SqlRow>(await sql`
      SELECT *
      FROM public.student_management_v
      ORDER BY full_name ASC
    `);
  } catch (error) {
    if (isMissingRelationError(error, "student_management_v")) {
      managementRows = [];
    } else if (isPermissionDeniedError(error)) {
      console.warn(
        "No pudimos acceder a 'student_management_v' por falta de permisos.",
        error,
      );
      managementRows = [];
    } else {
      throw error;
    }
  }

  let flagRows: SqlRow[] = [];
  try {
    flagRows = normalizeRows<SqlRow>(await sql`
      SELECT *
      FROM public.student_flags_v
      ORDER BY full_name ASC
    `);
  } catch (error) {
    if (isMissingRelationError(error, "student_flags_v")) {
      flagRows = [];
    } else if (isPermissionDeniedError(error)) {
      console.warn(
        "No pudimos acceder a 'student_flags_v' por falta de permisos.",
        error,
      );
      flagRows = [];
    } else {
      throw error;
    }
  }

  const entries = new Map<number, StudentManagementEntry>();

  managementRows
    .map(mapStudentManagementRow)
    .filter((student): student is StudentManagementEntry => Boolean(student))
    .forEach((student) => {
      student.fullName = student.fullName.trim();
      if (student.level) {
        student.level = normalizeLevelCode(student.level) ?? null;
      }
      if (student.state) {
        const trimmedState = student.state.trim();
        student.state = trimmedState.length ? trimmedState : null;
      }
      entries.set(student.id, student);
    });

  flagRows
    .map(mapStudentFlagSnapshot)
    .filter((snapshot): snapshot is StudentFlagSnapshot => Boolean(snapshot))
    .forEach((snapshot) => {
      const existing = entries.get(snapshot.id);
      const entry =
        existing ?? createEmptyManagementEntry(snapshot.id, snapshot.fullName);

      if (snapshot.fullName && snapshot.fullName.trim().length) {
        entry.fullName = snapshot.fullName.trim();
      }

      if (snapshot.level !== undefined) {
        entry.level = snapshot.level ?? null;
      }

      if (snapshot.state !== undefined) {
        const trimmedState = snapshot.state?.trim() ?? "";
        entry.state = trimmedState.length ? trimmedState : null;
      }

      applyFlagValues(entry, snapshot.flags);

      entries.set(entry.id, entry);
    });

  const results: StudentManagementEntry[] = [];
  for (const entry of entries.values()) {
    const trimmedName = entry.fullName.trim();
    if (!trimmedName.length) {
      continue;
    }
    entry.fullName = trimmedName;
    if (entry.level) {
      entry.level = normalizeLevelCode(entry.level) ?? null;
    }
    results.push(entry);
  }

  return results;
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

export async function createStudent({
  fullName,
  plannedLevelMin,
  plannedLevelMax,
}: {
  fullName: string;
  plannedLevelMin: string;
  plannedLevelMax: string;
}): Promise<StudentManagementEntry> {
  const sql = getSqlClient();

  const trimmedName = fullName.trim();
  if (!trimmedName.length) {
    throw new Error("El nombre del estudiante es obligatorio.");
  }

  const normalizedMin = normalizeLevelCode(plannedLevelMin);
  const normalizedMax = normalizeLevelCode(plannedLevelMax);

  const insertedRows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.students (
      full_name,
      planned_level_min,
      planned_level_max,
      created_at,
      updated_at
    )
    VALUES (
      ${trimmedName},
      ${normalizedMin ?? null}::level_code,
      ${normalizedMax ?? null}::level_code,
      NOW(),
      NOW()
    )
    RETURNING id
  `);

  if (!insertedRows.length) {
    throw new Error("No se pudo crear el estudiante.");
  }

  const studentId = Number(insertedRows[0].id);

  await sql`
    INSERT INTO public.student_flags (student_id)
    VALUES (${studentId}::bigint)
    ON CONFLICT (student_id) DO NOTHING
  `;

  const entry = await getStudentManagementEntry(studentId);
  if (entry) {
    return entry;
  }

  return {
    id: studentId,
    fullName: trimmedName,
    level: null,
    state: null,
    isNewStudent: false,
    isExamApproaching: false,
    isExamPreparation: false,
    hasSpecialNeeds: false,
    isAbsent7Days: false,
    isSlowProgress14Days: false,
    hasActiveInstructive: false,
    hasOverdueInstructive: false,
  };
}

export async function deleteStudent(
  studentId: number,
): Promise<{ id: number; fullName: string }> {
  const sql = getSqlClient();

  const existingRows = normalizeRows<SqlRow>(await sql`
    SELECT id, full_name
    FROM public.students
    WHERE id = ${studentId}::bigint
    LIMIT 1
  `);

  if (!existingRows.length) {
    throw new Error("Estudiante no encontrado.");
  }

  const rawName = existingRows[0].full_name as string | null;
  const fullName = (rawName ?? "").trim();

  const safeDelete = async (
    promise: Promise<unknown>,
    relation: string,
  ) => {
    try {
      await promise;
    } catch (error) {
      if (!isMissingRelationError(error, relation)) {
        throw error;
      }
    }
  };

  await safeDelete(
    sql`DELETE FROM public.student_payment_schedule WHERE student_id = ${studentId}::bigint`,
    "student_payment_schedule",
  );
  await safeDelete(
    sql`DELETE FROM public.student_notes WHERE student_id = ${studentId}::bigint`,
    "student_notes",
  );
  await safeDelete(
    sql`DELETE FROM public.exam_appointments WHERE student_id = ${studentId}::bigint`,
    "exam_appointments",
  );
  await safeDelete(
    sql`DELETE FROM public.student_instructivos WHERE student_id = ${studentId}::bigint`,
    "student_instructivos",
  );
  await safeDelete(
    sql`DELETE FROM public.student_attendance WHERE student_id = ${studentId}::bigint`,
    "student_attendance",
  );
  await safeDelete(
    sql`DELETE FROM public.student_flags WHERE student_id = ${studentId}::bigint`,
    "student_flags",
  );

  const deletedRows = normalizeRows<SqlRow>(await sql`
    DELETE FROM public.students
    WHERE id = ${studentId}::bigint
    RETURNING id
  `);

  if (!deletedRows.length) {
    throw new Error("No se pudo eliminar al estudiante.");
  }

  return { id: studentId, fullName };
}
