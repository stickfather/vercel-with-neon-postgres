import { NextResponse } from "next/server.js";

import { getStudentCoachPlanPosition } from "@/features/administration/data/student-profile";

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
    const currentPosition = await getStudentCoachPlanPosition(studentId);
    return NextResponse.json(
      { currentPosition },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching student plan position", error);
    return NextResponse.json(
      { error: "No se pudo obtener la posición actual." },
      { status: 500 },
    );
  }
}
