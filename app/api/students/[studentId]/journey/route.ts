import { NextRequest, NextResponse } from "next/server";

import { listStudentLessonJourneyLessons } from "@/features/administration/data/student-profile";
import { readRouteParam, resolveRouteParams } from "@/lib/api/route-params";

export const dynamic = "force-dynamic";

function normalizeStudentId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(_request: NextRequest, context: any) {
  const params = await resolveRouteParams(context);
  const studentParam = readRouteParam(params, "studentId");
  const studentId = normalizeStudentId(studentParam ?? "");

  if (studentId == null) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const journey = await listStudentLessonJourneyLessons(studentId);
    const lessons = journey.lessons.map((lesson) => ({
      lesson_id: lesson.lessonId,
      level: lesson.levelCode,
      seq: lesson.lessonLevelSeq ?? lesson.lessonGlobalSeq,
      lesson_level_seq: lesson.lessonLevelSeq,
      lesson_global_seq: lesson.lessonGlobalSeq,
      status: lesson.status,
      hours_in_lesson: lesson.hoursInLesson,
      days_in_lesson: lesson.daysInLesson,
      is_intro: lesson.isIntro,
      is_exam: lesson.isExam,
      lesson_name: lesson.lessonTitle,
      display_label: lesson.displayLabel,
    }));

    return NextResponse.json(lessons, {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("Error fetching student lesson journey", error);
    return NextResponse.json(
      { error: "No se pudo obtener el recorrido de lecciones." },
      { status: 500 },
    );
  }
}
