import { getSqlClient, normalizeRows, SqlRow } from "@/lib/db/client";

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

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT sa.id, sa.staff_id, sm.full_name, sa.checkin_time
    FROM public.staff_attendance sa
    LEFT JOIN public.staff_members sm ON sm.id = sa.staff_id
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

  const insertedRows = normalizeRows<SqlRow>(
    await sql`
      SELECT public.staff_checkin(${staffId}::bigint) AS attendance_id
    `,
  );

  if (!insertedRows.length) {
    throw new Error("No se pudo registrar la asistencia del personal.");
  }

  const insertedId = Number(insertedRows[0].attendance_id);
  if (!Number.isFinite(insertedId)) {
    throw new Error("No se pudo obtener el identificador de la asistencia registrada.");
  }

  return { attendanceId: String(insertedId), staffName };
}

export async function registerStaffCheckOut(
  attendanceId: string,
): Promise<ActiveStaffAttendance[]> {
  const sql = getSqlClient();

  const parsedId = Number(attendanceId);
  if (!Number.isFinite(parsedId)) {
    throw new Error("La asistencia seleccionada no es válida.");
  }

  const existingRows = normalizeRows<SqlRow>(await sql`
    SELECT id, staff_id, checkin_time, checkout_time
    FROM public.staff_attendance
    WHERE id = ${parsedId}::bigint
    LIMIT 1
  `);

  if (!existingRows.length) {
    throw new Error("No encontramos la asistencia seleccionada.");
  }

  if (existingRows[0].checkout_time != null) {
    throw new Error("La asistencia ya estaba cerrada o no existe.");
  }

  const staffId = Number(existingRows[0].staff_id);
  if (!Number.isFinite(staffId)) {
    throw new Error("La asistencia seleccionada no tiene un miembro de personal válido.");
  }

  const checkoutResult = normalizeRows<SqlRow>(
    await sql`
      SELECT public.staff_checkout(${staffId}::bigint) AS did_checkout
    `,
  );

  const didCheckout = Boolean(checkoutResult[0]?.did_checkout);
  if (!didCheckout) {
    throw new Error("La asistencia ya estaba cerrada o no existe.");
  }

  const verificationRows = normalizeRows<SqlRow>(
    await sql`
      SELECT checkout_time
      FROM public.staff_attendance
      WHERE id = ${parsedId}::bigint
      LIMIT 1
    `,
  );

  if (!verificationRows.length || verificationRows[0].checkout_time == null) {
    throw new Error("No se pudo cerrar la asistencia seleccionada.");
  }
  return getActiveStaffAttendances();
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
