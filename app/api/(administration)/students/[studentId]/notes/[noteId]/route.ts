import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { deleteStudentNote, updateStudentNote } from "@/features/administration/data/student-profile";

export const dynamic = "force-dynamic";

function normalizeId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ studentId: string; noteId: string }> },
) {
  try {
    const resolvedParams = await params;
    const noteId = normalizeId(resolvedParams.noteId);
    const studentId = normalizeId(resolvedParams.studentId);

    if (noteId == null || studentId == null) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const noteText = body && typeof body === "object" ? (body as Record<string, unknown>).note : null;

    if (!noteText || typeof noteText !== "string" || !noteText.trim()) {
      return NextResponse.json({ error: "La nota no puede estar vacía." }, { status: 400 });
    }

    const updated = await updateStudentNote(noteId, {
      note: noteText.trim(),
    });

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating student note", error);
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar la nota.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ studentId: string; noteId: string }> },
) {
  try {
    const resolvedParams = await params;
    const noteId = normalizeId(resolvedParams.noteId);
    const studentId = normalizeId(resolvedParams.studentId);

    if (noteId == null || studentId == null) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const deleted = await deleteStudentNote(noteId);

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);

    return NextResponse.json(deleted);
  } catch (error) {
    console.error("Error deleting student note", error);
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la nota.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
