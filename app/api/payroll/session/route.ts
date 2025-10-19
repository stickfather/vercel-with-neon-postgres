import { NextResponse } from "next/server";

import {
  createStaffDaySession,
} from "@/features/administration/data/payroll-reports";
import { isManagerAuthorized } from "@/lib/security/manager-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type CreateBody = {
  staff_id?: number;
  work_date?: string | null;
  checkin_time?: string | null;
  checkout_time?: string | null;
};

export async function POST(request: Request) {
  const allowed = isManagerAuthorized(request);
  if (!allowed) {
    return NextResponse.json(
      { error: "PIN de gerencia requerido." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: CreateBody;
  try {
    payload = (await request.json()) as CreateBody;
  } catch (error) {
    return NextResponse.json(
      { error: "No pudimos leer los datos enviados." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const staffId = Number(payload.staff_id);
  if (!Number.isFinite(staffId) || staffId <= 0) {
    return NextResponse.json(
      { error: "Debes indicar el colaborador." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const session = await createStaffDaySession({
      staffId,
      workDate: payload.work_date ?? null,
      checkinTime: payload.checkin_time ?? null,
      checkoutTime: payload.checkout_time ?? null,
    });
    return NextResponse.json(
      { session_id: session.sessionId },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos registrar la sesión.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
