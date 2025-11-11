import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server.js";

import { createStudentExam } from "@/features/administration/data/student-profile";
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

export async function POST(request: Request, context: any) {
  try {
    const params = await resolveRouteParams(context);
    const studentParam = readRouteParam(params, "studentId");
    const studentId = normalizeStudentId(studentParam ?? "");
    if (studentId == null) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }
    const payload = body as Record<string, unknown>;

    const timeScheduled =
      typeof payload.timeScheduled === "string" && payload.timeScheduled.trim().length
        ? (payload.timeScheduled as string)
        : null;

    if (!timeScheduled) {
      return NextResponse.json(
        { error: "La fecha y hora programada es obligatoria." },
        { status: 400 },
      );
    }

    const status = typeof payload.status === "string" ? (payload.status as string) : null;
    const validStatuses = ["Programado", "Aprobado", "Reprobado", "Cancelado"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `El estado debe ser uno de: ${validStatuses.join(", ")}.` },
        { status: 400 },
      );
    }

    const level = typeof payload.level === "string" ? (payload.level as string) : null;
    const validLevels = ["A1", "A2", "B1", "B2", "C1"];
    if (level && !validLevels.includes(level)) {
      return NextResponse.json(
        { error: `El nivel debe ser uno de: ${validLevels.join(", ")}.` },
        { status: 400 },
      );
    }

    const scoreValue = payload.score;
    const score =
      scoreValue == null || scoreValue === ""
        ? null
        : typeof scoreValue === "number"
          ? scoreValue
          : Number(scoreValue);

    if (score != null && !Number.isFinite(score)) {
      return NextResponse.json(
        { error: "La calificación debe ser numérica." },
        { status: 400 },
      );
    }

    const passed = Boolean(payload.passed);
    const notes =
      typeof payload.notes === "string"
        ? (payload.notes as string).trim() || null
        : null;

    const exam = await createStudentExam(studentId, {
      timeScheduled,
      status,
      level,
      score,
      passed,
      notes,
    });

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);
    return NextResponse.json(exam);
  } catch (error) {
    console.error("Error creating student exam", error);
    const message =
      error instanceof Error ? error.message : "No se pudo crear el examen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
