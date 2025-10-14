import { NextResponse } from "next/server.js";
import { approveStaffDay } from "@/features/administration/data/payroll-reports";
import { hasValidPinSession } from "@/lib/security/pin-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const allowed = await hasValidPinSession("manager");
  if (!allowed) {
    return NextResponse.json(
      { error: "PIN de gerencia requerido." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    console.error("No se pudo leer el cuerpo de la solicitud", error);
    return NextResponse.json(
      { error: "No pudimos leer los datos enviados." },
      { status: 400 },
    );
  }

  const { staffId, workDate } = (payload ?? {}) as {
    staffId?: number;
    workDate?: string;
  };

  if (!Number.isFinite(staffId) || !workDate) {
    return NextResponse.json(
      { error: "Debes indicar 'staffId' y 'workDate'." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await approveStaffDay({ staffId: Number(staffId), workDate });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error al aprobar el día", error);
    const message =
      error instanceof Error ? error.message : "No pudimos aprobar el día.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
