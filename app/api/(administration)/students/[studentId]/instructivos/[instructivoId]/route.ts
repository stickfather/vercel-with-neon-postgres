import { NextResponse } from "next/server";
import {
  deleteStudentInstructivo,
  updateStudentInstructivo,
} from "@/features/administration/data/student-profile";

type InstructivoParams = Promise<{ studentId: string; instructivoId: string }>;

function parseExamId(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

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
    const dueDate = typeof body?.dueDate === "string" ? body.dueDate : null;

    if (!dueDate) {
      return NextResponse.json(
        { error: "La fecha de entrega es obligatoria." },
        { status: 400 },
      );
    }

    const examId = parseExamId(body?.examId);
    const completed = Boolean(body?.completed);
    let completedAt = typeof body?.completedAt === "string" ? body.completedAt : null;
    const notes = typeof body?.notes === "string" ? body.notes.trim() || null : null;

    if (completed && !completedAt) {
      completedAt = new Date().toISOString().slice(0, 16);
    }

    await updateStudentInstructivo(instructivoId, {
      examId,
      dueDate,
      completed,
      completedAt,
      notes,
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
