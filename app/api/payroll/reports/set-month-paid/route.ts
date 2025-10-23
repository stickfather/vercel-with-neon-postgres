import { NextResponse } from "next/server.js";

import {
  HttpError,
  SetMonthPaidSchema,
  parseWithSchema,
  setMonthPaid,
} from "@/lib/payroll/reports-service";
import { hasValidPinSession } from "@/lib/security/pin-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function normalizeMonth(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }
  return trimmed;
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  console.error("Error al actualizar el estado de pago mensual", error);
  return NextResponse.json(
    { error: "No pudimos actualizar el estado del pago." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const allowed = await hasValidPinSession("manager");
  if (!allowed) {
    return NextResponse.json(
      { error: "PIN de gerencia requerido." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es válido." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const rawMonth = normalizeMonth((body as { month?: unknown })?.month ?? null);
    const payload = parseWithSchema(SetMonthPaidSchema, {
      ...((body && typeof body === "object") ? body : {}),
      month: rawMonth,
    });

    await setMonthPaid(payload);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
