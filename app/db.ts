import { neon } from "@neondatabase/serverless";

let sqlInstance: ReturnType<typeof neon> | null = null;

export const TIMEZONE = "America/Guayaquil";

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
    if (!result.length) return [];
    if (Array.isArray(result[0])) return [];
    return result as T[];
  }
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return normalizeRows<T>(rows);
  }
  return [];
}

/* ========= Domain types ========= */

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

export type StaffDirectoryEntry = {
  id: number;
  fullName: string;
  role: string | null;
};

export type ActiveStaffAttendance = {
  id: string; // UI treats as string
  staffId: number;
  fullName: string;
  checkInTime: string;
};

export type StaffMemberRecord = {
  id: number;
  fullName: string;
  role: string | null;
  active: boolean;
  hourlyWage: number | null;
  weeklyHours: number | null;
};

/* ========= Session auto-closure ========= */

export async function closeExpiredSessions(sql = getSqlClient()) {
  await sql`
    UPDATE student_attendance AS sa
    SET checkout_time = date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE})
      + INTERVAL '20 hours 30 minutes'
    WHERE sa.checkout_time IS NULL
      AND timezone(${TIMEZONE}, now()) >= date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE})
      + INTERVAL '20 hours 30 minutes'
  `;
}

export async function closeExpiredStaffSessions(sql = getSqlClient()) {
  await sql`
    UPDATE staff_attendance AS sa
    SET checkout_time = date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE})
      + INTERVAL '20 hours 30 minutes'
    WHERE sa.checkout_time IS NULL
      AND timezone(${TIMEZONE}, now()) >= date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE})
      + INTERVAL '20 hours 30 minutes'
  `;
}

/* ========= Students ========= */

export async function getStudentDirectory(): Promise<StudentName[]> {
  const sql = getSqlClient();
  await closeExpiredSessions(sql);

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT full_name
    FROM students
    WHERE LOWER(TRIM(COALESCE(status, 'active'))) = 'active'
      AND TRIM(COALESCE(full_name, '')) <> ''
    ORDER BY full_name ASC
  `);

  return rows
    .map((row) => ({ fullName: (row.full_name as string) ?? "" }))
    .filter((entry) => entry.fullName.trim().length);
}

export async function getLevelsWithLessons(): Promise<LevelLessons[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, lesson, level_code, seq
    FROM lessons
    WHERE TRIM(COALESCE(lesson, '')) <> ''
    ORDER BY level_code ASC, seq ASC NULLS LAST, lesson ASC
  `);

  const grouped = new Map<string, LessonOption[]>();

  for (const row of rows) {
    const level = ((row.level_code as string) ?? "").trim();
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

async function findStudentIdByName(
  sql: ReturnType<typeof neon>,
  fullName: string,
): Promise<number | null> {
  const normalized = fullName.trim();
  if (!normalized) return null;

  const studentRow = normalizeRows<SqlRow>(await sql`
    SELECT id
    FROM students
    WHERE LOWER(full_name) = LOWER(${normalized})
    LIMIT 1
  `);
  if (studentRow.length) return Number(studentRow[0].id);

  const attendanceRow = normalizeRows<SqlRow>(await sql`
    SELECT student_id
    FROM student_attendance
    WHERE LOWER(full_name) = LOWER(${normalized})
      AND student_id IS NOT NULL
    ORDER BY checkin_time DESC
    LIMIT 1
  `);
  if (attendanceRow.length) return Number(attendanceRow[0].student_id);

  return null;
}

/** Check-in by student full name; resolves student_id internally. */
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
  if (!trimmedName) throw new Error("El nombre del estudiante es obligatorio.");

  const lessonRows = normalizeRows<SqlRow>(await sql`
    SELECT id, level
    FROM lessons
    WHERE id = ${lessonId}
    LIMIT 1
  `);
  if (!lessonRows.length) throw new Error("La lección seleccionada no existe.");

  const lesson = lessonRows[0];
  const lessonLevel = (lesson.level as string | null) ?? "";
  if (lessonLevel.toLowerCase() !== level.trim().toLowerCase()) {
    throw new Error("La lección no corresponde al nivel elegido.");
  }

  const studentId = await findStudentIdByName(sql, trimmedName);
  if (studentId === null) {
    throw new Error("No se encontró el estudiante en la base de datos.");
  }

  const existingRows = normalizeRows<SqlRow>(await sql`
    SELECT id
    FROM student_attendance
    WHERE checkout_time IS NULL
      AND (
        student_id = ${studentId}
        OR LOWER(full_name) = LOWER(${trimmedName})
      )
    LIMIT 1
  `);
  if (existingRows.length) {
    throw new Error("El estudiante ya tiene una asistencia abierta.");
  }

  const insertedRows = normalizeRows<SqlRow>(await sql`
    INSERT INTO student_attendance (student_id, full_name, lesson_id, checkin_time)
    VALUES (${studentId}, ${trimmedName}, ${lessonId}, now())
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

/* ========= Staff ========= */

export async function getStaffDirectory(): Promise<StaffDirectoryEntry[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, full_name, role
    FROM staff_members
    WHERE active IS TRUE
    ORDER BY full_name ASC
  `);

  return rows
    .map((row) => ({
      id: Number(row.id),
      fullName: ((row.full_name as string | null) ?? "").trim(),
      role: (row.role as string | null) ?? null,
    }))
    .filter((member) => member.fullName.length > 0);
}

