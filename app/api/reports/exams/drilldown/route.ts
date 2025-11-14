import { NextRequest, NextResponse } from "next/server";
import { getDrillDownExams } from "@/src/features/reports/exams/data";

export const dynamic = "force-dynamic";
export const revalidate = 180; // 3 minutes cache

const successHeaders = {
  "Cache-Control": "public, s-maxage=180, stale-while-revalidate=30",
} as const;

const errorHeaders = {
  "Cache-Control": "no-store",
} as const;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const weekStart = searchParams.get("weekStart");
    const level = searchParams.get("level");
    const examType = searchParams.get("examType");

    const exams = await getDrillDownExams(weekStart, level, examType);

    return NextResponse.json({ exams }, { headers: successHeaders });
  } catch (error) {
    console.error("Error loading drill-down exams", error);
    return NextResponse.json(
      { error: "No pudimos cargar los detalles de exámenes." },
      { status: 500, headers: errorHeaders },
    );
  }
}
