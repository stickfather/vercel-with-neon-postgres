import { NextResponse } from "next/server.js";

import { createManualStudentAttendance } from "@/features/administration/data/student-attendance";

export const dynamic = "force-dynamic";

function parseNumeric(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request) {
  try {
    const { studentId, lessonId, checkIn, checkOut } = (await request.json()) as {
      studentId?: unknown;
      lessonId?: unknown;
      checkIn?: unknown;
      checkOut?: unknown;
    };

    const parsedStudentId = parseNumeric(studentId);
    if (!parsedStudentId) {
      return NextResponse.json(
        { error: "Se requiere un estudiante válido para registrar la asistencia." },
        { status: 400 },
      );
    }

    const parsedLessonId =
      lessonId == null || lessonId === ""
        ? null
        : parseNumeric(lessonId);

    const checkInValue = typeof checkIn === "string" ? checkIn : null;
    const checkOutValue =
      typeof checkOut === "string" && checkOut.trim().length ? checkOut : null;

    if (!checkInValue) {
      return NextResponse.json(
        { error: "Ingresa la fecha y hora de ingreso." },
        { status: 400 },
      );
    }

    const { attendanceId } = await createManualStudentAttendance({
      studentId: parsedStudentId,
      lessonId: parsedLessonId,
      checkIn: checkInValue,
      checkOut: checkOutValue ?? null,
    });

    return NextResponse.json({ attendanceId }, { status: 201 });
  } catch (error) {
    console.error("Failed to create manual student attendance", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear el registro de asistencia.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

