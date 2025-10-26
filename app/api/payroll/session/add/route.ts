import { NextResponse } from "next/server.js";

import { createStaffDaySession } from "@/features/administration/data/payroll-reports";
import { hasValidPinSession } from "@/lib/security/pin-session";

type SegmentedPayload = {
  staffId?: number;
  workDate?: string;
  inHour?: string;
  inMinute?: string;
  inAmPm?: string;
  outHour?: string;
  outMinute?: string;
  outAmPm?: string;
  note?: string | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function formatSegment(hour?: string, minute?: string, period?: string): string | null {
  if (!hour || !minute || !period) {
    return null;
  }

  const safeHour = Number(hour);
  const safeMinute = Number(minute);
  const upperPeriod = period.toUpperCase();

  if (!Number.isFinite(safeHour) || safeHour < 1 || safeHour > 12) {
    return null;
  }

  if (!Number.isFinite(safeMinute) || safeMinute < 0 || safeMinute > 59) {
    return null;
  }

  if (upperPeriod !== "AM" && upperPeriod !== "PM") {
    return null;
  }

  return `${String(safeHour).padStart(2, "0")}:${String(safeMinute).padStart(2, "0")} ${upperPeriod}`;
}

export async function POST(request: Request) {
  const allowed = await hasValidPinSession("manager");
  if (!allowed) {
    return NextResponse.json(
      { error: "PIN de gerencia requerido." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: SegmentedPayload;
  try {
    payload = (await request.json()) as SegmentedPayload;
  } catch (error) {
    console.error("No se pudo leer el cuerpo de la solicitud", error);
    return NextResponse.json(
      { error: "No pudimos leer los datos enviados." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { staffId, workDate, inHour, inMinute, inAmPm, outHour, outMinute, outAmPm, note } = payload;

  if (!Number.isFinite(staffId) || !workDate) {
    return NextResponse.json(
      { error: "Debes indicar 'staffId' y el 'workDate' a modificar." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const checkinTime = formatSegment(inHour, inMinute, inAmPm);
  const checkoutTime = formatSegment(outHour, outMinute, outAmPm);

  if (!checkinTime || !checkoutTime) {
    return NextResponse.json(
      { error: "Las horas enviadas no son válidas." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const session = await createStaffDaySession({
      staffId: Number(staffId),
      workDate,
      checkinTime,
      checkoutTime,
      note: typeof note === "string" ? note : undefined,
    });

    return NextResponse.json(
      { session, newSessionId: session.sessionId },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("No se pudo crear la sesión", error);
    const message = error instanceof Error ? error.message : "No pudimos crear la sesión solicitada.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
