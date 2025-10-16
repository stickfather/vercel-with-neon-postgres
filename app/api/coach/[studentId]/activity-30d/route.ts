import { NextResponse } from "next/server.js";

import { getStudentActivity30dSummary } from "@/features/administration/data/student-profile";

export const dynamic = "force-dynamic";

function normalizeStudentId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const resolvedParams = await params;
  const studentId = normalizeStudentId(resolvedParams.studentId);

  if (studentId == null) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const payload = await getStudentActivity30dSummary(studentId);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("Error fetching student 30-day activity summary", error);
    return NextResponse.json(
      { error: "No se pudo obtener el resumen de actividad." },
      { status: 500 },
    );
  }
}
