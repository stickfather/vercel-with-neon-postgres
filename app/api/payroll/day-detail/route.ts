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

    return NextResponse.json(
      { sessions, approval },
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
      { error: "No pudimos cargar el detalle del día." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
