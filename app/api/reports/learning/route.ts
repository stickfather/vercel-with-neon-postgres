import { NextResponse } from "next/server";

import type { LearningReport } from "@/types/reports.learning";

export const dynamic = "force-dynamic";

function createFallbackReport(): LearningReport {
  return {
    last_refreshed_at: new Date().toISOString(),
    lei_trend: [],
    lei_trend_pct_change_30d: 0,
    transitions_30d_total: 0,
    transitions_30d_series: [],
    days_since_progress: {
      global_median: 0,
      by_level: [],
    },
    at_risk: [],
    speed_buckets: {
      fast: [],
      typical: [],
      slow: [],
      proportions: {
        fast_pct: 0,
        typical_pct: 0,
        slow_pct: 0,
      },
    },
    velocity_per_level: [],
    stuck_heatmap: [],
    days_in_level: [],
    duration_variance: [],
  };
}

export async function GET() {
  const payload = {
    ...createFallbackReport(),
    fallback: true,
    message:
      "Learning report temporarily using fallback data while analytics are being rewired.",
  };

  return NextResponse.json(payload);
}
