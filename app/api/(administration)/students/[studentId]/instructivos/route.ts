import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { createStudentInstructivo } from "@/features/administration/data/student-profile";

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
      return NextResponse.json(
        { error: "Identificador inválido." },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }
    const payload = body as Record<string, unknown>;
    const title = typeof payload.title === "string" ? (payload.title as string).trim() : "";
    const content = typeof payload.content === "string" ? (payload.content as string).trim() : "";

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

    const note = typeof payload.note === "string" ? (payload.note as string).trim() || null : null;
    const createdBy =
      typeof payload.createdBy === "string" && (payload.createdBy as string).trim().length
        ? (payload.createdBy as string).trim()
        : null;

    const instructivo = await createStudentInstructivo(studentId, {
      title,
      content,
      note,
      createdBy,
    });

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);
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
