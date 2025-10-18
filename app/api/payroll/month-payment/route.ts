import { NextResponse } from "next/server";

import { updatePayrollMonthStatus } from "@/features/administration/data/payroll-reports";
import { isManagerAuthorized } from "@/lib/security/manager-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Body = {
  staff_id?: number;
  month?: string;
  paid?: boolean;
  paid_at?: string | null;
  amount_paid?: number | null;
  reference?: string | null;
  paid_by?: string | null;
};

export async function POST(request: Request) {
  const allowed = isManagerAuthorized(request);
  if (!allowed) {
    return NextResponse.json(
      { error: "PIN de gerencia requerido." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: Body;
  try {
    payload = (await request.json()) as Body;
  } catch (error) {
    return NextResponse.json(
      { error: "No pudimos leer los datos enviados." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const staffId = Number(payload.staff_id);
  const month = typeof payload.month === "string" ? payload.month : "";
  if (!Number.isFinite(staffId) || staffId <= 0 || !month.trim().length) {
    return NextResponse.json(
      { error: "Debes indicar el colaborador y el mes de trabajo." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const paid = Boolean(payload.paid);
  const paidAt = paid ? payload.paid_at ?? null : null;
  const amountPaid = paid ? payload.amount_paid ?? null : null;
  const reference = paid ? payload.reference ?? null : null;
  const paidBy = paid ? payload.paid_by ?? null : null;

  try {
    await updatePayrollMonthStatus({
      staffId,
      month,
      paid,
      paidAt,
      amountPaid,
      reference,
      paidBy,
    });
    return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos registrar el pago mensual.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
