import { NextResponse } from "next/server";
import { getStudentDirectory } from "@/features/student-checkin/data/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/students/all
 * 
 * Returns ALL students for offline caching (no limit)
 * This endpoint is specifically for offline-first functionality
 */
export async function GET() {
  try {
    const students = await getStudentDirectory();
    return NextResponse.json(students);
  } catch (error) {
    console.error("Error al obtener directorio de estudiantes", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar la obtención del directorio de estudiantes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