export async function getActiveStaffAttendances(): Promise<ActiveStaffAttendance[]> {
  const sql = getSqlClient();
  await closeExpiredStaffSessions(sql);

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT sa.id, sa.staff_id, sm.full_name, sa.checkin_time
    FROM staff_attendance sa
    LEFT JOIN staff_members sm ON sm.id = sa.staff_id
    WHERE sa.checkout_time IS NULL
    ORDER BY sa.checkin_time ASC
  `);

  return rows
    .map((row) => ({
      id: String(row.id),
      staffId: Number(row.staff_id),
      fullName: ((row.full_name as string | null) ?? "").trim(),
      checkInTime: row.checkin_time as string,
    }))
    .filter((attendance) => attendance.fullName.length > 0);
}

export async function registerStaffCheckIn({
  staffId,
}: {
  staffId: number;
}): Promise<{ attendanceId: string; staffName: string }> {
  const sql = getSqlClient();
  await closeExpiredStaffSessions(sql);

  const staffRows = normalizeRows<SqlRow>(await sql`
    SELECT id, full_name, active
    FROM staff_members
    WHERE id = ${staffId}
    LIMIT 1
  `);
  if (!staffRows.length) {
    throw new Error("No encontramos a la persona seleccionada en la base de datos.");
  }

  const staffRecord = staffRows[0];
  const staffName = ((staffRecord.full_name as string | null) ?? "").trim();
  const isActive = Boolean(staffRecord.active ?? true);

  if (!staffName) throw new Error("El miembro del personal no tiene un nombre registrado.");
  if (!isActive) throw new Error("El miembro del personal está marcado como inactivo.");

  const existingRows = normalizeRows<SqlRow>(await sql`
    SELECT id
    FROM staff_attendance
    WHERE checkout_time IS NULL
      AND staff_id = ${staffId}
    LIMIT 1
  `);
  if (existingRows.length) {
    throw new Error("Esta persona ya tiene una asistencia abierta.");
  }

  // If staff_attendance.id is IDENTITY/SERIAL, omit id column and values(nextId)
  const nextIdRows = normalizeRows<SqlRow>(await sql`
    SELECT COALESCE(MAX(id), 0) + 1 AS next_id
    FROM staff_attendance
  `);
  const nextId = Number(nextIdRows[0]?.next_id ?? 1);

  const insertedRows = normalizeRows<SqlRow>(await sql`
    INSERT INTO staff_attendance (id, staff_id, checkin_time)
    VALUES (${nextId}, ${staffId}, now())
    RETURNING id
  `);

  return { attendanceId: String(insertedRows[0].id), staffName };
}

export async function registerStaffCheckOut(attendanceId: string): Promise<void> {
  const sql = getSqlClient();
  await closeExpiredStaffSessions(sql);

  const parsedId = Number(attendanceId);
  if (!Number.isFinite(parsedId)) {
    throw new Error("La asistencia seleccionada no es válida.");
  }

  const updatedRows = normalizeRows<SqlRow>(await sql`
    UPDATE staff_attendance
    SET checkout_time = now()
    WHERE id = ${parsedId}
      AND checkout_time IS NULL
    RETURNING id
  `);
  if (!updatedRows.length) {
    throw new Error("La asistencia ya estaba cerrada o no existe.");
  }
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function listStaffMembers(): Promise<StaffMemberRecord[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, full_name, role, active, hourly_wage, weekly_hours
    FROM staff_members
    ORDER BY full_name ASC
  `);

  return rows.map((row) => ({
    id: Number(row.id),
    fullName: ((row.full_name as string | null) ?? "").trim(),
    role: (row.role as string | null) ?? null,
    active: Boolean(row.active ?? false),
    hourlyWage: toNullableNumber(row.hourly_wage),
    weeklyHours: toNullableNumber(row.weekly_hours),
  }));
}

