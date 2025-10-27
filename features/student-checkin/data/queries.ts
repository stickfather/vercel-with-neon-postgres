import { getSqlClient, normalizeRows, SqlRow } from "@/lib/db/client";

export type StudentName = {
  id: number;
  fullName: string;
};

export type LessonOption = {
  id: number;
  lesson: string;
  level: string;
  sequence: number | null;
  globalSequence: number | null;
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
  lessonGlobalSequence: number | null;
  checkInTime: string;
};

export type StudentLastLesson = {
  lessonId: number;
  lessonName: string;
  level: string;
  sequence: number | null;
  globalSequence: number | null;
  attendedAt: string;
};

export type LessonSelectionValidation = {
  needsConfirmation: boolean;
  lastLessonName: string | null;
  lastLessonSequence: number | null;
  selectedLessonName: string | null;
  selectedLessonSequence: number | null;
};

function toNullableSequence(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type StudentStatusCheck = {
  isActive: boolean;
  statusLabel: string | null;
};

const CEFR_LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

function resolveLevelRank(level: string | null | undefined): number | null {
  if (!level) {
    return null;
  }

  const normalized = level.trim().toUpperCase();
  for (let index = 0; index < CEFR_LEVEL_ORDER.length; index += 1) {
    if (normalized.startsWith(CEFR_LEVEL_ORDER[index])) {
      return index;
    }
  }

  return null;
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

export async function getLevelsWithLessons(
  studentId?: number,
): Promise<LevelLessons[]> {
  const sql = getSqlClient();

  let minRank = 0;
  let maxRank = CEFR_LEVEL_ORDER.length - 1;

  if (Number.isFinite(studentId)) {
    const planRows = normalizeRows<SqlRow>(await sql`
      SELECT planned_level_min, planned_level_max
      FROM public.students
      WHERE id = ${Number(studentId)}
      LIMIT 1
    `);

    if (planRows.length) {
      const row = planRows[0];
      const rawMin = (row.planned_level_min as string | null) ?? null;
      const rawMax = (row.planned_level_max as string | null) ?? null;

      const resolvedMin = resolveLevelRank(rawMin);
      const resolvedMax = resolveLevelRank(rawMax);

      if (resolvedMin != null) {
        minRank = resolvedMin;
      }
      if (resolvedMax != null) {
        maxRank = resolvedMax;
      }
      if (minRank > maxRank) {
        const temp = minRank;
        minRank = maxRank;
        maxRank = temp;
      }
    }
  }

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      l.id AS lesson_id,
      TRIM(l.level) AS level_code,
      l.seq AS global_seq,
      ROW_NUMBER() OVER (
        PARTITION BY TRIM(l.level)
        ORDER BY l.seq
      ) - 1 AS level_seq,
      l.lesson AS lesson_name
    FROM public.lessons l
    WHERE TRIM(COALESCE(l.lesson, '')) <> ''
    ORDER BY l.seq ASC, l.id ASC
  `);

  const grouped = new Map<string, LessonOption[]>();

  for (const row of rows) {
    const rawLevel = row.level_code as string | null;
    const level = (rawLevel ?? "").trim();
    if (!level) continue;
    const rank = resolveLevelRank(level);
    if (rank != null && (rank < minRank || rank > maxRank)) {
      continue;
    }

    const lessonId = Number(row.lesson_id);
    if (!Number.isFinite(lessonId)) {
      continue;
    }

    const sequence =
      row.level_seq == null || Number.isNaN(Number(row.level_seq))
        ? null
        : Number(row.level_seq);
    const globalSequence =
      row.global_seq == null || Number.isNaN(Number(row.global_seq))
        ? null
        : Number(row.global_seq);
    const lessonName = ((row.lesson_name as string) ?? "").trim();

    if (!grouped.has(level)) grouped.set(level, []);
    grouped.get(level)!.push({
      id: lessonId,
      lesson: lessonName,
      level,
      sequence,
      globalSequence,
    });
  }

  const sortLevels = (a: string, b: string) => {
    const rankA = resolveLevelRank(a);
    const rankB = resolveLevelRank(b);
    if (rankA != null && rankB != null) {
      if (rankA === rankB) return 0;
      return rankA < rankB ? -1 : 1;
    }
    if (rankA != null) {
      return -1;
    }
    if (rankB != null) {
      return 1;
    }
    return a.localeCompare(b, "es", { sensitivity: "base" });
  };

  const sortLessons = (a: LessonOption, b: LessonOption) => {
    const seqA =
      a.sequence != null && Number.isFinite(a.sequence)
        ? a.sequence
        : a.globalSequence != null && Number.isFinite(a.globalSequence)
          ? a.globalSequence
          : Number.MAX_SAFE_INTEGER;
    const seqB =
      b.sequence != null && Number.isFinite(b.sequence)
        ? b.sequence
        : b.globalSequence != null && Number.isFinite(b.globalSequence)
          ? b.globalSequence
          : Number.MAX_SAFE_INTEGER;
    if (seqA === seqB) {
      return a.id - b.id;
    }
    return seqA - seqB;
  };

  return Array.from(grouped.entries())
    .sort(([levelA], [levelB]) => sortLevels(levelA, levelB))
    .map(([level, lessons]) => ({ level, lessons: [...lessons].sort(sortLessons) }))
    .filter((entry) => entry.lessons.length);
}

export async function getActiveAttendances(): Promise<ActiveAttendance[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      sa.id,
      COALESCE(s.full_name, '') AS full_name,
      sa.checkin_time,
      l.lesson,
      lg.level AS level,
      lg.seq AS lesson_sequence,
      lg.lesson_global_seq AS lesson_global_sequence
    FROM public.student_attendance sa
    LEFT JOIN students s ON s.id = sa.student_id
    LEFT JOIN mart.lessons_global_v lg ON lg.lesson_id = sa.lesson_id
    LEFT JOIN public.lessons l ON l.id = sa.lesson_id
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
      lessonGlobalSequence:
        row.lesson_global_sequence == null
          ? null
          : Number(row.lesson_global_sequence),
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

  const [lastLessonResult, selectedLessonResult] = await Promise.all([
    sql`
      SELECT
        sa.lesson_id,
        l.lesson,
        lg.seq,
        lg.lesson_global_seq
      FROM public.student_attendance sa
      LEFT JOIN mart.lessons_global_v lg ON lg.lesson_id = sa.lesson_id
      LEFT JOIN public.lessons l ON l.id = sa.lesson_id
      WHERE sa.student_id = ${studentId}
      ORDER BY COALESCE(sa.checkout_time, sa.checkin_time) DESC
      LIMIT 1
    `,
    sql`
      SELECT l.lesson, lg.seq, lg.lesson_global_seq
      FROM mart.lessons_global_v lg
      JOIN public.lessons l ON l.id = lg.lesson_id
      WHERE lg.lesson_id = ${lessonId}
      LIMIT 1
    `,
  ]);

  const lastLessonRows = normalizeRows<SqlRow>(lastLessonResult);
  const selectedLessonRows = normalizeRows<SqlRow>(selectedLessonResult);

  const lastLesson = lastLessonRows[0] ?? null;
  const selectedLesson = selectedLessonRows[0] ?? null;

  return {
    needsConfirmation: false,
    lastLessonName: (lastLesson?.lesson as string | null) ?? null,
    lastLessonSequence: toNullableSequence(lastLesson?.seq),
    selectedLessonName: (selectedLesson?.lesson as string | null) ?? null,
    selectedLessonSequence: toNullableSequence(selectedLesson?.seq),
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
    SELECT lesson_id, level
    FROM mart.lessons_global_v
    WHERE lesson_id = ${lessonId}
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
    FROM public.student_attendance
    WHERE checkout_time IS NULL
      AND student_id = ${studentId}
    LIMIT 1
  `);
  if (existingRows.length) {
    throw new Error("El estudiante ya tiene una asistencia abierta.");
  }

  const insertedRows = normalizeRows<SqlRow>(
    await sql`
      SELECT public.student_checkin(${studentId}::bigint, ${lessonId}::bigint) AS attendance_id
    `,
  );

  if (!insertedRows.length) {
    throw new Error("No se pudo registrar la asistencia del estudiante.");
  }

  const attendanceId = Number(insertedRows[0].attendance_id);
  if (!Number.isFinite(attendanceId)) {
    throw new Error("El identificador de la asistencia registrada no es válido.");
  }

  if (confirmOverride) {
    await sql`
      UPDATE public.student_attendance
      SET override_ok = TRUE
      WHERE id = ${attendanceId}::bigint
    `;
  }

  return attendanceId;
}

export async function registerCheckOut(
  attendanceId: number,
): Promise<ActiveAttendance[]> {
  const sql = getSqlClient();

  const existingRows = normalizeRows<SqlRow>(
    await sql`
      SELECT id, student_id, checkout_time
      FROM public.student_attendance
      WHERE id = ${attendanceId}::bigint
      LIMIT 1
    `,
  );

  if (!existingRows.length) {
    throw new Error("No encontramos la asistencia seleccionada.");
  }

  if (existingRows[0].checkout_time != null) {
    throw new Error("La asistencia ya estaba cerrada o no existe.");
  }

  const studentId = Number(existingRows[0].student_id);
  if (!Number.isFinite(studentId)) {
    throw new Error("La asistencia seleccionada no tiene un estudiante válido.");
  }

  const checkoutResult = normalizeRows<SqlRow>(
    await sql`
      SELECT public.student_checkout(${studentId}::bigint) AS did_checkout
    `,
  );

  const didCheckout = Boolean(checkoutResult[0]?.did_checkout);
  if (!didCheckout) {
    throw new Error("La asistencia ya estaba cerrada o no existe.");
  }

  const verificationRows = normalizeRows<SqlRow>(
    await sql`
      SELECT checkout_time
      FROM public.student_attendance
      WHERE id = ${attendanceId}::bigint
      LIMIT 1
    `,
  );

  if (!verificationRows.length || verificationRows[0].checkout_time == null) {
    throw new Error("No se pudo cerrar la asistencia seleccionada.");
  }
  return getActiveAttendances();
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
      lg.level,
      lg.seq,
      lg.lesson_global_seq
    FROM public.student_attendance sa
    LEFT JOIN mart.lessons_global_v lg ON lg.lesson_id = sa.lesson_id
    LEFT JOIN public.lessons l ON l.id = sa.lesson_id
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
    globalSequence:
      record.lesson_global_seq == null ? null : Number(record.lesson_global_seq),
    attendedAt: String(record.attended_at ?? record.checkin_time ?? new Date().toISOString()),
  };
}
