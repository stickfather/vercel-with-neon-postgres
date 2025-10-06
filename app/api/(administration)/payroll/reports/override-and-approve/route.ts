import { NextResponse } from "next/server";
import { overrideSessionsAndApprove } from "@/features/administration/data/payroll-reports";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type OverridePayload = {
  sessionId?: number;
  checkinTime?: string;
  checkoutTime?: string;
};

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

  const { staffId, workDate, overrides } = (payload ?? {}) as {
    staffId?: number;
    workDate?: string;
    overrides?: OverridePayload[];
  };

  if (!Number.isFinite(staffId) || !workDate || !Array.isArray(overrides)) {
    return NextResponse.json(
      {
        error:
          "Debes indicar 'staffId', 'workDate' y la lista de 'overrides'.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const sanitizedOverrides = overrides
    .map((entry) => ({
      sessionId: Number(entry.sessionId),
      checkinTime: entry.checkinTime ?? null,
      checkoutTime: entry.checkoutTime ?? null,
    }))
    .filter(
      (entry): entry is { sessionId: number; checkinTime: string; checkoutTime: string } =>
        Number.isFinite(entry.sessionId) && entry.sessionId > 0 &&
        typeof entry.checkinTime === "string" &&
        typeof entry.checkoutTime === "string",
    );

  if (!sanitizedOverrides.length) {
    return NextResponse.json(
      { error: "Debes enviar al menos una sesión válida para editar." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await overrideSessionsAndApprove({
      staffId: Number(staffId),
      workDate,
      overrides: sanitizedOverrides,
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error al modificar y aprobar el día", error);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos modificar y aprobar el día.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
