import { NextResponse } from "next/server";
import { closeExpiredSessions } from "@/app/db";

export const dynamic = "force-dynamic";

async function runAutoCheckout() {
  try {
    const closed = await closeExpiredSessions();
    return NextResponse.json({ ok: true, closed });
  } catch (error) {
    console.error("Error al cerrar asistencias automáticas", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron cerrar las asistencias automáticamente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return runAutoCheckout();
}

export async function POST() {
  return runAutoCheckout();
}
