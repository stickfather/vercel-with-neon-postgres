import { NextResponse } from "next/server";

import { fetchSegmentMembers } from "src/features/management/engagement/data/engagement.read";
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
  const { searchParams } = new URL(request.url);
  const primarySegment = searchParams.get("primary_segment") ?? searchParams.get("segment");

  if (!primarySegment) {
    return NextResponse.json(
      { error: "You must provide a primary_segment." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const filters = parseFilters(request);
    const rows = await fetchSegmentMembers(primarySegment, filters);
    return NextResponse.json(rows, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch engagement segment members", error);
    return NextResponse.json(
      { error: "Unable to load engagement segment members." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
