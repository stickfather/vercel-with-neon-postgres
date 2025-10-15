import { NextResponse } from "next/server";

import { ApproveDaySchema, approveDay, parseWithSchema, HttpError } from "@/lib/payroll/reports-service";
import { hasValidPinSession } from "@/lib/security/pin-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  console.error("Error al aprobar el día de nómina", error);
  return NextResponse.json(
    { error: "No pudimos aprobar el día seleccionado." },
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

  const payload = parseWithSchema(ApproveDaySchema, body);

  try {
    await approveDay(payload);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
