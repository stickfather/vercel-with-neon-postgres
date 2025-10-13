import { NextResponse } from "next/server.js";

import { getSecurityPinStatuses, getSecurityPinsSummary, updateSecurityPins } from "@/features/security/data/pins";
import { hasValidPinSession, setPinSession } from "@/lib/security/pin-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const summary = await getSecurityPinsSummary();

    return NextResponse.json(
      summary,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("No se pudieron obtener los PIN de seguridad", error);
    return NextResponse.json(
      { error: "No pudimos cargar el estado de los PIN de seguridad." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

type UpdateBody = {
  staffPin?: string;
  managerPin?: string;
};

function hasValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  let payload: UpdateBody;
  try {
    payload = (await request.json()) as UpdateBody;
  } catch (error) {
    console.error("No se pudo leer los datos enviados", error);
    return NextResponse.json(
      { error: "No pudimos leer los datos enviados." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const staffPin = hasValue(payload?.staffPin) ? payload.staffPin.trim() : undefined;
  const managerPin = hasValue(payload?.managerPin) ? payload.managerPin.trim() : undefined;

  if (!staffPin && !managerPin) {
    return NextResponse.json(
      { error: "Debes indicar al menos un PIN para actualizar." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const statuses = await getSecurityPinStatuses();
    const managerStatus = statuses.find((status) => status.scope === "manager");
    const managerAlreadySet = Boolean(managerStatus?.isSet);

    let hasSession = await hasValidPinSession("manager");

    if (!hasSession && managerPin && !managerAlreadySet) {
      // Permitir configurar el PIN de gerencia por primera vez.
      hasSession = true;
    }

    if (!hasSession && (staffPin || managerPin)) {
      return NextResponse.json(
        { error: "PIN de gerencia requerido." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    await updateSecurityPins({ staffPin, managerPin });

    if (hasSession) {
      await setPinSession("manager");
    }

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("No se pudo actualizar el PIN", error);
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar el PIN solicitado.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
