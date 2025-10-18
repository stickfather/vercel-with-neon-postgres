import { NextResponse } from "next/server";

import { approveStaffDay } from "@/features/administration/data/payroll-reports";
import { isManagerAuthorized } from "@/lib/security/manager-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type ApproveBody = {
  staff_id?: number;
  work_date?: string;
  approved?: boolean;
  approved_minutes?: number | null;
  note?: string | null;
};

export async function POST(request: Request) {
  const allowed = isManagerAuthorized(request);
  if (!allowed) {
    return NextResponse.json(
      { error: "PIN de gerencia requerido." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: ApproveBody;
  try {
    payload = (await request.json()) as ApproveBody;
  } catch (error) {
    return NextResponse.json(
      { error: "No pudimos leer los datos enviados." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const staffId = Number(payload.staff_id);
  const workDate = typeof payload.work_date === "string" ? payload.work_date.trim() : "";
  if (!Number.isFinite(staffId) || staffId <= 0 || !workDate.length) {
    return NextResponse.json(
      { error: "Debes indicar el colaborador y la fecha del día." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (typeof payload.approved !== "boolean") {
    return NextResponse.json(
      { error: "Debes indicar si el día queda aprobado." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await approveStaffDay({
      staffId,
      workDate,
      approved: payload.approved,
      approvedMinutes:
        typeof payload.approved_minutes === "number" ? payload.approved_minutes : null,
      note: typeof payload.note === "string" && payload.note.trim().length
        ? payload.note.trim()
        : null,
    });
    return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos aprobar el día.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
