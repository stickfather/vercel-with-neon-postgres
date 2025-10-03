import { NextResponse } from "next/server";
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
