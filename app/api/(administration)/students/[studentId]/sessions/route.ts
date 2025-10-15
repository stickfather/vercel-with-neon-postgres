import { NextResponse } from "next/server.js";

import { listStudentRecentSessions } from "@/features/administration/data/student-profile";

export const dynamic = "force-dynamic";

function normalizeStudentId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLimit(value: string | null, fallback = 10): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
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
  const limit = normalizeLimit(searchParams.get("limit"));

  try {
    const sessions = await listStudentRecentSessions(studentId, limit);
    return NextResponse.json(
      { sessions },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching student sessions", error);
    return NextResponse.json(
      { error: "No se pudo obtener la actividad reciente." },
      { status: 500 },
    );
  }
}
