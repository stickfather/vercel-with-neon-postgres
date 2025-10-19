import { NextResponse } from "next/server";

import { fetchHourTrend } from "src/features/management/engagement/data/engagement.read";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function parseHour(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hour: string }> },
) {
  const resolved = await params;
  const hour = parseHour(resolved.hour);
  if (hour === null) {
    return NextResponse.json(
      { error: "Invalid hour." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const rows = await fetchHourTrend(hour);
    return NextResponse.json(rows, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch engagement hour trend", error);
    return NextResponse.json(
      { error: "Unable to load engagement hour trend." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
