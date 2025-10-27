import { NextResponse } from "next/server";

import { getEngagementReport } from "src/features/management-reports/data";
import { hasAccess } from "src/features/management-reports/data/access";

export const revalidate = 120;

const successHeaders = {
  "Cache-Control": "public, s-maxage=120, stale-while-revalidate=30",
} as const;

const errorHeaders = {
  "Cache-Control": "no-store",
} as const;

export async function GET() {
  const allowed = await hasAccess("staff");
  if (!allowed) {
    return NextResponse.json(
      { error: "Necesitas desbloquear el acceso del personal para continuar." },
      { status: 401, headers: errorHeaders },
    );
  }

  try {
    const data = await getEngagementReport();
    return NextResponse.json(data, { headers: successHeaders });
  } catch (error) {
    console.error("Error cargando reportes de engagement", error);
    return NextResponse.json(
      { error: "No pudimos cargar los indicadores de engagement." },
      { status: 500, headers: errorHeaders },
    );
  }
}
