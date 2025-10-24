import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { createStudent } from "@/features/administration/data/students";
import { searchStudents } from "@/features/student-checkin/data/queries";

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 20;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "";
  const limitParam = searchParams.get("limit");
  const parsedLimit = limitParam ? Number(limitParam) : DEFAULT_LIMIT;
  const limit = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(MAX_LIMIT, Math.trunc(parsedLimit)))
    : DEFAULT_LIMIT;

  try {
    const students = await searchStudents(query, limit);
    return NextResponse.json({ students });
  } catch (error) {
    console.error("Error al buscar estudiantes", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar la búsqueda de estudiantes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    console.error("No se pudo analizar la solicitud de creación de estudiante", error);
    return NextResponse.json(
      { error: "No se pudo procesar la solicitud." },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const fullName = typeof body.fullName === "string" ? body.fullName : "";
  const plannedLevelMin =
    typeof body.plannedLevelMin === "string" ? body.plannedLevelMin : "";
  const plannedLevelMax =
    typeof body.plannedLevelMax === "string" ? body.plannedLevelMax : "";

  if (!fullName.trim().length) {
    return NextResponse.json(
      { error: "El nombre del estudiante es obligatorio." },
      { status: 400 },
    );
  }

  if (!plannedLevelMin.trim().length) {
    return NextResponse.json(
      { error: "Selecciona el nivel planificado mínimo." },
      { status: 400 },
    );
  }

  if (!plannedLevelMax.trim().length) {
    return NextResponse.json(
      { error: "Selecciona el nivel planificado máximo." },
      { status: 400 },
    );
  }

  try {
    const student = await createStudent({
      fullName,
      plannedLevelMin,
      plannedLevelMax,
    });

    revalidatePath("/administracion/gestion-estudiantes");

    return NextResponse.json(
      { student },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("No se pudo crear el estudiante", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear el estudiante. Inténtalo nuevamente.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
