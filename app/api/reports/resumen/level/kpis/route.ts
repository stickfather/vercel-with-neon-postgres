import { NextResponse } from "next/server";

import { getLevelKpis } from "src/features/reports/resumen/data";

export const revalidate = 300;

function successHeaders() {
  return {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
  } as const;
}

const errorHeaders = {
  "Cache-Control": "no-store",
} as const;

export async function GET() {
  try {
    const kpis = await getLevelKpis();
    return NextResponse.json(kpis, {
      headers: successHeaders(),
    });
  } catch (error) {
    console.error("Error loading resumen KPIs", error);
    return NextResponse.json(
      { error: "No pudimos cargar los indicadores por nivel." },
      {
        status: 500,
        headers: errorHeaders,
      },
    );
  }
}
