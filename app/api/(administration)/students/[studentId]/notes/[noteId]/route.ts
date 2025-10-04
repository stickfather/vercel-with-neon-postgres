import { NextResponse } from "next/server";
import { deleteStudentNote, updateStudentNote } from "@/features/administration/data/student-profile";

type NoteParams = Promise<{ studentId: string; noteId: string }>;

export async function PUT(
  request: Request,
  { params }: { params: NoteParams }
) {
  try {
    const { noteId: noteIdStr } = await params;   // 👈 await params
    const noteId = Number(noteIdStr);

    if (!Number.isFinite(noteId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = await request.json();
    const noteText = body?.note;

    if (!noteText || typeof noteText !== "string" || !noteText.trim()) {
      return NextResponse.json({ error: "La nota no puede estar vacía." }, { status: 400 });
    }

    await updateStudentNote(noteId, {
      note: noteText.trim(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating student note", error);
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar la nota.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: NoteParams }
) {
  try {
    const { noteId: noteIdStr } = await params;   // 👈 await params
    const noteId = Number(noteIdStr);

    if (!Number.isFinite(noteId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    await deleteStudentNote(noteId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting student note", error);
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la nota.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
