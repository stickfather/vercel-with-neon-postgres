import { NextResponse } from "next/server";
import { getActiveAttendances } from "@/features/student-checkin/data/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const attendances = await getActiveAttendances();
    return NextResponse.json({ attendances });
  } catch (error) {
    console.error("Failed to load active attendances", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las asistencias activas." },
      { status: 500 },
    );
  }
}
