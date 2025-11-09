import { NextResponse } from "next/server";
import {
  getPassRate90d,
  getAverageScore90d,
  getFirstAttemptData,
  computeFirstAttemptPassRate,
  getInstructiveCompliance,
  getWeeklyKpis,
  getScoreDistribution,
  getCompletedExamsForHeatmap,
  getRetakes,
  getStrugglingStudents,
  getUpcomingCount,
  getUpcomingList,
} from "@/src/features/reports/exams/data";

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
      passRate90d,
      averageScore90d,
      firstAttemptData,
      instructiveCompliance,
      weeklyKpis,
      scoreDistribution,
      completedExams,
      retakes,
      strugglingStudents,
      upcomingCount,
      upcomingList,
    ] = await Promise.all([
      getPassRate90d(),
      getAverageScore90d(),
      getFirstAttemptData(),
      getInstructiveCompliance(),
      getWeeklyKpis(),
      getScoreDistribution(),
      getCompletedExamsForHeatmap(),
      getRetakes(),
      getStrugglingStudents(),
      getUpcomingCount(),
      getUpcomingList(),
    ]);

    // Compute first-attempt pass rate
    const firstAttemptPassRate = computeFirstAttemptPassRate(firstAttemptData);

    const data = {
      passRate90d,
      averageScore90d,
      firstAttemptPassRate,
      instructiveCompliance,
      weeklyKpis,
      scoreDistribution,
      completedExams,
      retakes,
      strugglingStudents,
      upcomingCount,
      upcomingList,
    };

    return NextResponse.json(data, { headers: successHeaders });
  } catch (error) {
    console.error("Error loading exams panel data", error);
    return NextResponse.json(
      { error: "No pudimos cargar los datos de exámenes." },
      { status: 500, headers: errorHeaders },
    );
  }
}
