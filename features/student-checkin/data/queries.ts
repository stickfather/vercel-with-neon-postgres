import {
  closeExpiredSessions,
  getSqlClient,
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

export async function registerCheckIn({
  studentId,
  lessonId,
  level,
}: {
  studentId: number;
  lessonId: number;
  level: string;
}): Promise<number> {
  const sql = getSqlClient();
  await closeExpiredSessions(sql);

  const studentRows = normalizeRows<SqlRow>(await sql`
    SELECT id, full_name
    FROM students
    WHERE id = ${studentId}
    LIMIT 1
  `);

  if (!studentRows.length) {
    throw new Error("No encontramos a la persona seleccionada en la base de datos.");
  }

  const studentRecord = studentRows[0];
  const studentName = ((studentRecord.full_name as string | null) ?? "").trim();

  if (!studentName) {
    throw new Error("El estudiante seleccionado no tiene un nombre registrado.");
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
    INSERT INTO student_attendance (student_id, lesson_id, checkin_time)
    VALUES (${studentId}, ${lessonId}, now())
    RETURNING id
  `);

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
