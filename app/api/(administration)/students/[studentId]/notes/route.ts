import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server.js";

import { createStudentNote } from "@/features/administration/data/student-profile";

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
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const noteText = body && typeof body === "object" ? (body as Record<string, unknown>).note : null;

    if (!noteText || typeof noteText !== "string" || !noteText.trim()) {
      return NextResponse.json(
        { error: "La nota no puede estar vacía." },
        { status: 400 }
      );
    }

    const note = await createStudentNote(studentId, {
      note: noteText.trim(),
    });

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);
    return NextResponse.json(note);
  } catch (error) {
    console.error("Error creating student note", error);
    const message =
      error instanceof Error ? error.message : "No se pudo crear la nota.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