export async function createStaffMember({
  fullName,
  role,
  hourlyWage,
  weeklyHours,
  active = true,
}: {
  fullName: string;
  role?: string | null;
  hourlyWage?: number | string | null;
  weeklyHours?: number | string | null;
  active?: boolean;
}): Promise<StaffMemberRecord> {
  const sql = getSqlClient();

  const sanitizedName = fullName.trim();
  if (!sanitizedName) throw new Error("El nombre del personal es obligatorio.");

  const sanitizedRole = role ? role.trim() : null;
  const wageValue = toNullableNumber(hourlyWage ?? null);
  const weeklyValue = toNullableNumber(weeklyHours ?? null);

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO staff_members (full_name, role, hourly_wage, weekly_hours, active)
    VALUES (${sanitizedName}, ${sanitizedRole}, ${wageValue}, ${weeklyValue}, ${active})
    RETURNING id, full_name, role, active, hourly_wage, weekly_hours
  `);

  return {
    id: Number(rows[0].id),
    fullName: sanitizedName,
    role: sanitizedRole,
    active,
    hourlyWage: wageValue,
    weeklyHours: weeklyValue,
  };
}

export async function updateStaffMember(
  id: number,
  {
    fullName,
    role,
    hourlyWage,
    weeklyHours,
    active,
  }: {
    fullName: string;
    role?: string | null;
    hourlyWage?: number | string | null;
    weeklyHours?: number | string | null;
    active: boolean;
  },
): Promise<StaffMemberRecord> {
  const sql = getSqlClient();

  const sanitizedName = fullName.trim();
  if (!sanitizedName) throw new Error("El nombre del personal es obligatorio.");

  const sanitizedRole = role ? role.trim() : null;
  const wageValue = toNullableNumber(hourlyWage ?? null);
  const weeklyValue = toNullableNumber(weeklyHours ?? null);

  const rows = normalizeRows<SqlRow>(await sql`
    UPDATE staff_members
    SET full_name = ${sanitizedName},
        role = ${sanitizedRole},
        hourly_wage = ${wageValue},
        weekly_hours = ${weeklyValue},
        active = ${active}
    WHERE id = ${id}
    RETURNING id, full_name, role, active, hourly_wage, weekly_hours
  `);

  if (!rows.length) {
    throw new Error("No encontramos a la persona seleccionada.");
  }

  return {
    id: Number(rows[0].id),
    fullName: sanitizedName,
    role: sanitizedRole,
    active,
    hourlyWage: wageValue,
    weeklyHours: weeklyValue,
  };
}

export async function deleteStaffMember(id: number): Promise<void> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    DELETE FROM staff_members
    WHERE id = ${id}
    RETURNING id
  `);

  if (!rows.length) {
    throw new Error("No se pudo eliminar al miembro del personal solicitado.");
  }
}
