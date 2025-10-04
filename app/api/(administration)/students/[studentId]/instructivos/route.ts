import { NextResponse } from "next/server";
import { createStudentInstructivo } from "@/features/administration/data/student-profile";

type StudentParams = Promise<{ studentId: string }>;

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

    const instructivo = await createStudentInstructivo(studentId, {
      title,
      content,
      note,
      createdBy,
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
