import {
  closeExpiredSessions,
  getSqlClient,
  isMissingRelationError,
  normalizeRows,
  SqlRow,
} from "@/lib/db/client";

export type StudentName = {
  id: number;
  fullName: string;
};

export type LessonOption = {
  id: number;
  lesson: string;
  level: string;
  sequence: number | null;
};

export type LevelLessons = {
  level: string;
  lessons: LessonOption[];
};

export type ActiveAttendance = {
  id: number;
  fullName: string;
  lesson: string | null;
  level: string | null;
  lessonSequence: number | null;
  checkInTime: string;
};

export type StudentLastLesson = {
  lessonId: number;
  lessonName: string;
  level: string;
  sequence: number | null;
  attendedAt: string;
};

export type LessonSelectionValidation = {
  needsConfirmation: boolean;
  lastLessonName: string | null;
  lastLessonSequence: number | null;
  selectedLessonName: string | null;
  selectedLessonSequence: number | null;
};

export type StudentStatusCheck = {
  isActive: boolean;
  statusLabel: string | null;
};

function isIgnorableFlagRefreshError(error: unknown): boolean {
  if (isMissingRelationError(error)) {
    return true;
  }
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (code === "42883" || code === "3F000") {
      return true;
    }
    if (typeof message === "string") {
      const normalized = message.toLowerCase();
      if (
        normalized.includes("does not exist") &&
        (normalized.includes("function") ||
          normalized.includes("schema") ||
          normalized.includes("relation"))
      ) {
        return true;
      }
      if (normalized.includes("mart.refresh_flags")) {
        return true;
      }
    }
  }
  return false;
}

async function refreshStudentFlagsRecord(
  sql: ReturnType<typeof getSqlClient>,
  studentId: number,
): Promise<void> {
  try {
    await sql`
      INSERT INTO public.student_flags (student_id)
      VALUES (${studentId}::bigint)
      ON CONFLICT (student_id) DO NOTHING
    `;
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }
    console.warn(
      "No se pudo actualizar la tabla 'student_flags' tras el check-in.",
      error,
    );
    return;
  }

  try {
    await sql`SELECT public.refresh_student_flags(${studentId}::bigint)`;
  } catch (error) {
    if (isIgnorableFlagRefreshError(error)) {
      console.warn(
        "No se pudo ejecutar 'public.refresh_student_flags' tras el check-in.",
        error,
      );
      return;
    }
    throw error;
  }
}

export async function getStudentDirectory(): Promise<StudentName[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, full_name
    FROM students
    WHERE TRIM(COALESCE(full_name, '')) <> ''
    ORDER BY full_name ASC
  `);

  return rows
    .map((row) => ({
      id: Number(row.id),
      fullName: ((row.full_name as string) ?? "").trim(),
    }))
    .filter((entry) => entry.fullName.length);
}

export async function searchStudents(
  query: string,
  limit = 6,
): Promise<StudentName[]> {
  const sql = getSqlClient();
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    const rows = normalizeRows<SqlRow>(await sql`
      SELECT id, full_name
      FROM students
      WHERE TRIM(COALESCE(full_name, '')) <> ''
      ORDER BY full_name ASC
      LIMIT ${limit}
    `);

    return rows
      .map((row) => ({
        id: Number(row.id),
        fullName: ((row.full_name as string) ?? "").trim(),
      }))
      .filter((entry) => entry.fullName.length);
  }

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, full_name
    FROM students
    WHERE TRIM(COALESCE(full_name, '')) <> ''
      AND full_name ILIKE ${"%" + trimmedQuery + "%"}
    ORDER BY full_name ASC
    LIMIT ${limit}
  `);

  return rows
    .map((row) => ({
      id: Number(row.id),
      fullName: ((row.full_name as string) ?? "").trim(),
    }))
    .filter((entry) => entry.fullName.length);
}

