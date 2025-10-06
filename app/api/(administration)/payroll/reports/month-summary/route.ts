import { NextResponse } from "next/server";
import { getPayrollMonthSummary } from "@/lib/db/payroll";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function toMonthStart(value: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  throw new Error("Debes indicar el mes en formato 'YYYY-MM'.");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");

  if (!monthParam) {
    return NextResponse.json(
      { error: "Debes indicar el parámetro 'month' en formato 'YYYY-MM'." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let monthStart: string;

  try {
    monthStart = toMonthStart(monthParam);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Debes indicar el mes en formato 'YYYY-MM'.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const rows = await getPayrollMonthSummary(monthStart);
    return NextResponse.json({ rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error al obtener el resumen mensual de nómina", error);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos cargar el resumen mensual de nómina.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
