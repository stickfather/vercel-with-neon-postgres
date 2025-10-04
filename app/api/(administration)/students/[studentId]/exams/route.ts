import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { createStudentExam } from "@/features/administration/data/student-profile";

export const dynamic = "force-dynamic";

function normalizeStudentId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const resolvedParams = await params;
    const studentId = normalizeStudentId(resolvedParams.studentId);
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

    const status = typeof payload.status === "string" ? (payload.status as string) : null;
    const passed = Boolean(payload.passed);
    const notes =
      typeof payload.notes === "string"
        ? (payload.notes as string).trim() || null
        : null;

    const exam = await createStudentExam(studentId, {
      timeScheduled,
      status,
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
