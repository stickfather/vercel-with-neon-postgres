import { NextResponse } from "next/server";

import { fetchPayrollMonthStatus } from "@/features/administration/data/payroll-reports";
import { HttpError } from "@/lib/payroll/reports-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function normalizeMonth(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseStaffId(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.length) {
    throw new HttpError(400, "El parámetro 'staffId' no es válido.");
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new HttpError(400, "El parámetro 'staffId' no es válido.");
  }
  return parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = normalizeMonth(searchParams.get("month"));
  let staffId: number | null;
  try {
    staffId = parseStaffId(searchParams.get("staffId") ?? searchParams.get("staff_id"));
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    throw error;
  }

  if (!month) {
    return NextResponse.json(
      { error: "Debes indicar el mes de trabajo." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const rows = await fetchPayrollMonthStatus({ month, staffId });
    return NextResponse.json(
      { rows },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Error al obtener el estado mensual de nómina", error);
    return NextResponse.json(
      { error: "No pudimos cargar el estado mensual." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
