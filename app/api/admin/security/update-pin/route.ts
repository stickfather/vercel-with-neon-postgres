import { NextResponse } from "next/server";

import {
  isSecurityPinEnabled,
  sanitizePin,
  updateAccessPin,
  validateAccessPin,
} from "@/features/security/data/pins";

type StaffUpdatePayload = {
  targetRole: "staff";
  managerPin?: unknown;
  newPin?: unknown;
};

type ManagerUpdatePayload = {
  targetRole: "manager";
  currentManagerPin?: unknown;
  newPin?: unknown;
};

type UpdatePayload = StaffUpdatePayload | ManagerUpdatePayload | Record<string, unknown>;

function normalizePin(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return sanitizePin(value);
  } catch (error) {
    return null;
  }
}

const INVALID_PIN_ERROR = "PIN incorrecto.";
const PIN_FORMAT_ERROR = "El PIN debe tener exactamente 4 dígitos numéricos.";

function errorResponse(message: string, status = 200) {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  let payload: UpdatePayload;

  try {
    payload = (await request.json()) as UpdatePayload;
  } catch (error) {
    console.error("No se pudo leer la solicitud para actualizar PIN", error);
    return errorResponse("No pudimos leer los datos enviados.", 400);
  }

  if (payload?.targetRole === "staff") {
    const managerPin = normalizePin(payload.managerPin);
    const newPin = normalizePin(payload.newPin);

    if (!managerPin) {
      return errorResponse(INVALID_PIN_ERROR);
    }

    if (!newPin) {
      return errorResponse(PIN_FORMAT_ERROR);
    }

    const managerValid = await validateAccessPin("manager", managerPin);
    if (!managerValid) {
      return errorResponse(INVALID_PIN_ERROR);
    }

    const updatedAt = await updateAccessPin("staff", newPin);

    return NextResponse.json(
      { success: true, updatedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (payload?.targetRole === "manager") {
    const newPin = normalizePin(payload.newPin);

    if (!newPin) {
      return errorResponse(PIN_FORMAT_ERROR);
    }

    const hasExistingManagerPin = await isSecurityPinEnabled("manager");

    if (hasExistingManagerPin) {
      const currentPin = normalizePin(payload.currentManagerPin);
      if (!currentPin) {
        return errorResponse(INVALID_PIN_ERROR);
      }

      const managerValid = await validateAccessPin("manager", currentPin);
      if (!managerValid) {
        return errorResponse(INVALID_PIN_ERROR);
      }
    }

    const updatedAt = await updateAccessPin("manager", newPin);

    return NextResponse.json(
      { success: true, updatedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return errorResponse("Solicitud inválida.", 400);
}
