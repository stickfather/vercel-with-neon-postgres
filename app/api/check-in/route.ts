import { NextResponse } from "next/server";
import { registerCheckIn } from "@/app/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Accept a few common shapes from the client
    const level: string = String(body.level ?? "").trim();
    const lessonIdRaw = body.lessonId ?? body.lesson_id ?? body.lesson;
    const fullNameRaw = body.fullName ?? body.full_name ?? body.name;

    const parsedLessonId = Number(lessonIdRaw);
    const fullName = String(fullNameRaw ?? "").trim();

    if (!fullName) {
      return NextResponse.json(
        { error: "El nombre del estudiante es obligatorio." },
        { status: 400 }
      );
    }
    if (!level) {
      return NextResponse.json(
        { error: "El nivel es obligatorio." },
        { status: 400 }
      );
    }
    if (!Number.isFinite(parsedLessonId)) {
      return NextResponse.json(
        { error: "La lección seleccionada no es válida." },
        { status: 400 }
      );
    }

    // New API: returns a number (attendanceId)
    const attendanceId = await registerCheckIn({
      fullName,
      lessonId: parsedLessonId,
      level,
    });

    return NextResponse.json({
      attendanceId,
      studentName: fullName, // preserve previous response shape
    });
  } catch (error) {
    console.error("Error en check-in", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar el registro de asistencia.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
