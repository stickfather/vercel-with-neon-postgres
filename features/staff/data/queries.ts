import {
  getSqlClient,
  isMissingColumnError,
  isMissingRelationError,
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

  let rows: SqlRow[] = [];
  try {
    rows = normalizeRows<SqlRow>(
      await sql`
        WITH day_bounds AS (
          SELECT
            (date_trunc('day', timezone(${TIMEZONE}, now())) AT TIME ZONE ${TIMEZONE}) AS current_day_start
        )
        SELECT sa.id, sa.staff_id, sm.full_name, sa.checkin_time
        FROM public.staff_attendance sa
        LEFT JOIN public.staff_members sm ON sm.id = sa.staff_id
        WHERE COALESCE(sa.checkout_time, sa.checkout) IS NULL
          AND sa.checkin_time >= (SELECT current_day_start FROM day_bounds)
        ORDER BY sa.checkin_time ASC
      `,
    );
  } catch (error) {
    if (isMissingColumnError(error, "checkout")) {
      rows = normalizeRows<SqlRow>(
        await sql`
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
        `,
      );
    } else if (isMissingColumnError(error, "checkout_time")) {
      rows = normalizeRows<SqlRow>(
        await sql`
          WITH day_bounds AS (
            SELECT
              (date_trunc('day', timezone(${TIMEZONE}, now())) AT TIME ZONE ${TIMEZONE}) AS current_day_start
          )
          SELECT sa.id, sa.staff_id, sm.full_name, sa.checkin_time
          FROM public.staff_attendance sa
          LEFT JOIN public.staff_members sm ON sm.id = sa.staff_id
          WHERE sa.checkout IS NULL
            AND sa.checkin_time >= (SELECT current_day_start FROM day_bounds)
          ORDER BY sa.checkin_time ASC
        `,
      );
    } else {
      throw error;
    }
  }

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

  try {
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
  } catch (error) {
    if (!isMissingColumnError(error, "checkout_time")) {
      throw error;
    }
  }

  try {
    await sql`
      WITH day_bounds AS (
        SELECT
          (date_trunc('day', timezone(${TIMEZONE}, now())) AT TIME ZONE ${TIMEZONE}) AS current_day_start
      )
      UPDATE public.staff_attendance
      SET checkout = GREATEST(checkin_time, now())
      WHERE checkout IS NULL
        AND staff_id = ${staffId}
        AND checkin_time < (SELECT current_day_start FROM day_bounds)
    `;
  } catch (error) {
    if (!isMissingColumnError(error, "checkout")) {
      throw error;
    }
  }

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

  const nextIdRows = normalizeRows<SqlRow>(await sql`
    SELECT COALESCE(MAX(id), 0) + 1 AS next_id
    FROM public.staff_attendance
  `);
  const nextId = Number(nextIdRows[0]?.next_id ?? 1);

  const insertedRows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.staff_attendance (id, staff_id, checkin_time)
    VALUES (${nextId}, ${staffId}, now())
    RETURNING id
  `);

  return { attendanceId: String(insertedRows[0].id), staffName };
}

export async function registerStaffCheckOut(attendanceId: string): Promise<void> {
  const sql = getSqlClient();

  const parsedId = Number(attendanceId);
  if (!Number.isFinite(parsedId)) {
    throw new Error("La asistencia seleccionada no es válida.");
  }

  try {
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

    const client = sql as typeof sql & {
      unsafe?: (query: string, params?: unknown[]) => Promise<unknown>;
    };
    const runUpdate = async (
      column: "checkout_time" | "checkout",
    ): Promise<SqlRow[]> => {
      if (typeof client.unsafe === "function") {
        const query = `
          UPDATE public.staff_attendance
          SET ${column} = GREATEST(checkin_time, $1::timestamptz)
          WHERE id = $2::bigint
            AND ${column} IS NULL
          RETURNING id
        `;
        return normalizeRows<SqlRow>(
          await client.unsafe(query, [checkoutTimestamp, parsedId]),
        );
      }

      if (column === "checkout_time") {
        return normalizeRows<SqlRow>(await sql`
          UPDATE public.staff_attendance
          SET checkout_time = GREATEST(checkin_time, ${checkoutTimestamp}::timestamptz)
          WHERE id = ${parsedId}::bigint
            AND checkout_time IS NULL
          RETURNING id
        `);
      }

      return normalizeRows<SqlRow>(await sql`
        UPDATE public.staff_attendance
        SET checkout = GREATEST(checkin_time, ${checkoutTimestamp}::timestamptz)
        WHERE id = ${parsedId}::bigint
          AND checkout IS NULL
        RETURNING id
      `);
    };

    let updatedCount = 0;

    try {
      const rows = await runUpdate("checkout_time");
      updatedCount = Math.max(updatedCount, rows.length);
    } catch (columnError) {
      if (!isMissingColumnError(columnError, "checkout_time")) {
        throw columnError;
      }
    }

    try {
      const rows = await runUpdate("checkout");
      updatedCount = Math.max(updatedCount, rows.length);
    } catch (columnError) {
      if (!isMissingColumnError(columnError, "checkout")) {
        throw columnError;
      }
    }

    if (!updatedCount) {
      throw new Error("La asistencia ya estaba cerrada o no existe.");
    }
  } catch (error) {
    if (isMissingRelationError(error, "staff_attendance")) {
      throw new Error(
        "No pudimos registrar la salida del personal porque falta la tabla principal de asistencias. Verifica que las asistencias del staff se almacenen en 'public.staff_attendance'.",
      );
    }
    if (isMissingColumnError(error)) {
      throw new Error(
        "No pudimos registrar la salida del personal porque falta la columna de salida en 'public.staff_attendance'. Verifica que exista 'checkout_time' o 'checkout'.",
      );
    }
    throw error;
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
