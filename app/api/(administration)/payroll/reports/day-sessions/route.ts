import { NextResponse } from "next/server";
import {
  createStaffDaySession,
  fetchDaySessions,
} from "@/features/administration/data/payroll-reports";
import { hasValidPinSession } from "@/lib/security/pin-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffIdParam = searchParams.get("staffId");
  const date = searchParams.get("date");

  const staffId = staffIdParam ? Number(staffIdParam) : NaN;

  if (!Number.isFinite(staffId) || staffId <= 0 || !date) {
    return NextResponse.json(
      { error: "Debes indicar un 'staffId' válido y la fecha 'date'." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const sessions = await fetchDaySessions({ staffId, workDate: date });
    return NextResponse.json(
      { sessions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error al obtener las sesiones del día", error);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos cargar las sesiones del día.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  const allowed = await hasValidPinSession("management");
  if (!allowed) {
    return NextResponse.json(
      { error: "PIN de gerencia requerido." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("No se pudo leer el cuerpo de la solicitud", error);
    return NextResponse.json(
      { error: "No pudimos leer los datos enviados." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { staffId, workDate, checkinTime, checkoutTime } = (payload ?? {}) as {
    staffId?: number;
    workDate?: string;
    checkinTime?: string | null;
    checkoutTime?: string | null;
  };

  if (!Number.isFinite(staffId) || !workDate) {
    return NextResponse.json(
      { error: "Debes indicar 'staffId' y el 'workDate' a modificar." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const session = await createStaffDaySession({
      staffId: Number(staffId),
      workDate,
      checkinTime: typeof checkinTime === "string" ? checkinTime : null,
      checkoutTime: typeof checkoutTime === "string" ? checkoutTime : null,
    });
    return NextResponse.json(
      { session },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("No se pudo crear la sesión", error);
    const message =
      error instanceof Error ? error.message : "No pudimos crear la sesión solicitada.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
