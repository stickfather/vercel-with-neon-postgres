import { NextResponse } from "next/server";
import { getPersonnelPanelData } from "@/src/features/reports/personnel/data";

export const revalidate = 300; // 5 minutes cache

const successHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
} as const;

const errorHeaders = {
  "Cache-Control": "no-store",
} as const;

export async function GET() {
  try {
    const data = await getPersonnelPanelData();
    return NextResponse.json(data, { headers: successHeaders });
  } catch (error) {
    console.error("Error loading personnel panel data", error);
    return NextResponse.json(
      { error: "We couldn't load the personnel data." },
      { status: 500, headers: errorHeaders },
    );
  }
}
