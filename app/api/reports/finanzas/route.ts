import { NextResponse } from "next/server";
import { getFinanceReport } from "@/src/features/reports/finance/data";

export const revalidate = 600;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getFinanceReport();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error cargando reporte financiero", error);
    return NextResponse.json(
      { error: "No pudimos cargar los indicadores financieros." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
