import { NextResponse } from "next/server";
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

    await registerCheckOut(Number(attendanceId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en check-out", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo registrar la salida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
