import { NextResponse } from "next/server";
import { fetchPayrollMatrix } from "@/features/administration/data/payroll-reports";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (!month) {
    return NextResponse.json(
      { error: "Debes indicar el parámetro 'month' en formato 'YYYY-MM'." },
      { status: 400 },
    );
  }

  try {
    const data = await fetchPayrollMatrix({ month });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error al obtener la matriz de nómina", error);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos cargar la matriz de nómina.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
