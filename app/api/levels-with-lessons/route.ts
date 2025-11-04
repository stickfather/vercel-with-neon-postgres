import { NextResponse } from "next/server";
import { getLevelsWithLessons } from "@/features/student-checkin/data/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const levels = await getLevelsWithLessons();
    return NextResponse.json({ levels });
  } catch (error) {
    console.error("Failed to load levels with lessons", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los niveles y lecciones." },
      { status: 500 },
    );
  }
}
