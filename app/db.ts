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

export type StudentDirectoryEntry = {
  id: number;
  fullName: string;
  lastLessonId: number | null;
  lastLessonSequence: number | null;
  lastLessonLevel: string | null;
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
  studentId: number;
  fullName: string;
  lesson: string | null;
  level: string | null;
  checkInTime: string;
};

export type StudentCheckInResult = {
  attendanceId: number;
  studentName: string;
};

export type StaffDirectoryEntry = {
  id: number;
  fullName: string;
  role: string | null;
};

export type StaffMemberRecord = {
  id: number;
  fullName: string;
  role: string | null;
  active: boolean;
  hourlyWage: number | null;
  weeklyHours: number | null;
};

export type ActiveStaffAttendance = {
  id: string;
  staffId: number;
  fullName: string;
  checkInTime: string;
};

export type StaffCheckInResult = {
  attendanceId: string;
  staffName: string;
};

async function closeExpiredSessions(sql = getSqlClient()) {
  await sql`
    UPDATE student_attendance AS sa
    SET checkout_time = GREATEST(
      sa.checkin_time,
      (date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE})
        + INTERVAL '20 hours 30 minutes') AT TIME ZONE ${TIMEZONE}
    )
    WHERE sa.checkout_time IS NULL
      AND timezone(${TIMEZONE}, now()) >= date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE})
      + INTERVAL '20 hours 30 minutes'
  `;
}

async function closeExpiredStaffSessions(sql = getSqlClient()) {
  await sql`
    UPDATE staff_attendance AS sa
    SET checkout_time = GREATEST(
      sa.checkin_time,
      (date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE})
        + INTERVAL '20 hours 30 minutes') AT TIME ZONE ${TIMEZONE}
    )
    WHERE sa.checkout_time IS NULL
      AND timezone(${TIMEZONE}, now()) >= date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE})
      + INTERVAL '20 hours 30 minutes'
  `;
}

async function getStudentDirectory(): Promise<StudentDirectoryEntry[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      s.id,
      s.full_name,
      last_attendance.lesson_id AS last_lesson_id,
      last_attendance.lesson_seq AS last_lesson_seq,
      last_attendance.lesson_level AS last_lesson_level
    FROM students s
    LEFT JOIN LATERAL (
      SELECT
        sa.lesson_id,
        l.seq AS lesson_seq,
        l.level AS lesson_level
      FROM student_attendance sa
      LEFT JOIN lessons l ON l.id = sa.lesson_id
      WHERE sa.student_id = s.id
        AND sa.checkout_time IS NOT NULL
        AND sa.lesson_id IS NOT NULL
      ORDER BY sa.checkin_time DESC
      LIMIT 1
    ) AS last_attendance ON TRUE
    WHERE full_name IS NOT NULL
      AND trim(full_name) <> ''
    ORDER BY full_name ASC
  `);

  return rows.map((row) => ({
    id: Number(row.id),
    fullName: (row.full_name as string).trim(),
    lastLessonId: row.last_lesson_id === null ? null : Number(row.last_lesson_id),
    lastLessonSequence:
      row.last_lesson_seq === null ? null : Number(row.last_lesson_seq),
    lastLessonLevel:
      row.last_lesson_level === null
        ? null
        : ((row.last_lesson_level as string) ?? "").trim() || null,
  }));
}

async function getLevelsWithLessons(): Promise<LevelLessons[]> {
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

async function getActiveAttendances(): Promise<ActiveAttendance[]> {
  const sql = getSqlClient();
  await closeExpiredSessions(sql);

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      sa.id,
      sa.student_id,
      s.full_name,
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
      studentId: Number(row.student_id),
      fullName: ((row.full_name as string | null) ?? "").trim(),
      lesson: (row.lesson as string | null) ?? null,
      level: (row.level as string | null) ?? null,
      checkInTime: row.checkin_time as string,
    }))
    .filter((attendance) => attendance.fullName.trim().length);
}

async function getStaffDirectory(): Promise<StaffDirectoryEntry[]> {
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

async function getActiveStaffAttendances(): Promise<ActiveStaffAttendance[]> {
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

async function registerCheckIn({
  lessonId,
  level,
  studentId,
}: {
  lessonId: number;
  level: string;
  studentId: number;
}): Promise<StudentCheckInResult> {
  const sql = getSqlClient();
  await closeExpiredSessions(sql);

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

  return {
    attendanceId: Number(insertedRows[0].id),
    studentName: storedStudentName,
  };
}

async function registerCheckOut(attendanceId: number): Promise<void> {
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

async function registerStaffCheckIn({
  staffId,
}: {
  staffId: number;
}): Promise<StaffCheckInResult> {
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

  if (!staffName) {
    throw new Error("El miembro del personal no tiene un nombre registrado.");
  }

  if (!isActive) {
    throw new Error("El miembro del personal está marcado como inactivo.");
  }

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

  return {
    attendanceId: String(insertedRows[0].id),
    staffName,
  };
}

async function registerStaffCheckOut(attendanceId: string): Promise<void> {
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
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function listStaffMembers(): Promise<StaffMemberRecord[]> {
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

async function createStaffMember({
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
  if (!sanitizedName) {
    throw new Error("El nombre del personal es obligatorio.");
  }

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

async function updateStaffMember(
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
  if (!sanitizedName) {
    throw new Error("El nombre del personal es obligatorio.");
  }

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

async function deleteStaffMember(id: number): Promise<void> {
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

export {
  TIMEZONE,
  closeExpiredSessions,
  closeExpiredStaffSessions,
  getStudentDirectory,
  getLevelsWithLessons,
  getActiveAttendances,
  getStaffDirectory,
  getActiveStaffAttendances,
  registerCheckIn,
  registerCheckOut,
  registerStaffCheckIn,
  registerStaffCheckOut,
  listStaffMembers,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
};
