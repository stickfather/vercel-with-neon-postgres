import { NextResponse } from "next/server";
import { approveStaffDay } from "@/features/administration/data/payroll-reports";

export async function POST(request: Request) {
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
      { status: 400 },
    );
  }

  try {
    await approveStaffDay({ staffId: Number(staffId), workDate });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al aprobar el día", error);
    const message =
      error instanceof Error ? error.message : "No pudimos aprobar el día.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
