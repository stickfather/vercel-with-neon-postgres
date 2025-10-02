import { neon } from "@neondatabase/serverless";

let sqlInstance: ReturnType<typeof neon> | null = null;

const TIMEZONE = "America/Guayaquil";

function getSqlClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("No DATABASE_URL environment variable");
  }
  if (!sqlInstance) {
    sqlInstance = neon(connectionString);
  }
  return sqlInstance;
}

export type StudentName = {
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
  checkInTime: string;
};

async function closeExpiredSessions(sql = getSqlClient()) {
  await sql`
    UPDATE student_attendance AS sa
    SET checkout_time = date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE})
      + INTERVAL '20 hours 30 minutes'
    WHERE sa.checkout_time IS NULL
      AND timezone(${TIMEZONE}, now()) >= date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE})
      + INTERVAL '20 hours 30 minutes'
  `;
}

export async function getStudentDirectory(): Promise<StudentName[]> {
  const sql = getSqlClient();

  const rows = await sql`
    SELECT DISTINCT
      COALESCE(s.full_name, sa.full_name) AS full_name
    FROM student_attendance sa
    LEFT JOIN students s ON s.id = sa.student_id
    WHERE COALESCE(s.full_name, sa.full_name) IS NOT NULL
    ORDER BY full_name ASC
  `;

  return rows
    .map((row) => ({ fullName: row.full_name as string }))
    .filter((entry) => entry.fullName?.trim().length);
}

export async function getLevelsWithLessons(): Promise<LevelLessons[]> {
  const sql = getSqlClient();

  const rows = await sql`
    SELECT id, lesson, level, seq
    FROM lessons
    ORDER BY level ASC, seq ASC NULLS LAST, lesson ASC
  `;

  const grouped = new Map<string, LessonOption[]>();

  for (const row of rows) {
    const level = ((row.level as string) ?? "").trim();
    if (!level) {
      continue;
    }
    if (!grouped.has(level)) {
      grouped.set(level, []);
    }
    grouped.get(level)!.push({
      id: Number(row.id),
      lesson: row.lesson as string,
      level,
      sequence: row.seq === null ? null : Number(row.seq),
    });
  }

  return Array.from(grouped.entries())
    .map(([level, lessons]) => ({
      level,
      lessons,
    }))
    .filter((entry) => entry.lessons.length);
}

export async function getActiveAttendances(): Promise<ActiveAttendance[]> {
  const sql = getSqlClient();
  await closeExpiredSessions(sql);

  const rows = await sql`
    SELECT
      sa.id,
      COALESCE(s.full_name, sa.full_name) AS full_name,
      sa.checkin_time,
      l.lesson,
      l.level
    FROM student_attendance sa
    LEFT JOIN students s ON s.id = sa.student_id
    LEFT JOIN lessons l ON l.id = sa.lesson_id
    WHERE sa.checkout_time IS NULL
    ORDER BY sa.checkin_time ASC
  `;

  return rows
    .map((row) => ({
      id: Number(row.id),
      fullName: (row.full_name as string | null) ?? "",
      lesson: (row.lesson as string | null) ?? null,
      level: (row.level as string | null) ?? null,
      checkInTime: row.checkin_time as string,
    }))
    .filter((attendance) => attendance.fullName.trim().length);
}

async function findStudentIdByName(
  sql: ReturnType<typeof neon>,
  fullName: string,
): Promise<number | null> {
  const normalized = fullName.trim();

  if (!normalized) {
    return null;
  }

  const studentRow = await sql`
    SELECT id
    FROM students
    WHERE LOWER(full_name) = LOWER(${normalized})
    LIMIT 1
  `;

  if (studentRow.length) {
    return Number(studentRow[0].id);
  }

  const attendanceRow = await sql`
    SELECT student_id
    FROM student_attendance
    WHERE LOWER(full_name) = LOWER(${normalized})
      AND student_id IS NOT NULL
    ORDER BY checkin_time DESC
    LIMIT 1
  `;

  if (attendanceRow.length) {
    return Number(attendanceRow[0].student_id);
  }

  return null;
}

export async function registerCheckIn({
  fullName,
  lessonId,
  level,
}: {
  fullName: string;
  lessonId: number;
  level: string;
}): Promise<number> {
  const sql = getSqlClient();
  await closeExpiredSessions(sql);

  const trimmedName = fullName.trim();
  if (!trimmedName) {
    throw new Error("El nombre del estudiante es obligatorio.");
  }

  const lessonRows = await sql`
    SELECT id, level
    FROM lessons
    WHERE id = ${lessonId}
    LIMIT 1
  `;

  if (!lessonRows.length) {
    throw new Error("La lección seleccionada no existe.");
  }

  const lesson = lessonRows[0];
  const lessonLevel = (lesson.level as string | null) ?? "";
  if (lessonLevel.toLowerCase() !== level.trim().toLowerCase()) {
    throw new Error("La lección no corresponde al nivel elegido.");
  }

  const studentId = await findStudentIdByName(sql, trimmedName);

  if (studentId === null) {
    throw new Error("No se encontró el estudiante en la base de datos.");
  }

  const existingRows = await sql`
    SELECT id
    FROM student_attendance
    WHERE checkout_time IS NULL
      AND (
        student_id = ${studentId}
        OR LOWER(full_name) = LOWER(${trimmedName})
      )
    LIMIT 1
  `;

  if (existingRows.length) {
    throw new Error("El estudiante ya tiene una asistencia abierta.");
  }

  const insertedRows = await sql`
    INSERT INTO student_attendance (student_id, full_name, lesson_id, checkin_time)
    VALUES (${studentId}, ${trimmedName}, ${lessonId}, now())
    RETURNING id
  `;

  return Number(insertedRows[0].id);
}

export async function registerCheckOut(attendanceId: number): Promise<void> {
  const sql = getSqlClient();
  await closeExpiredSessions(sql);

  const updatedRows = await sql`
    UPDATE student_attendance
    SET checkout_time = now()
    WHERE id = ${attendanceId}
      AND checkout_time IS NULL
    RETURNING id
  `;

  if (!updatedRows.length) {
    throw new Error("La asistencia ya estaba cerrada o no existe.");
  }
}

export { TIMEZONE, closeExpiredSessions };
