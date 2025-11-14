import { NextResponse } from "next/server";

import { getEngagementReport as getNewEngagementReport } from "@/src/features/reports/engagement/data";
import type { EngagementReport as LegacyEngagementReport } from "@/types/management-reports";
import type { EngagementReportResponse } from "@/types/reports.engagement";
import { hasAccess } from "src/features/management-reports/data/access";

export const revalidate = 120;
export const dynamic = "force-dynamic";

const successHeaders = {
  "Cache-Control": "public, s-maxage=120, stale-while-revalidate=30",
} as const;

const errorHeaders = {
  "Cache-Control": "no-store",
} as const;

type HourBucketKey = "Morning" | "Afternoon" | "Evening";

function adaptHourSplit(data: EngagementReportResponse): LegacyEngagementReport["hourSplit"] {
  const totals: Record<HourBucketKey, number> = {
    Morning: 0,
    Afternoon: 0,
    Evening: 0,
  };

  Object.values(data.hourlyHeatmap ?? {}).forEach((day) => {
    day.forEach((cell) => {
      const hour = cell.hour24;
      if (!Number.isFinite(hour)) return;
      const bucket: HourBucketKey = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
      totals[bucket] += cell.totalMinutes90d ?? 0;
    });
  });

  return [
    {
      hour: "08:00-20:00",
      morning: totals.Morning,
      afternoon: totals.Afternoon,
      evening: totals.Evening,
    },
  ];
}

function adaptEngagementData(newData: EngagementReportResponse): LegacyEngagementReport {
  return {
    active: [
      { range: "7 días", count: newData.activeSummary.last7d.count },
      { range: "14 días", count: newData.activeSummary.last14d.count },
      { range: "30 días", count: newData.activeSummary.last30d.count },
      { range: "180 días", count: newData.activeSummary.last180d.count },
    ],
    inactive: [
      { range: "7+ días", count: newData.inactivityTables.inactive7d.length },
      { range: "14+ días", count: newData.inactivityTables.inactive14d.length },
      { range: "30+ días", count: newData.inactivityTables.dormant30d.length },
      { range: "180+ días", count: newData.inactivityTables.longTerm180d.length },
    ],
    roster: [],
    visitPace: [
      { label: "Promedio días entre visitas", value: newData.avgDaysBetweenVisits.value },
      { label: "Sesiones por semana", value: newData.frequencyScore.sessionsPerWeek },
    ],
    declineIndex: newData.declineIndex.map((point) => ({
      label: point.weekStart,
      value: point.declineIndex,
    })),
    hourSplit: adaptHourSplit(newData),
  };
}

export async function GET() {
  const allowed = await hasAccess("staff");
  if (!allowed) {
    return NextResponse.json(
      { error: "Necesitas desbloquear el acceso del personal para continuar." },
      { status: 401, headers: errorHeaders },
    );
  }

  try {
    const data = await getNewEngagementReport();
    return NextResponse.json(adaptEngagementData(data), { headers: successHeaders });
  } catch (error) {
    console.error("Error cargando reportes de engagement", error);
    return NextResponse.json(
      { error: "No pudimos cargar los indicadores de engagement." },
      { status: 500, headers: errorHeaders },
    );
  }
}
