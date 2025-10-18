import { NextResponse } from "next/server";

import {
  createStaffDaySession,
} from "@/features/administration/data/payroll-reports";
import { hasValidPinSession } from "@/lib/security/pin-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type CreateBody = {
  staffId?: number;
  workDate?: string;
  checkinTime?: string | null;
  checkoutTime?: string | null;
};

export async function POST(request: Request) {
  const allowed = await hasValidPinSession("manager");
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

  const staffId = Number(payload.staffId);
  const workDate = typeof payload.workDate === "string" ? payload.workDate : "";
  if (!Number.isFinite(staffId) || staffId <= 0 || !workDate.trim().length) {
    return NextResponse.json(
      { error: "Debes indicar el colaborador y la fecha del día." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const session = await createStaffDaySession({
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
      error instanceof Error ? error.message : "No pudimos registrar la sesión.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
