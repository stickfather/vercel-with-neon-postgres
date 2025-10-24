import { getSqlClient, normalizeRows, type SqlRow } from "@/lib/db/client";

type CreateManualStudentAttendanceOptions = {
  studentId: number;
  lessonId?: number | null;
  checkIn: string;
  checkOut?: string | null;
};

function parseTimestamp(value: string | null | undefined): Date {
  if (!value) {
    throw new Error("Se requiere una fecha y hora válidas.");
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Formato de fecha u hora inválido.");
  }
  return parsed;
}

export async function createManualStudentAttendance({
  studentId,
  lessonId,
  checkIn,
  checkOut,
}: CreateManualStudentAttendanceOptions): Promise<{ attendanceId: number }> {
  const sql = getSqlClient();

  if (!Number.isFinite(studentId) || studentId <= 0) {
    throw new Error("Identificador de estudiante inválido.");
  }

  const checkInDate = parseTimestamp(checkIn);
  const checkOutDate = checkOut ? parseTimestamp(checkOut) : null;

  if (checkOutDate && checkOutDate.getTime() < checkInDate.getTime()) {
    throw new Error("La salida no puede ser anterior al ingreso.");
  }

  const rows = normalizeRows<SqlRow>(
    await sql`
      INSERT INTO student_attendance (
        student_id,
        lesson_id,
        checkin_time,
        checkout_time,
        confirm_override
      )
      VALUES (
        ${Math.trunc(studentId)},
        ${lessonId != null ? Math.trunc(lessonId) : null},
        ${checkInDate.toISOString()},
        ${checkOutDate ? checkOutDate.toISOString() : null},
        FALSE
      )
      RETURNING id
    `,
  );

  if (!rows.length || rows[0].id == null) {
    throw new Error("No se pudo crear el registro de asistencia.");
  }

  return { attendanceId: Number(rows[0].id) };
}

