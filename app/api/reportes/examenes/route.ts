import { NextResponse } from "next/server";

import { getExamsReport } from "src/features/management-reports/data";
import { hasAccess } from "src/features/management-reports/data/access";

export const revalidate = 180;

const successHeaders = {
  "Cache-Control": "public, s-maxage=180, stale-while-revalidate=60",
} as const;

const errorHeaders = {
  "Cache-Control": "no-store",
} as const;

export async function GET() {
  const allowed = await hasAccess("staff");
  if (!allowed) {
    return NextResponse.json(
      { error: "Debes confirmar tu PIN del personal para consultar los exámenes." },
      { status: 401, headers: errorHeaders },
    );
  }

  try {
    const data = await getExamsReport();
    return NextResponse.json(data, { headers: successHeaders });
  } catch (error) {
    console.error("Error cargando reportes de exámenes", error);
    return NextResponse.json(
      { error: "No pudimos cargar los indicadores de exámenes." },
      { status: 500, headers: errorHeaders },
    );
  }
}
