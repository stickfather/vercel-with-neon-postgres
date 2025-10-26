import { NextResponse } from "next/server.js";

import { fetchDayTotals } from "@/features/administration/data/payroll-reports";
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
  const staffIdParam = searchParams.get("staff_id") ?? searchParams.get("staffId");
  const workDate = searchParams.get("date");

  const staffId = parseStaffId(staffIdParam);

  if (!staffId || !workDate) {
    return NextResponse.json(
      { error: "Debes indicar 'staff_id' y la fecha 'date'." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const totals = await fetchDayTotals({ staffId, workDate });
    return NextResponse.json(
      { totals },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error al obtener los totales del día", error);
    const message =
      error instanceof HttpError
        ? error.message
        : error instanceof Error
          ? error.message
          : "No pudimos cargar los totales del día.";
    const status = error instanceof HttpError ? error.status : 500;
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
