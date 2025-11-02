import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { deleteStudentAttendanceEntry } from "@/features/administration/data/student-profile";
import {
  readRouteParam,
  resolveRouteParams,
  type RouteParamsContext,
} from "@/lib/api/route-params";

export const dynamic = "force-dynamic";

function normalizeId(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export async function DELETE(_request: Request, context: RouteParamsContext) {
  try {
    const params = await resolveRouteParams(context);
    const studentParam = readRouteParam(params, "studentId");
    const attendanceParam = readRouteParam(params, "attendanceId");

    const studentId = normalizeId(studentParam ?? null);
    const attendanceId = normalizeId(attendanceParam ?? null);

    if (studentId == null || attendanceId == null) {
      return NextResponse.json(
        { error: "Identificador inválido." },
        { status: 400 },
      );
    }

    const result = await deleteStudentAttendanceEntry({
      studentId,
      attendanceId,
    });

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error deleting student attendance", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo eliminar el registro de asistencia.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
