import { NextResponse } from "next/server";
import { registerCheckIn } from "@/app/db";

export async function POST(request: Request) {
  try {
    const { level, lessonId, studentId } = await request.json();

    if (!level || !lessonId || !studentId) {
      return NextResponse.json(
        { error: "Faltan datos para registrar la asistencia." },
        { status: 400 },
      );
    }

    const parsedLessonId = Number(lessonId);
    const parsedStudentId = Number(studentId);

    if (!Number.isFinite(parsedLessonId) || !Number.isFinite(parsedStudentId)) {
      return NextResponse.json(
        { error: "Los identificadores enviados no son válidos." },
        { status: 400 },
      );
    }

    const { attendanceId, studentName } = await registerCheckIn({
      level,
      lessonId: parsedLessonId,
      studentId: parsedStudentId,
    });

    return NextResponse.json({ attendanceId, studentName });
  } catch (error) {
    console.error("Error en check-in", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar el registro de asistencia.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
