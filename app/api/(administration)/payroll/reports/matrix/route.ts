import { NextResponse } from "next/server";
import { fetchPayrollMatrix } from "@/features/administration/data/payroll-reports";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Debes indicar las fechas 'from' y 'to'." },
      { status: 400 },
    );
  }

  try {
    const data = await fetchPayrollMatrix({ from, to });
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
