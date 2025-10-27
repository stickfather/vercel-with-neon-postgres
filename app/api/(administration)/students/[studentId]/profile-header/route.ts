import { NextResponse } from "next/server.js";

import { getStudentCoachPanelProfileHeader } from "@/features/administration/data/student-profile";
import {
  readRouteParam,
  resolveRouteParams,
  type RouteParamsContext,
} from "@/lib/api/route-params";

export const dynamic = "force-dynamic";

function normalizeStudentId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request, context: any) {
  const params = await resolveRouteParams(context);
  const studentParam = readRouteParam(params, "studentId");
  const studentId = normalizeStudentId(studentParam ?? "");

  if (studentId == null) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const overview = await getStudentCoachPanelProfileHeader(studentId);

    if (!overview) {
      return NextResponse.json({ error: "Estudiante sin actividad." }, { status: 404 });
    }

    return NextResponse.json(overview, {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("Error fetching student coach panel profile header", error);
    return NextResponse.json(
      { error: "No se pudo obtener la información del encabezado." },
      { status: 500 },
    );
  }
}
