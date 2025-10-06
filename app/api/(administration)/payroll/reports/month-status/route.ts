import { NextResponse } from "next/server";
import {
  fetchPayrollMonthStatus,
  updatePayrollMonthStatus,
} from "@/features/administration/data/payroll-reports";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const staffIdParam = searchParams.get("staffId");

  if (!month) {
    return NextResponse.json(
      { error: "Debes indicar el mes en formato 'YYYY-MM'." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const staffId = staffIdParam ? Number(staffIdParam) : null;

  if (staffId != null && (!Number.isFinite(staffId) || staffId <= 0)) {
    return NextResponse.json(
      { error: "El parámetro 'staffId' no es válido." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const rows = await fetchPayrollMonthStatus({ month, staffId: staffId ?? undefined });
    return NextResponse.json(
      { rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error al obtener el estado mensual de nómina", error);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos cargar el estado mensual de nómina.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PATCH(request: Request) {
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

  const { staffId, month, paid, paidAt } = (payload ?? {}) as {
    staffId?: number;
    month?: string;
    paid?: boolean;
    paidAt?: string | null;
  };

  if (!Number.isFinite(staffId) || !month) {
    return NextResponse.json(
      { error: "Debes indicar 'staffId' y 'month'." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await updatePayrollMonthStatus({
      staffId: Number(staffId),
      month,
      paid: Boolean(paid),
      paidAt: paid ? (paidAt ?? null) : null,
    });

    const rows = await fetchPayrollMonthStatus({
      month,
      staffId: Number(staffId),
    });

    return NextResponse.json(
      { row: rows[0] ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error al actualizar el estado mensual de nómina", error);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos actualizar el estado mensual de nómina.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
