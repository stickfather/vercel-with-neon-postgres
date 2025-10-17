import { NextResponse } from "next/server";

import { getLevelStates } from "src/features/reports/resumen/data";

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
    const states = await getLevelStates();
    return NextResponse.json(states, {
      headers: successHeaders(),
    });
  } catch (error) {
    console.error("Error loading resumen level states", error);
    return NextResponse.json(
      { error: "No pudimos cargar los estados por nivel." },
      {
        status: 500,
        headers: errorHeaders,
      },
    );
  }
}
