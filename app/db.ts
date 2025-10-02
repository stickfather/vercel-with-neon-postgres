import { neon } from "@neondatabase/serverless";

let sqlInstance: ReturnType<typeof neon> | null = null;

const TIMEZONE = "America/Guayaquil";

type SqlRow = Record<string, unknown>;

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

function normalizeRows<T extends SqlRow>(result: unknown): T[] {
  if (Array.isArray(result)) {
    if (!result.length) {
      return [];
    }
    if (Array.isArray(result[0])) {
      return [];
    }
    return result as T[];
  }

  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) {
      return normalizeRows<T>(rows);
    }
  }

  return [];
}

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

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, full_name
    FROM students
    WHERE full_name IS NOT NULL
      AND trim(full_name) <> ''
    ORDER BY full_name ASC
  `);

  return rows.map((row) => ({
    id: Number(row.id),
    fullName: (row.full_name as string).trim(),
  }));
}

export async function getLevelsWithLessons(): Promise<LevelLessons[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, lesson, level, seq
    FROM lessons
    ORDER BY level ASC, seq ASC NULLS LAST, lesson ASC
  `);

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

  const rows = normalizeRows<SqlRow>(await sql`
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
  `);

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

export async function registerCheckIn({
  fullName,
  lessonId,
  level,
  studentId,
}: {
  fullName: string;
  lessonId: number;
  level: string;
  studentId: number;
}): Promise<number> {
  const sql = getSqlClient();
  await closeExpiredSessions(sql);

  const trimmedName = fullName.trim();
  if (!trimmedName) {
    throw new Error("El nombre del estudiante es obligatorio.");
  }

  const studentRows = normalizeRows<SqlRow>(await sql`
    SELECT id, full_name
    FROM students
    WHERE id = ${studentId}
    LIMIT 1
  `);

  if (!studentRows.length) {
    throw new Error("No encontramos al estudiante seleccionado en la base de datos.");
  }

  const studentRecord = studentRows[0];
  const storedStudentName = ((studentRecord.full_name as string | null) ?? "").trim();

  if (!storedStudentName) {
    throw new Error("El estudiante seleccionado no tiene un nombre registrado.");
  }

  const lessonRows = normalizeRows<SqlRow>(await sql`
    SELECT id, level
    FROM lessons
    WHERE id = ${lessonId}
    LIMIT 1
  `);

  if (!lessonRows.length) {
    throw new Error("La lección seleccionada no existe.");
  }

  const lesson = lessonRows[0];
  const lessonLevel = (lesson.level as string | null) ?? "";
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
    INSERT INTO student_attendance (student_id, full_name, lesson_id, checkin_time)
    VALUES (${studentId}, ${storedStudentName}, ${lessonId}, now())
    RETURNING id
  `);

  return Number(insertedRows[0].id);
}

export async function registerCheckOut(attendanceId: number): Promise<void> {
  const sql = getSqlClient();
  await closeExpiredSessions(sql);

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

export { TIMEZONE, closeExpiredSessions };
