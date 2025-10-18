import { NextResponse } from "next/server.js";
import {
  getStudentStatusForCheckIn,
  validateStudentLessonSelection,
} from "@/features/student-checkin/data/queries";

export async function POST(request: Request) {
  try {
    const { studentId, lessonId } = await request.json();

    if (!studentId || !lessonId) {
      return NextResponse.json(
        { error: "Faltan datos para validar la lección seleccionada." },
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

    const statusCheck = await getStudentStatusForCheckIn(parsedStudentId);
    if (!statusCheck.isActive) {
      return NextResponse.json({
        isActive: false,
        needsConfirmation: false,
        message:
          "Tu cuenta requiere atención. Por favor, contacta a la administración.",
      });
    }

    const validation = await validateStudentLessonSelection(
      parsedStudentId,
      parsedLessonId,
    );

    return NextResponse.json({
      isActive: true,
      needsConfirmation: validation.needsConfirmation,
      lastLessonName: validation.lastLessonName,
      lastLessonSequence: validation.lastLessonSequence,
      selectedLessonName: validation.selectedLessonName,
      selectedLessonSequence: validation.selectedLessonSequence,
    });
  } catch (error) {
    console.error(
      "Error al validar la lección seleccionada para el check-in",
      error,
    );
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos validar la lección seleccionada.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
