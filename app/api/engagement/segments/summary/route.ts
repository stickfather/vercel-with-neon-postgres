import { NextResponse } from "next/server";

import { fetchSegmentSummary } from "src/features/management/engagement/data/engagement.read";
import type { EngagementFilters } from "@/types/management.engagement";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function parseFilters(request: Request): EngagementFilters {
  const { searchParams } = new URL(request.url);
  return {
    level: searchParams.get("level"),
    coach: searchParams.get("coach"),
    plan: searchParams.get("plan"),
    campus: searchParams.get("campus"),
    date: searchParams.get("date"),
  };
}

export async function GET(request: Request) {
  try {
    const filters = parseFilters(request);
    const rows = await fetchSegmentSummary(filters);
    return NextResponse.json(rows, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch engagement segment summary", error);
    return NextResponse.json(
      { error: "Unable to load engagement segment summary." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
