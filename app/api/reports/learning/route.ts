import { NextResponse } from "next/server";

import { buildLearningReport } from "@/src/features/reports/learning/final-report";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await buildLearningReport();
  return NextResponse.json(payload);
}
