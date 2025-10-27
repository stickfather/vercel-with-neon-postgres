import { NextRequest, NextResponse } from "next/server";

import { getStudentLastLesson } from "@/features/student-checkin/data/queries";
import {
  readRouteParam,
  resolveRouteParams,
  type RouteParamsContext,
} from "@/lib/api/route-params";

export async function GET(_request: NextRequest, context: any) {
  const params = await resolveRouteParams(context);
  const rawStudentId = readRouteParam(params, "studentId");

  const parsedId = Number(rawStudentId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const lastLesson = await getStudentLastLesson(parsedId);
    if (!lastLesson) {
      return NextResponse.json({ lastLesson: null });
    }

    return NextResponse.json({
      lastLesson: {
        lessonId: lastLesson.lessonId,
        lessonName: lastLesson.lessonName,
        level: lastLesson.level,
        sequence: lastLesson.sequence,
        attendedAt: lastLesson.attendedAt,
      },
    });
  } catch (error) {
    console.error("No se pudo obtener la última lección del estudiante", error);
    return NextResponse.json(
      {
        error:
          "No pudimos recuperar la lección reciente. Selecciona manualmente la correspondiente.",
      },
      { status: 500 },
    );
  }
}
