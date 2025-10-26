import { NextResponse } from "next/server";

import { sanitizePin, validateAccessPin } from "@/features/security/data/pins";

type ValidatePayload = {
  role?: unknown;
  pin?: unknown;
};

function resolveRole(value: unknown) {
  if (value === "manager" || value === "staff") {
    return value;
  }
  return null;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  let payload: ValidatePayload;

  try {
    payload = (await request.json()) as ValidatePayload;
  } catch (error) {
    console.error("No se pudo leer la solicitud de validación de PIN", error);
    return NextResponse.json(
      { valid: false, error: "No se pudo leer la solicitud enviada." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const role = resolveRole(payload?.role);
  const pin = typeof payload?.pin === "string" ? payload.pin : "";

  if (!role || !pin) {
    return NextResponse.json(
      { valid: false, error: "Debes indicar el rol y el PIN a validar." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const sanitized = sanitizePin(pin);
    const valid = await validateAccessPin(role, sanitized);
    return NextResponse.json(
      { valid },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("No pudimos validar el PIN", error);
    return NextResponse.json(
      { valid: false, error: "No pudimos validar el PIN solicitado." },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
