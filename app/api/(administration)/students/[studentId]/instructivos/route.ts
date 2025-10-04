import { NextResponse } from "next/server";
import { createStudentInstructivo } from "@/features/administration/data/student-profile";

type StudentParams = Promise<{ studentId: string }>;

function parseExamId(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: StudentParams },
) {
  try {
    const { studentId: studentIdStr } = await params;
    const studentId = Number(studentIdStr);

    if (!Number.isFinite(studentId)) {
      return NextResponse.json(
        { error: "Identificador inválido." },
        { status: 400 },
      );
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
    const notes = typeof body?.notes === "string" ? body.notes.trim() || null : null;

    const instructivo = await createStudentInstructivo(studentId, {
      dueDate,
      examId,
      notes,
    });

    return NextResponse.json(instructivo);
  } catch (error) {
    console.error("Error creating student instructivo", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear el instructivo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
