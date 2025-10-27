import { NextResponse } from "next/server.js";
import { registerStaffCheckOut } from "@/features/staff/data/queries";

export async function POST(request: Request) {
  try {
    const { attendanceId } = await request.json();

    if (!attendanceId || (typeof attendanceId !== "string" && typeof attendanceId !== "number")) {
      return NextResponse.json(
        { error: "El identificador de asistencia no es válido." },
        { status: 400 },
      );
    }

    const attendances = await registerStaffCheckOut(String(attendanceId));

    return NextResponse.json({ ok: true, attendances });
  } catch (error) {
    console.error("Error en check-out del personal", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar el registro de salida del personal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
