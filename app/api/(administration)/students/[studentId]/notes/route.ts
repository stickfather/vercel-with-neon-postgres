import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server.js";

import { createStudentNote, type StudentNoteType } from "@/features/administration/data/student-profile";
import {
  readRouteParam,
  resolveRouteParams,
  type RouteParamsContext,
} from "@/lib/api/route-params";

export const dynamic = "force-dynamic";

function normalizeStudentId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const VALID_NOTE_TYPES: StudentNoteType[] = [
  "Académica",
  "Conducta",
  "Asistencia",
  "Finanzas",
  "Otra",
];

function normalizeNoteType(value: unknown): StudentNoteType | null {
  if (typeof value === "string" && VALID_NOTE_TYPES.includes(value as StudentNoteType)) {
    return value as StudentNoteType;
  }
  return null;
}

export async function POST(request: Request, context: any) {
  try {
    const params = await resolveRouteParams(context);
    const studentParam = readRouteParam(params, "studentId");
    const studentId = normalizeStudentId(studentParam ?? "");

    if (studentId == null) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const noteText = body && typeof body === "object" ? (body as Record<string, unknown>).note : null;
    const noteType = body && typeof body === "object" ? (body as Record<string, unknown>).type : null;
    const managementAction = body && typeof body === "object" ? (body as Record<string, unknown>).managementAction : null;

    if (!noteText || typeof noteText !== "string" || !noteText.trim()) {
      return NextResponse.json(
        { error: "La nota no puede estar vacía." },
        { status: 400 }
      );
    }

    const note = await createStudentNote(studentId, {
      note: noteText.trim(),
      type: normalizeNoteType(noteType),
      managementAction: typeof managementAction === "boolean" ? managementAction : false,
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
