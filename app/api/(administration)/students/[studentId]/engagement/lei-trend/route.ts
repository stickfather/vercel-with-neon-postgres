import { NextResponse } from "next/server.js";

import { listStudentLeiTrend } from "@/features/administration/data/student-profile";

export const dynamic = "force-dynamic";

function normalizeStudentId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDays(value: string | null): number {
  if (!value) {
    return 30;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 30;
  }
  return Math.max(1, Math.min(180, Math.trunc(parsed)));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const resolvedParams = await params;
  const studentId = normalizeStudentId(resolvedParams.studentId);

  if (studentId == null) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const days = normalizeDays(searchParams.get("days"));

  try {
    const trend = await listStudentLeiTrend(studentId, days);
    return NextResponse.json(
      { trend },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching LEI trend", error);
    return NextResponse.json(
      { error: "No se pudo obtener la tendencia de eficiencia." },
      { status: 500 },
    );
  }
}
