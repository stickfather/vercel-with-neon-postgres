import { NextResponse } from "next/server";

import {
  deleteStaffDaySession,
  updateStaffDaySession,
} from "@/features/administration/data/payroll-reports";
import { hasValidPinSession } from "@/lib/security/pin-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type UpdateBody = {
  staffId?: number;
  workDate?: string;
  checkinTime?: string | null;
  checkoutTime?: string | null;
};

type DeleteBody = {
  staffId?: number;
  workDate?: string;
};

function parseSessionId(param: string | string[] | undefined): number | null {
  if (typeof param !== "string") return null;
  const parsed = Number(param);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function PUT(request: Request, { params }: { params: { id?: string } }) {
  const allowed = await hasValidPinSession("manager");
  if (!allowed) {
    return NextResponse.json(
      { error: "PIN de gerencia requerido." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const sessionId = parseSessionId(params.id);
  if (!sessionId) {
    return NextResponse.json(
      { error: "Debes indicar la sesión a actualizar." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: UpdateBody;
  try {
    payload = (await request.json()) as UpdateBody;
  } catch (error) {
    return NextResponse.json(
      { error: "No pudimos leer los datos enviados." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const staffId = Number(payload.staffId);
  const workDate = typeof payload.workDate === "string" ? payload.workDate : "";
  if (!Number.isFinite(staffId) || staffId <= 0 || !workDate.trim().length) {
    return NextResponse.json(
      { error: "Debes indicar el colaborador y la fecha del día." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const session = await updateStaffDaySession({
      sessionId,
      staffId,
      workDate,
      checkinTime: payload.checkinTime ?? null,
      checkoutTime: payload.checkoutTime ?? null,
    });
    return NextResponse.json(
      { session },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos actualizar la sesión.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id?: string } }) {
  const allowed = await hasValidPinSession("manager");
  if (!allowed) {
    return NextResponse.json(
      { error: "PIN de gerencia requerido." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const sessionId = parseSessionId(params.id);
  if (!sessionId) {
    return NextResponse.json(
      { error: "Debes indicar la sesión a eliminar." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: DeleteBody;
  try {
    payload = (await request.json()) as DeleteBody;
  } catch (error) {
    return NextResponse.json(
      { error: "No pudimos leer los datos enviados." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const staffId = Number(payload.staffId);
  const workDate = typeof payload.workDate === "string" ? payload.workDate : "";
  if (!Number.isFinite(staffId) || staffId <= 0 || !workDate.trim().length) {
    return NextResponse.json(
      { error: "Debes indicar el colaborador y la fecha del día." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await deleteStaffDaySession({ sessionId, staffId, workDate });
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos eliminar la sesión.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
