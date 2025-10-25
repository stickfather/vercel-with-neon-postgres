import {
  getSqlClient,
  normalizeRows,
  SqlRow,
  TIMEZONE,
} from "@/lib/db/client";

export type StaffDirectoryEntry = {
  id: number;
  fullName: string;
  role: string | null;
};

export type ActiveStaffAttendance = {
  id: string;
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

type SqlClient = ReturnType<typeof getSqlClient>;

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isMissingIdDefaultError(error: unknown): boolean {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "");
    return message.includes("null value in column \"id\"");
  }
  return false;
}

async function ensureStaffAttendanceInfrastructure(
  sql: SqlClient,
): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS public.staff_attendance (
      id BIGSERIAL PRIMARY KEY,
      staff_id BIGINT NOT NULL REFERENCES public.staff_members(id),
      checkin_time TIMESTAMPTZ NOT NULL DEFAULT now(),
      checkout_time TIMESTAMPTZ,
      override_ok BOOLEAN DEFAULT FALSE
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS staff_attendance_staff_checkin_idx
      ON public.staff_attendance (staff_id, checkin_time DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS staff_attendance_open_idx
      ON public.staff_attendance (staff_id)
      WHERE checkout_time IS NULL
  `;
}

export async function getStaffDirectory(): Promise<StaffDirectoryEntry[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, full_name, role
    FROM public.staff_members
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

  await ensureStaffAttendanceInfrastructure(sql);

  const rows = normalizeRows<SqlRow>(await sql`
    WITH day_bounds AS (
      SELECT
        (date_trunc('day', timezone(${TIMEZONE}, now())) AT TIME ZONE ${TIMEZONE}) AS current_day_start
    )
    SELECT sa.id, sa.staff_id, sm.full_name, sa.checkin_time
    FROM public.staff_attendance sa
    LEFT JOIN public.staff_members sm ON sm.id = sa.staff_id
    WHERE sa.checkout_time IS NULL
      AND sa.checkin_time >= (SELECT current_day_start FROM day_bounds)
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
  await ensureStaffAttendanceInfrastructure(sql);

  const staffRows = normalizeRows<SqlRow>(await sql`
    SELECT id, full_name, active
    FROM public.staff_members
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

  await sql`
    WITH day_bounds AS (
      SELECT
        (date_trunc('day', timezone(${TIMEZONE}, now())) AT TIME ZONE ${TIMEZONE}) AS current_day_start
    )
    UPDATE public.staff_attendance
    SET checkout_time = GREATEST(checkin_time, now())
    WHERE checkout_time IS NULL
      AND staff_id = ${staffId}
      AND checkin_time < (SELECT current_day_start FROM day_bounds)
  `;

  const existingRows = normalizeRows<SqlRow>(await sql`
    SELECT id
    FROM public.staff_attendance
    WHERE checkout_time IS NULL
      AND staff_id = ${staffId}
    LIMIT 1
  `);
  if (existingRows.length) {
    throw new Error("Esta persona ya tiene una asistencia abierta.");
  }

  const insertAttendance = async () => {
    try {
      return normalizeRows<SqlRow>(await sql`
        INSERT INTO public.staff_attendance (staff_id, checkin_time)
        VALUES (${staffId}, now())
        RETURNING id
      `);
    } catch (error) {
      if (!isMissingIdDefaultError(error)) {
        throw error;
      }

      const fallbackRows = normalizeRows<SqlRow>(await sql`
        SELECT COALESCE(MAX(id), 0) + 1 AS next_id
        FROM public.staff_attendance
      `);
      const fallbackId = Number(fallbackRows[0]?.next_id ?? 1);

      return normalizeRows<SqlRow>(await sql`
        INSERT INTO public.staff_attendance (id, staff_id, checkin_time)
        VALUES (${fallbackId}, ${staffId}, now())
        RETURNING id
      `);
    }
  };

  const insertedRows = await insertAttendance();

  if (!insertedRows.length) {
    throw new Error("No se pudo registrar la asistencia del personal.");
  }

  const insertedId = insertedRows[0].id;
  if (insertedId == null) {
    throw new Error("No se pudo obtener el identificador de la asistencia registrada.");
  }

  return { attendanceId: String(insertedId), staffName };
}

export async function registerStaffCheckOut(attendanceId: string): Promise<void> {
  const sql = getSqlClient();
  await ensureStaffAttendanceInfrastructure(sql);

  const parsedId = Number(attendanceId);
  if (!Number.isFinite(parsedId)) {
    throw new Error("La asistencia seleccionada no es válida.");
  }

  const existingRows = normalizeRows<SqlRow>(await sql`
    SELECT id, checkin_time
    FROM public.staff_attendance
    WHERE id = ${parsedId}::bigint
    LIMIT 1
  `);

  if (!existingRows.length) {
    throw new Error("No encontramos la asistencia seleccionada.");
  }

  const checkoutTimestamp = new Date().toISOString();

  const updatedRows = normalizeRows<SqlRow>(await sql`
    UPDATE public.staff_attendance
    SET checkout_time = GREATEST(checkin_time, ${checkoutTimestamp}::timestamptz)
    WHERE id = ${parsedId}::bigint
      AND checkout_time IS NULL
    RETURNING id
  `);

  if (!updatedRows.length) {
    throw new Error("La asistencia ya estaba cerrada o no existe.");
  }
}

export async function listStaffMembers(): Promise<StaffMemberRecord[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, full_name, role, active, hourly_wage, weekly_hours
    FROM public.staff_members
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
    INSERT INTO public.staff_members (full_name, role, hourly_wage, weekly_hours, active)
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
