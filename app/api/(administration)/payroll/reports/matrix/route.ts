import { NextResponse } from "next/server";
import { fetchPayrollMatrix } from "@/features/administration/data/payroll-reports";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!month && (!start || !end)) {
    return NextResponse.json(
      {
        error:
          "Debes indicar el parámetro 'month' o un rango de fechas 'start' y 'end' en formato 'YYYY-MM-DD'.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const data = await fetchPayrollMatrix({ month, start, end });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error al obtener la matriz de nómina", error);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos cargar la matriz de nómina.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