export async function getLevelsWithLessons(): Promise<LevelLessons[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, lesson, level, seq
    FROM lessons
    WHERE TRIM(COALESCE(lesson, '')) <> ''
    ORDER BY level ASC, seq ASC NULLS LAST, lesson ASC
  `);

  const grouped = new Map<string, LessonOption[]>();

  for (const row of rows) {
    const level = ((row.level as string) ?? "").trim();
    if (!level) continue;
    if (!grouped.has(level)) grouped.set(level, []);
    grouped.get(level)!.push({
      id: Number(row.id),
      lesson: row.lesson as string,
      level,
      sequence: row.seq === null ? null : Number(row.seq),
    });
  }

  return Array.from(grouped.entries())
    .map(([level, lessons]) => ({ level, lessons }))
    .filter((entry) => entry.lessons.length);
}

export async function getActiveAttendances(): Promise<ActiveAttendance[]> {
  const sql = getSqlClient();
  await closeExpiredSessions(sql);

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      sa.id,
      COALESCE(s.full_name, '') AS full_name,
      sa.checkin_time,
      l.lesson,
      l.level AS level,
      l.seq AS lesson_sequence
    FROM student_attendance sa
    LEFT JOIN students s ON s.id = sa.student_id
    LEFT JOIN lessons l ON l.id = sa.lesson_id
    WHERE sa.checkout_time IS NULL
    ORDER BY sa.checkin_time ASC
  `);

  return rows
    .map((row) => ({
      id: Number(row.id),
      fullName: (row.full_name as string | null) ?? "",
      lesson: (row.lesson as string | null) ?? null,
      level: (row.level as string | null) ?? null,
      lessonSequence:
        row.lesson_sequence == null ? null : Number(row.lesson_sequence),
      checkInTime: row.checkin_time as string,
    }))
    .filter((attendance) => attendance.fullName.trim().length);
}

export async function getStudentStatusForCheckIn(
  studentId: number,
): Promise<StudentStatusCheck> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT status
    FROM students
    WHERE id = ${studentId}
    LIMIT 1
  `);

  if (!rows.length) {
    throw new Error("No encontramos a la persona seleccionada en la base de datos.");
  }

  const statusValue = (rows[0].status as string | null) ?? null;
  const trimmed = statusValue?.trim() ?? null;
  const normalized = trimmed?.toLowerCase() ?? null;

  const isActive =
    normalized == null ||
    normalized === "activo" ||
    normalized === "activa" ||
    normalized === "active";

  return {
    isActive,
    statusLabel: trimmed,
  };
}

export async function validateStudentLessonSelection(
  studentId: number,
  lessonId: number,
): Promise<LessonSelectionValidation> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM validate_student_lesson_selection(${studentId}, ${lessonId})
  `);

  if (!rows.length) {
    return {
      needsConfirmation: false,
      lastLessonName: null,
      lastLessonSequence: null,
      selectedLessonName: null,
      selectedLessonSequence: null,
    };
  }

  const payload = rows[0];

  return {
    needsConfirmation: Boolean(payload.needs_confirmation ?? false),
    lastLessonName: (payload.last_lesson_name as string | null) ?? null,
    lastLessonSequence:
      payload.last_lesson_seq == null
        ? null
        : Number(payload.last_lesson_seq),
    selectedLessonName: (payload.selected_name as string | null) ?? null,
    selectedLessonSequence:
      payload.selected_seq == null ? null : Number(payload.selected_seq),
  };
}

