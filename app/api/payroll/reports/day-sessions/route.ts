import { NextResponse } from "next/server";

import {
  DaySessionsQuerySchema,
  getDaySessions,
  parseWithSchema,
  HttpError,
} from "@/lib/payroll/reports-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  console.error("Error al obtener las sesiones del día", error);
  return NextResponse.json(
    { error: "No pudimos cargar las sesiones del día." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffIdParam = searchParams.get("staffId") ?? searchParams.get("staff_id");
  const params = parseWithSchema(DaySessionsQuerySchema, {
    staffId: staffIdParam ? Number(staffIdParam) : Number.NaN,
    date: searchParams.get("date"),
  });

  try {
    const sessions = await getDaySessions(params);
    return NextResponse.json(sessions, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
