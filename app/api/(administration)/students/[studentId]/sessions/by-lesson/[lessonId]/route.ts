import { NextResponse } from "next/server.js";

import { listStudentLessonSessions } from "@/features/administration/data/student-profile";
import {
  readRouteParam,
  resolveRouteParams,
  type RouteParamsContext,
} from "@/lib/api/route-params";

export const dynamic = "force-dynamic";

function normalizeId(value: string | null): number | null {
  if (value == null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLimit(value: string | null, fallback = 3): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.min(20, Math.trunc(parsed)));
}

export async function GET(request: Request, context: any) {
  const params = await resolveRouteParams(context);
  const studentParam = readRouteParam(params, "studentId");
  const lessonParam = readRouteParam(params, "lessonId");
  const studentId = normalizeId(studentParam ?? "");
  const lessonId = normalizeId(lessonParam ?? "");

  const { searchParams } = new URL(request.url);
  const limit = normalizeLimit(searchParams.get("limit"));
  const lessonGlobalSeq = normalizeId(searchParams.get("lessonGlobalSeq"));
  const level = searchParams.get("level");
  const seq = normalizeId(searchParams.get("seq"));

  if (studentId == null || (lessonId == null && lessonGlobalSeq == null && !level)) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const sessions = await listStudentLessonSessions(
      studentId,
      { lessonId, lessonGlobalSeq, level, seq },
      limit,
    );
    return NextResponse.json(
      { sessions },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching student lesson sessions", error);
    return NextResponse.json(
      { error: "No se pudo obtener el historial de la lección." },
      { status: 500 },
    );
  }
}
