import { NextResponse } from "next/server";
import { registerStaffCheckOut } from "@/app/db";

export async function POST(request: Request) {
  try {
    const { attendanceId } = await request.json();

    const parsedId = Number(attendanceId);
    if (!Number.isFinite(parsedId)) {
      return NextResponse.json(
        { error: "El identificador de asistencia no es válido." },
        { status: 400 },
      );
    }

    await registerStaffCheckOut(parsedId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en check-out del personal", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar el registro de salida del personal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
