import { NextResponse } from "next/server";
import { getOverdueItems } from "@/src/features/reports/finance/data";

export const revalidate = 300; // 5 minutes cache
export const dynamic = "force-dynamic";

const successHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
} as const;

const errorHeaders = {
  "Cache-Control": "no-store",
} as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get("studentId");

    if (!studentIdParam) {
      return NextResponse.json(
        { error: "studentId query parameter is required" },
        { status: 400, headers: errorHeaders },
      );
    }

    const studentId = parseInt(studentIdParam, 10);
    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: "studentId must be a valid number" },
        { status: 400, headers: errorHeaders },
      );
    }

    const overdueItems = await getOverdueItems(studentId);

    return NextResponse.json(
      { overdueItems },
      { headers: successHeaders },
    );
  } catch (error) {
    console.error("Error loading student debt details", error);
    return NextResponse.json(
      { error: "No pudimos cargar los detalles de la deuda del estudiante." },
      { status: 500, headers: errorHeaders },
    );
  }
}
