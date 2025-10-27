import { NextResponse } from "next/server";

import { getFinancialReport } from "src/features/management-reports/data";
import { hasAccess } from "src/features/management-reports/data/access";

export const revalidate = 90;

const successHeaders = {
  "Cache-Control": "public, s-maxage=90, stale-while-revalidate=30",
} as const;

const errorHeaders = {
  "Cache-Control": "no-store",
} as const;

export async function GET() {
  const allowed = await hasAccess("manager");
  if (!allowed) {
    return NextResponse.json(
      { error: "Se requiere el PIN gerencial para consultar las finanzas." },
      { status: 401, headers: errorHeaders },
    );
  }

  try {
    const data = await getFinancialReport();
    return NextResponse.json(data, { headers: successHeaders });
  } catch (error) {
    console.error("Error cargando reportes financieros", error);
    return NextResponse.json(
      { error: "No pudimos cargar los indicadores financieros." },
      { status: 500, headers: errorHeaders },
    );
  }
}
