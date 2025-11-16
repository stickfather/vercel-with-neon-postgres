import { NextResponse } from "next/server";
import {
  getCollections30d,
  getCollections30dSeries,
  getOutstandingStudents,
  getRecovery30d,
  getUpcomingDue,
} from "@/src/features/reports/finance/data";

export const revalidate = 300; // 5 minutes cache

const successHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
} as const;

const errorHeaders = {
  "Cache-Control": "no-store",
} as const;

export async function GET() {
  try {
    // Fetch all data in parallel from final.* views
    const [
      collections30d,
      collections30dSeries,
      outstandingStudents,
      recovery30d,
      upcomingDue,
    ] = await Promise.all([
      getCollections30d(),
      getCollections30dSeries(),
      getOutstandingStudents(),
      getRecovery30d(),
      getUpcomingDue(),
    ]);

    const data = {
      collections30d,
      collections30dSeries,
      outstandingStudents,
      recovery30d,
      upcomingDue,
    };

    return NextResponse.json(data, { headers: successHeaders });
  } catch (error) {
    console.error("Error loading finance panel data", error);
    return NextResponse.json(
      { error: "No pudimos cargar los datos financieros." },
      { status: 500, headers: errorHeaders },
    );
  }
}
