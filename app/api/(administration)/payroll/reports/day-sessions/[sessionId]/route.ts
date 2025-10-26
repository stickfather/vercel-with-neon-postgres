import { NextResponse } from "next/server.js";

import {
  deleteStaffDaySession,
  updateStaffDaySession,
} from "@/features/administration/data/payroll-reports";
import { hasValidPinSession } from "@/lib/security/pin-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const allowed = await hasValidPinSession("manager");
  if (!allowed) {
    return NextResponse.json(
      { error: "PIN de gerencia requerido." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const params = await context.params;
  const parsedId = Number(params?.sessionId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return NextResponse.json(
      { error: "El identificador de la sesión no es válido." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
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

  const { staffId, workDate, checkinTime, checkoutTime, editorStaffId, note } = (payload ?? {}) as {
    staffId?: number;
    workDate?: string;
    checkinTime?: string | null;
    checkoutTime?: string | null;
    editorStaffId?: number | null;
    note?: string | null;
  };

  if (!Number.isFinite(staffId) || !workDate) {
    return NextResponse.json(
      { error: "Debes indicar el personal y día a modificar." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const session = await updateStaffDaySession({
      sessionId: parsedId,
      staffId: Number(staffId),
      workDate,
      checkinTime: typeof checkinTime === "string" ? checkinTime : null,
      checkoutTime: typeof checkoutTime === "string" ? checkoutTime : null,
      editorStaffId:
        Number.isFinite(editorStaffId) && editorStaffId != null
          ? Number(editorStaffId)
          : undefined,
      note: typeof note === "string" ? note : undefined,
    });
    return NextResponse.json(
      { session },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("No se pudo actualizar la sesión", error);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos actualizar la sesión solicitada.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const allowed = await hasValidPinSession("manager");
  if (!allowed) {
    return NextResponse.json(
      { error: "PIN de gerencia requerido." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const params = await context.params;
  const parsedId = Number(params?.sessionId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return NextResponse.json(
      { error: "El identificador de la sesión no es válido." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch (error) {
    // Algunos clientes no envían cuerpo con DELETE.
  }

  const { staffId, workDate } = (payload ?? {}) as {
    staffId?: number;
    workDate?: string;
  };

  if (!Number.isFinite(staffId) || !workDate) {
    return NextResponse.json(
      { error: "Debes indicar el personal y día correspondientes." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await deleteStaffDaySession({
      sessionId: parsedId,
      staffId: Number(staffId),
      workDate,
    });
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("No se pudo eliminar la sesión", error);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos eliminar la sesión indicada.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
