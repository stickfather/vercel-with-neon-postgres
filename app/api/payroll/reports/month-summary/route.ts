import { NextResponse } from "next/server";

import {
  MonthSummaryQuerySchema,
  getMonthSummary,
  parseWithSchema,
  HttpError,
} from "@/lib/payroll/reports-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function normalizeMonth(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }
  return trimmed;
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  console.error("Error al obtener el resumen mensual de nómina", error);
  return NextResponse.json(
    { error: "No pudimos cargar el resumen mensual." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = parseWithSchema(MonthSummaryQuerySchema, {
    month: normalizeMonth(searchParams.get("month")),
  });

  try {
    const summary = await getMonthSummary(params);
    return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
