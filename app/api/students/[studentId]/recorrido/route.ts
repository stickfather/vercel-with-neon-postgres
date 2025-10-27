import { NextResponse } from "next/server.js";

import { getStudentLessonRecorrido } from "@/features/administration/data/student-profile";

export const dynamic = "force-dynamic";

function normalizeStudentId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(
  _request: Request,
  { params }: { params: { studentId: string } },
) {
  const studentId = normalizeStudentId(params.studentId);

  if (studentId == null) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const recorrido = await getStudentLessonRecorrido(studentId);
    return NextResponse.json(
      {
        student_id: studentId,
        planned_level_min: recorrido.plannedLevelMin,
        planned_level_max: recorrido.plannedLevelMax,
        levels: recorrido.levels.map((level) => ({
          level_code: level.levelCode,
          highest_seq_with_activity: level.highestSeqWithActivity,
          total_lessons_in_level: level.totalLessonsInLevel,
          lessons: level.lessons.map((lesson) => ({
            lesson_id: lesson.lessonId,
            level_code: lesson.levelCode,
            seq_number: lesson.seqNumber,
            lesson_title: lesson.lessonTitle,
            special_type: lesson.specialType,
            minutes_spent: lesson.minutesSpent,
            calendar_days_spent: lesson.calendarDaysSpent,
            has_activity: lesson.hasActivity,
            lesson_global_seq: lesson.lessonGlobalSeq,
          })),
        })),
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
