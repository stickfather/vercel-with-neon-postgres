import { NextResponse } from "next/server";

import { getLevelBands } from "src/features/reports/resumen/data";

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
    const bands = await getLevelBands();
    return NextResponse.json(bands, {
      headers: successHeaders(),
    });
  } catch (error) {
    console.error("Error loading resumen bands", error);
    return NextResponse.json(
      { error: "No pudimos cargar el progreso por nivel." },
      {
        status: 500,
        headers: errorHeaders,
      },
    );
  }
}
