import { NextResponse } from "next/server";

import { buildCoachPanelReport } from "@/src/features/reports/coach-panel/report";

export const dynamic = "force-dynamic";

function parseStudentId(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentParam = searchParams.get("studentId");
  const studentId = parseStudentId(studentParam);

  if (studentId == null) {
    return NextResponse.json(
      { error: "Parámetro studentId inválido." },
      { status: 400 },
    );
  }

  const report = await buildCoachPanelReport(studentId);
  return NextResponse.json(report, {
    headers: {
      "Cache-Control": "private, max-age=60",
    },
  });
}
