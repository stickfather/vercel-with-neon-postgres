import { NextResponse } from "next/server.js";

import { getStudentLessonRecorrido } from "@/features/administration/data/student-profile";

export const dynamic = "force-dynamic";

function normalizeStudentId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const resolvedParams = await params;
  const studentId = normalizeStudentId(resolvedParams.studentId);

  if (studentId == null) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const recorrido = await getStudentLessonRecorrido(studentId);
    const lessons = recorrido.lessons.map((lesson) => ({
      lesson_id: lesson.lessonId,
      level: lesson.level,
      seq: lesson.seq,
      lesson_name: lesson.lessonName,
      is_intro_booklet: lesson.isIntroBooklet,
      is_exam: lesson.isExam,
      is_current_lesson: lesson.isCurrentLesson,
      is_completed_visual: lesson.isCompletedVisual,
      hours_spent: lesson.hoursSpent,
      calendar_days_spent: lesson.calendarDaysSpent,
    }));
    return NextResponse.json(
      {
        student_id: studentId,
        planned_level_min: recorrido.plannedLevelMin,
        planned_level_max: recorrido.plannedLevelMax,
        lessons,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching student lesson recorrido", error);
    return NextResponse.json(
      { error: "No se pudo obtener el recorrido de lecciones." },
      { status: 500 },
    );
  }
}
