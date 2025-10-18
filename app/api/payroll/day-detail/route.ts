import { NextResponse } from "next/server";

import {
  fetchDayApproval,
  fetchDaySessions,
} from "@/features/administration/data/payroll-reports";
import { HttpError } from "@/lib/payroll/reports-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function parseStaffId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = parseStaffId(searchParams.get("staffId") ?? searchParams.get("staff_id"));
  const workDate = searchParams.get("date");

  if (!staffId || !workDate) {
    return NextResponse.json(
      { error: "Debes indicar 'staffId' y la fecha 'date'." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const [sessions, approval] = await Promise.all([
      fetchDaySessions({ staffId, workDate }),
      fetchDayApproval({ staffId, workDate }),
    ]);

    const normalizedDate =
      sessions[0]?.workDate ?? approval?.workDate ?? workDate.trim();

    const sessionPayload = sessions.map((session) => {
      const minutes = Math.max(0, Math.round(session.hours * 60));
      const latestEdit = session.edits?.[0] ?? null;
      return {
        session_id: session.sessionId,
        staff_id: session.staffId,
        work_date: session.workDate,
        checkin_local: session.checkinTime,
        checkout_local: session.checkoutTime,
        session_minutes: minutes,
        edit: latestEdit
          ? {
              original_checkin: latestEdit.originalCheckin,
              original_checkout: latestEdit.originalCheckout,
              original_minutes: latestEdit.originalMinutes,
              new_checkin: latestEdit.newCheckin,
              new_checkout: latestEdit.newCheckout,
              new_minutes: latestEdit.newMinutes,
              edited_at: latestEdit.editedAt,
              edited_by_staff_id: latestEdit.editedByStaffId,
            }
          : null,
      };
    });

    const approvalPayload = approval
      ? {
          approved: approval.approved,
          approved_minutes: approval.approvedMinutes,
          approved_by_staff_id: approval.approvedByStaffId,
          approved_at: approval.approvedAt,
          note: approval.note,
        }
      : null;

    return NextResponse.json(
      {
        staff_id: staffId,
        work_date: normalizedDate,
        sessions: sessionPayload,
        approval: approvalPayload,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Error al obtener el detalle del día de nómina", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No pudimos cargar el detalle del día." },
      {
        status: error instanceof Error ? 400 : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
