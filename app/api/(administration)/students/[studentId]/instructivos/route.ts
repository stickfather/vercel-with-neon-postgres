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

    const instructivo = await createStudentInstructivo(studentId, {
      title,
      dueDate,
      completed,
      note,
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
