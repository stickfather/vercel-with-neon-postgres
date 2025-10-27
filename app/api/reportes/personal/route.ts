import { NextResponse } from "next/server";

import { getPersonnelReport } from "src/features/management-reports/data";
import { hasAccess } from "src/features/management-reports/data/access";

export const revalidate = 300;

const successHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=90",
} as const;

const errorHeaders = {
  "Cache-Control": "no-store",
} as const;

export async function GET() {
  const allowed = await hasAccess("staff");
  if (!allowed) {
    return NextResponse.json(
      { error: "Acceso restringido al personal autorizado." },
      { status: 401, headers: errorHeaders },
    );
  }

  try {
    const data = await getPersonnelReport();
    return NextResponse.json(data, { headers: successHeaders });
  } catch (error) {
    console.error("Error cargando reportes de personal", error);
    return NextResponse.json(
      { error: "No pudimos cargar los indicadores de personal." },
      { status: 500, headers: errorHeaders },
    );
  }
}
