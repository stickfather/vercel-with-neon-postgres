import { NextResponse } from "next/server";

import { getLevelsWithLessons } from "@/features/student-checkin/data/queries";
import { readRouteParam, resolveRouteParams } from "@/lib/api/route-params";

export const dynamic = "force-dynamic";

function parseStudentId(value: string | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(_request: Request, context: any) {
  const params = await resolveRouteParams(context);
  const studentParam = readRouteParam(params, "studentId");
  const studentId = parseStudentId(studentParam);

  if (studentId == null) {
    return NextResponse.json(
      { error: "Identificador de estudiante inválido." },
      { status: 400 },
    );
  }

  try {
    const levels = await getLevelsWithLessons(studentId);
    return NextResponse.json(
      {
        student_id: studentId,
        levels: levels.map((level) => ({
          level: level.level,
          lessons: level.lessons.map((lesson) => ({
            lesson_id: lesson.id,
            lesson_name: lesson.lesson,
            level: lesson.level,
            sequence: lesson.sequence,
            global_sequence: lesson.globalSequence,
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
    console.error("Failed to load check-in lessons", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las lecciones disponibles." },
      { status: 500 },
    );
  }
}
