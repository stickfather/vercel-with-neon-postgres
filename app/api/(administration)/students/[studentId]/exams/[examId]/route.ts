import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server.js";

import { deleteStudentExam, updateStudentExam } from "@/features/administration/data/student-profile";

export const dynamic = "force-dynamic";

function normalizeId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ studentId: string; examId: string }> },
) {
  try {
    const resolvedParams = await params;
    const examId = normalizeId(resolvedParams.examId);
    const studentId = normalizeId(resolvedParams.studentId);
    if (examId == null || studentId == null) {
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

    const updated = await updateStudentExam(examId, {
      timeScheduled,
      status,
      score,
      passed,
      notes,
    });

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating student exam", error);
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar el examen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ studentId: string; examId: string }> },
) {
  try {
    const resolvedParams = await params;
    const examId = normalizeId(resolvedParams.examId);
    const studentId = normalizeId(resolvedParams.studentId);
    if (examId == null || studentId == null) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const deleted = await deleteStudentExam(examId);

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);

    return NextResponse.json(deleted);
  } catch (error) {
    console.error("Error deleting student exam", error);
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar el examen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
