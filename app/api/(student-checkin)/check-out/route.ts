import { NextResponse } from "next/server.js";
import { registerCheckOut } from "@/features/student-checkin/data/queries";

export async function POST(request: Request) {
  try {
    const { attendanceId } = await request.json();

    if (!attendanceId) {
      return NextResponse.json(
        { error: "No se recibió la asistencia a cerrar." },
        { status: 400 },
      );
    }

    const attendances = await registerCheckOut(Number(attendanceId));

    return NextResponse.json({ ok: true, attendances });
  } catch (error) {
    console.error("Error en check-out", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo registrar la salida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
