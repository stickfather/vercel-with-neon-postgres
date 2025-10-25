import { NextResponse } from "next/server";

import { createStudentAttendanceEntry } from "@/features/administration/data/student-profile";

export async function POST(
  request: Request,
  { params }: { params: { studentId: string } },
) {
  try {
    const studentId = Number(params.studentId);

    if (!Number.isFinite(studentId) || studentId <= 0) {
      return NextResponse.json(
        {
          error: "El estudiante indicado no es válido.",
        },
        { status: 400 },
      );
    }

    const payload = (await request.json().catch(() => ({}))) as {
      lessonId?: number | string;
      checkIn?: string;
      checkOut?: string | null;
    };

    const parsedLessonId = Number(payload.lessonId);
    if (!Number.isFinite(parsedLessonId) || parsedLessonId <= 0) {
      return NextResponse.json(
        { error: "Debes seleccionar una lección válida." },
        { status: 400 },
      );
    }

    if (typeof payload.checkIn !== "string" || !payload.checkIn.trim()) {
      return NextResponse.json(
        { error: "Debes indicar la fecha y hora de ingreso." },
        { status: 400 },
      );
    }

    const checkIn = payload.checkIn.trim();
    const checkOut = payload.checkOut == null ? null : String(payload.checkOut);

    const attendance = await createStudentAttendanceEntry({
      studentId,
      lessonId: parsedLessonId,
      checkIn,
      checkOut,
    });

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (error) {
    console.error("No se pudo registrar la asistencia manual", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo registrar la asistencia manual.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
