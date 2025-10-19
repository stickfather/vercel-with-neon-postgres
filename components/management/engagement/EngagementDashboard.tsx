import { EngagementDashboardClient } from "./EngagementDashboardClient";
import {
  fetchArrivalsToday,
  fetchHeatmap,
  fetchSegmentSummary,
  fetchUtilizationAverage,
  fetchUtilizationToday,
} from "src/features/management/engagement/data/engagement.read";
import type {
  ArrivalRow,
  HeatmapCell,
  SegmentSummaryRow,
  UtilizationAvgRow,
  UtilizationTodayRow,
} from "@/types/management.engagement";

export type EngagementDashboardProps = {
  initialLanguage?: "en" | "es";
};

async function loadEngagementData(): Promise<{
  utilizationToday: UtilizationTodayRow[];
  utilizationAvg: UtilizationAvgRow[];
  heatmap: HeatmapCell[];
  arrivals: ArrivalRow[];
  segments: SegmentSummaryRow[];
}> {
  try {
    const [today, avg, heatmap, arrivals, segments] = await Promise.all([
      fetchUtilizationToday(),
      fetchUtilizationAverage(),
      fetchHeatmap(),
      fetchArrivalsToday(),
      fetchSegmentSummary(),
    ]);

    return {
      utilizationToday: today,
      utilizationAvg: avg,
      heatmap,
      arrivals,
      segments,
    };
  } catch (error) {
    console.error("Failed to load engagement dashboard data", error);
    return {
      utilizationToday: [],
      utilizationAvg: [],
      heatmap: [],
      arrivals: [],
      segments: [],
    };
  }
}

export async function EngagementDashboard({ initialLanguage = "es" }: EngagementDashboardProps) {
  const { utilizationToday, utilizationAvg, heatmap, arrivals, segments } = await loadEngagementData();

  return (
    <EngagementDashboardClient
      initialLanguage={initialLanguage}
      utilization={{ today: utilizationToday, avg: utilizationAvg }}
      heatmap={heatmap}
      arrivals={arrivals}
      segments={segments}
    />
  );
}

export default EngagementDashboard;
