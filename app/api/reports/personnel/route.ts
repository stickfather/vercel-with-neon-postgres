import { NextResponse } from "next/server";

import { getPersonnelReport } from "@/src/features/reports/personnel/data";
import { createEmptyPersonnelReport } from "@/types/personnel";

export const revalidate = 300; // 5 minutes cache

const successHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
} as const;

const errorHeaders = {
  "Cache-Control": "no-store",
} as const;

export async function GET() {
  try {
    const data = await getPersonnelReport();
    return NextResponse.json(data, { headers: successHeaders });
  } catch (error) {
    console.error("Error loading personnel report", error);
    return NextResponse.json(createEmptyPersonnelReport(), {
      headers: errorHeaders,
      status: 200,
    });
  }
}
