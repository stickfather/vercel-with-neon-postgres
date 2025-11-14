import { NextRequest, NextResponse } from "next/server";
import {
  getStuckStudentsDrilldown,
  getDurationSessionsDrilldown,
} from "@/src/features/reports/learning-90d/data";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const successHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
} as const;

const errorHeaders = {
  "Cache-Control": "no-store",
} as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const level = searchParams.get("level");
    const lessonName = searchParams.get("lessonName");

    if (!type || !level || !lessonName) {
      return NextResponse.json(
        { error: "Missing required parameters: type, level, lessonName" },
        { status: 400, headers: errorHeaders },
      );
    }

    let data;
    if (type === "stuck") {
      data = await getStuckStudentsDrilldown(level, lessonName);
    } else if (type === "duration") {
      data = await getDurationSessionsDrilldown(level, lessonName);
    } else {
      return NextResponse.json(
        { error: "Invalid type parameter. Must be 'stuck' or 'duration'." },
        { status: 400, headers: errorHeaders },
      );
    }

    return NextResponse.json({ data }, { headers: successHeaders });
  } catch (error) {
    console.error("Error loading drill-down data", error);
    return NextResponse.json(
      { error: "No pudimos cargar los datos de detalle." },
      { status: 500, headers: errorHeaders },
    );
  }
}
