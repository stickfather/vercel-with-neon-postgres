import { NextResponse } from "next/server";

import {
  setPinSession,
  type PinScope,
} from "@/lib/security/pin-session";
import { verifySecurityPin } from "@/features/security/data/pins";

type VerifyRequest = {
  scope?: string;
  pin?: string;
};

function toScope(value: string | undefined): PinScope | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "staff") return "staff";
  if (normalized === "management") return "management";
  return null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as VerifyRequest;
  const scope = toScope(body.scope);
  const pin = typeof body.pin === "string" ? body.pin : "";

  if (!scope || !pin.trim()) {
    return NextResponse.json(
      { error: "Se requiere el alcance y el PIN para continuar." },
      { status: 400 },
    );
  }

  const isValid = await verifySecurityPin(scope, pin.trim());
  if (!isValid) {
    return NextResponse.json({ error: "PIN incorrecto." }, { status: 401 });
  }

  await setPinSession(scope);

  return NextResponse.json({ ok: true });
}
