import { NextResponse } from "next/server";

import { getEngagementReport } from "@/src/features/reports/engagement/data";
import type { EngagementReportResponse } from "@/types/reports.engagement";

export const revalidate = 300;
export const dynamic = "force-dynamic";

function fallbackResponse(reason: string): EngagementReportResponse {
  return {
    lastRefreshedAt: new Date().toISOString(),
    fallback: true,
    fallbackReasons: [reason],
    activeSummary: {
      last7d: { count: 0, changePct: null },
      last14d: { count: 0, changePct: null },
      last30d: { count: 0, changePct: null },
      last180d: { count: 0, changePct: null },
    },
    inactivityTables: {
      inactive7d: [],
      inactive14d: [],
      dormant30d: [],
      longTerm180d: [],
    },
    avgDaysBetweenVisits: { value: null },
    declineIndex: [],
    hourlyHeatmap: {},
    zeroAttendance: [],
    frequencyScore: { sessionsPerWeek: null, targetSessionsPerWeek: null, sparkline: [] },
  };
}

export async function GET() {
  try {
    const data = await getEngagementReport();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error cargando el reporte de engagement", error);
    return NextResponse.json(fallbackResponse("Error inesperado en el reporte"));
  }
}
