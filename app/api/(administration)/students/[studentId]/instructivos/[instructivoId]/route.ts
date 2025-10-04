import { NextResponse } from "next/server";
import {
  deleteStudentInstructivo,
  updateStudentInstructivo,
} from "@/features/administration/data/student-profile";

type InstructivoParams = Promise<{ studentId: string; instructivoId: string }>;

export async function PUT(
  request: Request,
  { params }: { params: InstructivoParams },
) {
  try {
    const { instructivoId: instructivoIdStr } = await params;
    const instructivoId = Number(instructivoIdStr);

    if (!Number.isFinite(instructivoId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!title) {
      return NextResponse.json(
        { error: "El título es obligatorio." },
        { status: 400 },
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: "Debes ingresar las instrucciones o contenido." },
        { status: 400 },
      );
    }

    const note = typeof body?.note === "string" ? body.note.trim() || null : null;
    const createdBy =
      typeof body?.createdBy === "string" && body.createdBy.trim().length
        ? body.createdBy.trim()
        : null;

    await updateStudentInstructivo(instructivoId, {
      title,
      content,
      note,
      createdBy,
    });

    return NextResponse.json({ success: true });
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
  { params }: { params: InstructivoParams },
) {
  try {
    const { instructivoId: instructivoIdStr } = await params;
    const instructivoId = Number(instructivoIdStr);

    if (!Number.isFinite(instructivoId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    await deleteStudentInstructivo(instructivoId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting student instructivo", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo eliminar el instructivo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
