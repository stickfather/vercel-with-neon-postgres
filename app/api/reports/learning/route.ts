import { NextResponse } from "next/server";

import { getLearningReport } from "@/src/features/reports/learning/data";

export const revalidate = 600; // 10 min

export async function GET() {
  const data = await getLearningReport();
  return NextResponse.json(data);
}
