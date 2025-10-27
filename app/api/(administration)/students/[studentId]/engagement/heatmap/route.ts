import { NextResponse } from "next/server.js";

import { listStudentEngagementHeatmap } from "@/features/administration/data/student-profile";
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

export async function GET(request: Request, context: any) {
  const params = await resolveRouteParams(context);
  const studentParam = readRouteParam(params, "studentId");
  const studentId = normalizeStudentId(studentParam ?? "");

  if (studentId == null) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const days = normalizeDays(searchParams.get("days"));

  try {
    const heatmap = await listStudentEngagementHeatmap(studentId, days);
    return NextResponse.json(
      { heatmap },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching engagement heatmap", error);
    return NextResponse.json(
      { error: "No se pudo obtener el mapa de calor." },
      { status: 500 },
    );
  }
}
