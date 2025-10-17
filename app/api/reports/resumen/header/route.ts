import { NextResponse } from "next/server";

import { getResumenHeader } from "src/features/reports/resumen/data";

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
    const header = await getResumenHeader();
    return NextResponse.json(header, {
      headers: successHeaders(),
    });
  } catch (error) {
    console.error("Error loading resumen header", error);
    return NextResponse.json(
      { error: "No pudimos cargar el encabezado del resumen." },
      {
        status: 500,
        headers: errorHeaders,
      },
    );
  }
}
