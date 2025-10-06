import { NextResponse } from "next/server";
import { fetchDaySessions } from "@/features/administration/data/payroll-reports";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffIdParam = searchParams.get("staffId");
  const date = searchParams.get("date");

  const staffId = staffIdParam ? Number(staffIdParam) : NaN;

  if (!Number.isFinite(staffId) || staffId <= 0 || !date) {
    return NextResponse.json(
      { error: "Debes indicar un 'staffId' válido y la fecha 'date'." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const sessions = await fetchDaySessions({ staffId, workDate: date });
    return NextResponse.json(
      { sessions },
      { headers: { "Cache-Control": "no-store" } },
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
