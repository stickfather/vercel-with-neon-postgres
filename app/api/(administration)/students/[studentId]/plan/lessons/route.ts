import { NextRequest, NextResponse } from "next/server";

import { listStudentCoachPlanLessons } from "@/features/administration/data/student-profile";
import {
  readRouteParam,
  resolveRouteParams,
  type RouteParamsContext,
} from "@/lib/api/route-params";

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
    const levels = await listStudentCoachPlanLessons(studentId);
    return NextResponse.json(
      {
        levels: levels.map((level) => ({
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
    console.error("Error fetching student plan lessons", error);
    return NextResponse.json(
      { error: "No se pudo obtener el recorrido de lecciones." },
      { status: 500 },
    );
  }
}
