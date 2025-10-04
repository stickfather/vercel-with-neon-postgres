import { NextResponse } from "next/server";
import { createStudentNote } from "@/features/administration/data/student-profile";

type StudentParams = Promise<{ studentId: string }>;

export async function POST(
  request: Request,
  { params }: { params: StudentParams }
) {
  try {
    const { studentId: studentIdStr } = await params;   // 👈 await params
    const studentId = Number(studentIdStr);

    if (!Number.isFinite(studentId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = await request.json();
    const noteText = body?.note;

    if (!noteText || typeof noteText !== "string" || !noteText.trim()) {
      return NextResponse.json(
        { error: "La nota no puede estar vacía." },
        { status: 400 }
      );
    }

    const note = await createStudentNote(studentId, {
      note: noteText.trim(),
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error creating student note", error);
    const message =
      error instanceof Error ? error.message : "No se pudo crear la nota.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
