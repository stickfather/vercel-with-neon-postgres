import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  deleteStudentInstructivo,
  updateStudentInstructivo,
} from "@/features/administration/data/student-profile";

export const dynamic = "force-dynamic";

function normalizeId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ studentId: string; instructivoId: string }> },
) {
  try {
    const resolvedParams = await params;
    const instructivoId = normalizeId(resolvedParams.instructivoId);
    const studentId = normalizeId(resolvedParams.studentId);

    if (instructivoId == null || studentId == null) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }
    const payload = body as Record<string, unknown>;
    const title = typeof payload.title === "string" ? (payload.title as string).trim() : "";

    if (!title) {
      return NextResponse.json(
        { error: "El título es obligatorio." },
        { status: 400 },
      );
    }

    const dueDate =
      typeof payload.dueDate === "string" && (payload.dueDate as string).trim().length
        ? (payload.dueDate as string).trim()
        : null;
    const completedRaw = payload.completed;
    const completed =
      typeof completedRaw === "boolean"
        ? completedRaw
        : typeof completedRaw === "string"
          ? ["true", "1", "yes", "y", "si", "sí"].includes(completedRaw.trim().toLowerCase())
          : false;
    const note = typeof payload.note === "string" ? (payload.note as string).trim() || null : null;

    const updated = await updateStudentInstructivo(instructivoId, {
      title,
      dueDate,
      completed,
      note,
    });

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating student instructivo", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el instructivo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ studentId: string; instructivoId: string }> },
) {
  try {
    const resolvedParams = await params;
    const instructivoId = normalizeId(resolvedParams.instructivoId);
    const studentId = normalizeId(resolvedParams.studentId);

    if (instructivoId == null || studentId == null) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const deleted = await deleteStudentInstructivo(instructivoId);

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);

    return NextResponse.json(deleted);
  } catch (error) {
    console.error("Error deleting student instructivo", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo eliminar el instructivo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
