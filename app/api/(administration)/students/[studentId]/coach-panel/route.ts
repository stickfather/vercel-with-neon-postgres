import { NextResponse } from "next/server.js";

import { getStudentCoachPanelSummary } from "@/features/administration/data/student-profile";

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
    const summary = await getStudentCoachPanelSummary(studentId);

    if (!summary) {
      return NextResponse.json({ error: "Estudiante sin actividad." }, { status: 404 });
    }

    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("Error fetching student coach panel", error);
    return NextResponse.json(
      { error: "No se pudo obtener la información del panel del coach." },
      { status: 500 },
    );
  }
}
