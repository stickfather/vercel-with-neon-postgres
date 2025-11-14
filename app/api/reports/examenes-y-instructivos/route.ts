import { NextResponse } from "next/server";
import {
  buildExamenesInstructivosReport,
  createFallbackExamenesInstructivosReport,
} from "@/src/features/reports/examenes-instructivos/report";

export const revalidate = 300;

const successHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
} as const;

const errorHeaders = {
  "Cache-Control": "no-store",
} as const;

export async function GET() {
  try {
    const report = await buildExamenesInstructivosReport();
    return NextResponse.json(report, { headers: successHeaders });
  } catch (error) {
    console.error("Failed to load Examenes y Instructivos report", error);
    return NextResponse.json(createFallbackExamenesInstructivosReport(), {
      status: 500,
      headers: errorHeaders,
    });
  }
}
