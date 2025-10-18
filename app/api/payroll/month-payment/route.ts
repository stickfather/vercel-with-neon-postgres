import { NextResponse } from "next/server";

import { updatePayrollMonthStatus } from "@/features/administration/data/payroll-reports";
import { hasValidPinSession } from "@/lib/security/pin-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Body = {
  staffId?: number;
  month?: string;
  paid?: boolean;
  paidAt?: string | null;
  amountPaid?: number | null;
  reference?: string | null;
};

export async function POST(request: Request) {
  const allowed = await hasValidPinSession("manager");
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

  const staffId = Number(payload.staffId);
  const month = typeof payload.month === "string" ? payload.month : "";
  if (!Number.isFinite(staffId) || staffId <= 0 || !month.trim().length) {
    return NextResponse.json(
      { error: "Debes indicar el colaborador y el mes de trabajo." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const paid = Boolean(payload.paid);
  const paidAt = paid ? payload.paidAt ?? null : null;
  const amountPaid = paid ? payload.amountPaid ?? null : null;
  const reference = paid ? payload.reference ?? null : null;

  try {
    await updatePayrollMonthStatus({
      staffId,
      month,
      paid,
      paidAt,
      amountPaid,
      reference,
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
