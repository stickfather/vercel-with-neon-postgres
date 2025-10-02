import { NextResponse } from "next/server";
import { registerCheckIn } from "@/app/db";

export async function POST(request: Request) {
  try {
    const { fullName, level, lessonId } = await request.json();

    if (!fullName || !level || !lessonId) {
      return NextResponse.json(
        { error: "Faltan datos para registrar la asistencia." },
        { status: 400 },
      );
    }

    const attendanceId = await registerCheckIn({
      fullName,
      level,
      lessonId: Number(lessonId),
    });

    return NextResponse.json({ attendanceId });
  } catch (error) {
    console.error("Error en check-in", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar el registro de asistencia.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
