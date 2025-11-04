import { NextResponse } from "next/server";

import { getEngagementReport } from "@/src/features/reports/engagement/data";

export const revalidate = 600; // 10 min
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getEngagementReport();
  return NextResponse.json(data);
}
