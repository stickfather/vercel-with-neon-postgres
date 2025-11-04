import { NextResponse } from "next/server";
import { searchStudents } from "@/features/student-checkin/data/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get all active students, matching the shape and order used in the UI
    const students = await searchStudents("", 1000);
    
    return NextResponse.json({ 
      students,
      version: 1,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching students cache snapshot", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo obtener la lista de estudiantes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
