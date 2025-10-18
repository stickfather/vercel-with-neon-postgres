import { NextResponse } from "next/server.js";
import { registerCheckIn } from "@/features/student-checkin/data/queries";

export async function POST(request: Request) {
  try {
    const { studentId, level, lessonId, confirmOverride } = await request.json();

    if (!studentId || !level || !lessonId) {
      return NextResponse.json(
        { error: "Faltan datos para registrar la asistencia." },
        { status: 400 },
      );
    }

    const parsedStudentId = Number(studentId);
    const parsedLessonId = Number(lessonId);

    if (!Number.isFinite(parsedStudentId) || !Number.isFinite(parsedLessonId)) {
      return NextResponse.json(
        { error: "Los identificadores enviados no son válidos." },
        { status: 400 },
      );
    }

    const attendanceId = await registerCheckIn({
      studentId: parsedStudentId,
      level,
      lessonId: parsedLessonId,
      confirmOverride: Boolean(confirmOverride),
    });

    return NextResponse.json({ attendanceId });
  } catch (error) {
    console.error("Error en check-in", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar el registro de asistencia.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
