import { NextResponse } from "next/server";
import { registerStaffCheckIn } from "@/app/db";

export async function POST(request: Request) {
  try {
    const { staffId } = await request.json();

    if (!staffId) {
      return NextResponse.json(
        { error: "Faltan datos para registrar la asistencia." },
        { status: 400 },
      );
    }

    const parsedStaffId = Number(staffId);

    if (!Number.isFinite(parsedStaffId)) {
      return NextResponse.json(
        { error: "El identificador enviado no es válido." },
        { status: 400 },
      );
    }

    const { attendanceId, staffName } = await registerStaffCheckIn({
      staffId: parsedStaffId,
    });

    return NextResponse.json({ attendanceId, staffName });
  } catch (error) {
    console.error("Error en check-in del personal", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar el registro de asistencia del personal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
