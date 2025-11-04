import { NextResponse } from "next/server";

import { getEngagementReport as getNewEngagementReport } from "@/src/features/reports/engagement/data";
import { hasAccess } from "src/features/management-reports/data/access";
import type { EngagementReport } from "@/types/management-reports";

export const revalidate = 120;

const successHeaders = {
  "Cache-Control": "public, s-maxage=120, stale-while-revalidate=30",
} as const;

const errorHeaders = {
  "Cache-Control": "no-store",
} as const;

// Adapter to convert new engagement data format to old dashboard format
async function adaptEngagementData(): Promise<EngagementReport> {
  const newData = await getNewEngagementReport();
  
  // Transform active counts (7d, 14d, 30d, 180d) to old format
  const active = [
    { range: "7 días", count: newData.active_counts.active_7d },
    { range: "14 días", count: newData.active_counts.active_14d },
    { range: "30 días", count: newData.active_counts.active_30d },
    { range: "180 días", count: newData.active_counts.active_180d },
  ];
  
  // Transform inactive counts to old format
  const inactive = [
    { range: "7+ días", count: newData.inactive_counts.inactive_7d_count },
    { range: "14+ días", count: newData.inactive_counts.inactive_14d_count },
    { range: "30+ días", count: newData.inactive_counts.dormant_30d_count },
    { range: "180+ días", count: newData.inactive_counts.inactive_180d_count },
  ];
  
  // Transform avg days between visits to old format
  const visitPace = [
    { label: "Global", value: newData.avg_between_visits_global },
    ...newData.avg_between_visits_by_level.map(row => ({
      label: row.level ?? "N/A",
      value: row.avg_days_between_visits,
    })),
  ];
  
  // Create decline index from WoW data (convert to percentage points)
  const declineIndex = [
    { 
      label: "Semana actual", 
      value: newData.wow_index.active_students_wow_change !== null 
        ? newData.wow_index.active_students_wow_change * 100 
        : null 
    },
  ];
  
  // Transform hour split to old format
  const hourSplit = [];
  const morningData = newData.hour_split.find(h => h.daypart === 'morning_08_12');
  const afternoonData = newData.hour_split.find(h => h.daypart === 'afternoon_12_17');
  const eveningData = newData.hour_split.find(h => h.daypart === 'evening_17_20');
  
  if (morningData || afternoonData || eveningData) {
    hourSplit.push({
      hour: "08-20",
      morning: morningData?.total_minutes ?? 0,
      afternoon: afternoonData?.total_minutes ?? 0,
      evening: eveningData?.total_minutes ?? 0,
    });
  }
  
  // Roster is not available in new format, return empty array
  const roster: EngagementReport['roster'] = [];
  
  return { active, inactive, roster, visitPace, declineIndex, hourSplit };
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
    const data = await adaptEngagementData();
    return NextResponse.json(data, { headers: successHeaders });
  } catch (error) {
    console.error("Error cargando reportes de engagement", error);
    return NextResponse.json(
      { error: "No pudimos cargar los indicadores de engagement." },
      { status: 500, headers: errorHeaders },
    );
  }
}
