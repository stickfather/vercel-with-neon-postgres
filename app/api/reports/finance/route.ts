import { NextResponse } from "next/server";
import {
  getOutstandingStudents,
  getOutstandingBalance,
  getAgingBuckets,
  getCollections30d,
  getCollections30dSeries,
  getDueSoonSummary,
  getDueSoonSeries,
  getStudentsWithDebts,
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
    // Fetch all data in parallel
    const [
      outstandingStudents,
      outstandingBalance,
      agingBuckets,
      collections30d,
      collections30dSeries,
      dueSoonSummary,
      dueSoonSeries,
      studentsWithDebts,
    ] = await Promise.all([
      getOutstandingStudents(),
      getOutstandingBalance(),
      getAgingBuckets(),
      getCollections30d(),
      getCollections30dSeries(),
      getDueSoonSummary(),
      getDueSoonSeries(),
      getStudentsWithDebts(),
    ]);

    const data = {
      outstandingStudents,
      outstandingBalance,
      agingBuckets,
      collections30d,
      collections30dSeries,
      dueSoonSummary,
      dueSoonSeries,
      studentsWithDebts,
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
