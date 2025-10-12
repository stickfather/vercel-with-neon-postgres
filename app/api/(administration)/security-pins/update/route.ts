import { NextResponse } from "next/server";

import {
  getSecurityPinStatuses,
  updateSecurityPin,
  verifySecurityPin,
} from "@/features/security/data/pins";
import {
  setPinSession,
  type PinScope,
} from "@/lib/security/pin-session";

type UpdateRequest = {
  scope?: string;
  pin?: string;
  managerPin?: string;
};

function toScope(value: string | undefined): PinScope | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "staff") return "staff";
  if (normalized === "management") return "management";
  return null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as UpdateRequest;
  const scope = toScope(body.scope);
  const pin = typeof body.pin === "string" ? body.pin : "";

  if (!scope || !pin.trim()) {
    return NextResponse.json(
      { error: "Debes indicar el PIN y el ámbito que deseas actualizar." },
      { status: 400 },
    );
  }

  const statuses = await getSecurityPinStatuses();
  const managementStatus = statuses.find((status) => status.scope === "management");
  const managerPin = body.managerPin?.trim() ?? "";

  if (scope === "staff") {
    if (!managerPin) {
      return NextResponse.json(
        { error: "Necesitas el PIN de gerencia para actualizar este valor." },
        { status: 401 },
      );
    }
    const validManagerPin = await verifySecurityPin("management", managerPin);
    if (!validManagerPin) {
      return NextResponse.json(
        { error: "El PIN de gerencia no es correcto." },
        { status: 401 },
      );
    }
  } else if (scope === "management") {
    const isAlreadySet = Boolean(managementStatus?.isSet);
    if (isAlreadySet) {
      if (!managerPin) {
        return NextResponse.json(
          { error: "Debes confirmar el PIN de gerencia actual para cambiarlo." },
          { status: 401 },
        );
      }
      const validManagerPin = await verifySecurityPin("management", managerPin);
      if (!validManagerPin) {
        return NextResponse.json(
          { error: "El PIN de gerencia proporcionado no coincide." },
          { status: 401 },
        );
      }
    }
  }

  try {
    const status = await updateSecurityPin(scope, pin);
    setPinSession(scope);
    if (scope === "staff" && managerPin) {
      setPinSession("management");
    }
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    console.error("No se pudo actualizar el PIN", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el PIN solicitado.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