export async function registerCheckIn({
  studentId,
  lessonId,
  level,
  confirmOverride = false,
}: {
  studentId: number;
  lessonId: number;
  level: string;
  confirmOverride?: boolean;
}): Promise<number> {
  const sql = getSqlClient();
  await closeExpiredSessions(sql);

  const studentRows = normalizeRows<SqlRow>(await sql`
    SELECT id, full_name, status
    FROM students
    WHERE id = ${studentId}
    LIMIT 1
  `);

  if (!studentRows.length) {
    throw new Error("No encontramos a la persona seleccionada en la base de datos.");
  }

  const studentRecord = studentRows[0];
  const studentName = ((studentRecord.full_name as string | null) ?? "").trim();
  const rawStatus = (studentRecord.status as string | null) ?? null;
  const normalizedStatus = rawStatus?.trim().toLowerCase() ?? null;

  if (!studentName) {
    throw new Error("El estudiante seleccionado no tiene un nombre registrado.");
  }

  if (
    normalizedStatus &&
    normalizedStatus !== "activo" &&
    normalizedStatus !== "activa" &&
    normalizedStatus !== "active"
  ) {
    throw new Error(
      "Tu cuenta requiere atención. Por favor, contacta a la administración.",
    );
  }

  const lessonRows = normalizeRows<SqlRow>(await sql`
    SELECT id, level
    FROM lessons
    WHERE id = ${lessonId}
    LIMIT 1
  `);

  if (!lessonRows.length) throw new Error("La lección seleccionada no existe.");

  const lesson = lessonRows[0];
  const lessonLevel = ((lesson.level as string | null) ?? "").trim();
  if (lessonLevel.toLowerCase() !== level.trim().toLowerCase()) {
    throw new Error("La lección no corresponde al nivel elegido.");
  }

  const existingRows = normalizeRows<SqlRow>(await sql`
    SELECT id
    FROM student_attendance
    WHERE checkout_time IS NULL
      AND student_id = ${studentId}
    LIMIT 1
  `);
  if (existingRows.length) {
    throw new Error("El estudiante ya tiene una asistencia abierta.");
  }

  const insertedRows = normalizeRows<SqlRow>(await sql`
    INSERT INTO student_attendance (student_id, lesson_id, checkin_time, confirm_override)
    VALUES (${studentId}, ${lessonId}, now(), ${Boolean(confirmOverride)})
    RETURNING id
  `);

  try {
    await refreshStudentFlagsRecord(sql, studentId);
  } catch (error) {
    console.warn(
      "No se pudo actualizar las banderas del estudiante tras el check-in.",
      error,
    );
  }

  return Number(insertedRows[0].id);
}

export async function registerCheckOut(attendanceId: number): Promise<void> {
  const sql = getSqlClient();

  const updatedRows = normalizeRows<SqlRow>(await sql`
    UPDATE student_attendance
    SET checkout_time = now()
    WHERE id = ${attendanceId}
      AND checkout_time IS NULL
    RETURNING id
  `);

  if (!updatedRows.length) {
    throw new Error("La asistencia ya estaba cerrada o no existe.");
  }
}

export async function getStudentLastLesson(
  studentId: number,
): Promise<StudentLastLesson | null> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      sa.lesson_id,
      sa.checkin_time,
      COALESCE(sa.checkout_time, sa.checkin_time) AS attended_at,
      l.lesson,
      l.level,
      l.seq
    FROM student_attendance sa
    LEFT JOIN lessons l ON l.id = sa.lesson_id
    WHERE sa.student_id = ${studentId}
      AND sa.lesson_id IS NOT NULL
    ORDER BY COALESCE(sa.checkout_time, sa.checkin_time) DESC
    LIMIT 1
  `);

  if (!rows.length) {
    return null;
  }

  const record = rows[0];
  const lessonId = Number(record.lesson_id);
  if (!Number.isFinite(lessonId)) {
    return null;
  }

  const lessonName = ((record.lesson as string | null) ?? "").trim();
  const level = ((record.level as string | null) ?? "").trim();

  if (!lessonName || !level) {
    return null;
  }

  return {
    lessonId,
    lessonName,
    level,
    sequence: record.seq == null ? null : Number(record.seq),
    attendedAt: String(record.attended_at ?? record.checkin_time ?? new Date().toISOString()),
  };
}
