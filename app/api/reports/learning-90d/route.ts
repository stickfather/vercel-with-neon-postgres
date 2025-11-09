import { NextResponse } from "next/server";
import { getLearningPanelData } from "@/src/features/reports/learning-90d/data";

export const revalidate = 300; // 5 minutes cache

const successHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
} as const;

const errorHeaders = {
  "Cache-Control": "no-store",
} as const;

export async function GET() {
  try {
    const data = await getLearningPanelData();
    return NextResponse.json(data, { headers: successHeaders });
  } catch (error) {
    console.error("Error loading learning panel data", error);
    return NextResponse.json(
      { error: "No pudimos cargar los datos de aprendizaje." },
      { status: 500, headers: errorHeaders },
    );
  }
}
