import { NextResponse } from "next/server.js";

import { fetchDaySessions } from "@/features/administration/data/payroll-reports";

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
    const sessions = await fetchDaySessions({ staffId, workDate });
    return NextResponse.json(
      { sessions },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error al obtener las sesiones del día", error);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos cargar las sesiones del día.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
