import { NextResponse } from "next/server";

import {
  deleteStaffDaySession,
  updateStaffDaySession,
} from "@/features/administration/data/payroll-reports";
import { isManagerAuthorized } from "@/lib/security/manager-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type UpdateBody = {
  checkin_time?: string | null;
  checkout_time?: string | null;
};

function parseSessionId(param: string | string[] | undefined): number | null {
  if (typeof param !== "string") return null;
  const parsed = Number(param);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string | string[] | undefined }> },
) {
  const allowed = isManagerAuthorized(request);
  if (!allowed) {
    return NextResponse.json(
      { error: "PIN de gerencia requerido." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const resolvedParams = await params;
  const sessionId = parseSessionId(resolvedParams?.id);
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

  try {
    await updateStaffDaySession({
      sessionId,
      checkinTime: payload.checkin_time ?? null,
      checkoutTime: payload.checkout_time ?? null,
    });
    return NextResponse.json(
      { updated: true },
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string | string[] | undefined }> },
) {
  const allowed = isManagerAuthorized(request);
  if (!allowed) {
    return NextResponse.json(
      { error: "PIN de gerencia requerido." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const resolvedParams = await params;
  const sessionId = parseSessionId(resolvedParams?.id);
  if (!sessionId) {
    return NextResponse.json(
      { error: "Debes indicar la sesión a eliminar." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await deleteStaffDaySession({ sessionId });
    return NextResponse.json(
      { deleted: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos eliminar la sesión.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
