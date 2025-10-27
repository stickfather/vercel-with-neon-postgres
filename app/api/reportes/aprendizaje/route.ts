import { NextResponse } from "next/server";

import { getLearningReport } from "src/features/management-reports/data";
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
      { error: "Debes validar tu acceso del personal para ver estos datos." },
      { status: 401, headers: errorHeaders },
    );
  }

  try {
    const data = await getLearningReport();
    return NextResponse.json(data, { headers: successHeaders });
  } catch (error) {
    console.error("Error cargando reportes de aprendizaje", error);
    return NextResponse.json(
      { error: "No pudimos cargar los indicadores de aprendizaje." },
      { status: 500, headers: errorHeaders },
    );
  }
}
