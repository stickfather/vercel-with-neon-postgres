import { NextResponse } from "next/server";

import {
  closeExpiredSessions,
  closeExpiredStaffSessions,
  getSqlClient,
} from "@/lib/db/client";

export async function POST() {
  try {
    const sql = getSqlClient();
    const [studentsClosed, staffClosed] = await Promise.all([
      closeExpiredSessions(sql),
      closeExpiredStaffSessions(sql),
    ]);

    const message =
      studentsClosed > 0 || staffClosed > 0
        ? `Actualizamos ${studentsClosed} asistencia(s) de estudiantes y ${staffClosed} del personal.`
        : "No había asistencias pendientes por cerrar.";

    return NextResponse.json({
      status: "success",
      studentsClosed,
      staffClosed,
      message,
    });
  } catch (error) {
    console.error("No se pudieron cerrar las asistencias vencidas", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron cerrar las asistencias vencidas.";
    return NextResponse.json(
      { status: "error", error: message },
      { status: 500 },
    );
  }
}
