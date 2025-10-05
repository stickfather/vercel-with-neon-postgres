import { NextResponse } from "next/server";
import { fetchPayrollMonthStatus } from "@/features/administration/data/payroll-reports";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const staffIdParam = searchParams.get("staffId");

  if (!month) {
    return NextResponse.json(
      { error: "Debes indicar el mes en formato 'YYYY-MM'." },
      { status: 400 },
    );
  }

  const staffId = staffIdParam ? Number(staffIdParam) : null;

  if (staffId != null && (!Number.isFinite(staffId) || staffId <= 0)) {
    return NextResponse.json(
      { error: "El parámetro 'staffId' no es válido." },
      { status: 400 },
    );
  }

  try {
    const rows = await fetchPayrollMonthStatus({ month, staffId: staffId ?? undefined });
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("Error al obtener el estado mensual de nómina", error);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos cargar el estado mensual de nómina.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
