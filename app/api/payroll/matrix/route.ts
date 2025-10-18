import { NextResponse } from "next/server";

import {
  fetchPayrollMatrix,
} from "@/features/administration/data/payroll-reports";
import { HttpError } from "@/lib/payroll/reports-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function parseDateParam(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  return trimmed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = parseDateParam(searchParams.get("from"));
  const to = parseDateParam(searchParams.get("to"));
  const month = parseDateParam(searchParams.get("month"));

  try {
    const matrix = await fetchPayrollMatrix({
      month,
      start: from,
      end: to,
    });
    return NextResponse.json(matrix, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Error al obtener la matriz de nómina", error);
    return NextResponse.json(
      { error: "No pudimos cargar la matriz de nómina." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
