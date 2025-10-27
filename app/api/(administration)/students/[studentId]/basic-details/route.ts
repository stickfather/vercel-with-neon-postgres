import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server.js";

import {
  EDITABLE_STUDENT_BASIC_DETAIL_KEYS,
  getStudentBasicDetails,
  updateStudentBasicDetails,
  type StudentBasicDetailsEditablePayload,
} from "@/features/administration/data/student-profile";
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

export async function GET(
  _request: Request,
  context: any,
) {
  const params = await resolveRouteParams(context);
  const studentParam = readRouteParam(params, "studentId");
  const studentId = normalizeStudentId(studentParam ?? "");

  if (studentId == null) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const details = await getStudentBasicDetails(studentId);

    if (!details) {
      return NextResponse.json({ error: "Estudiante no encontrado." }, { status: 404 });
    }

    return NextResponse.json(details);
  } catch (error) {
    console.error("Error fetching student basic details", error);
    return NextResponse.json(
      { error: "No se pudo obtener la información del estudiante." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: any) {
  const params = await resolveRouteParams(context);
  const studentParam = readRouteParam(params, "studentId");
  const studentId = normalizeStudentId(studentParam ?? "");

  if (studentId == null) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("Error parsing student update payload", error);
    return NextResponse.json(
      { error: "No se pudo procesar la solicitud." },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const allowedKeys = new Set<string>(EDITABLE_STUDENT_BASIC_DETAIL_KEYS as string[]);
  const updatePayload: Partial<
    Record<
      keyof StudentBasicDetailsEditablePayload,
      StudentBasicDetailsEditablePayload[keyof StudentBasicDetailsEditablePayload]
    >
  > = {};

  for (const [key, value] of Object.entries(payload)) {
    if (allowedKeys.has(key)) {
      const typedKey = key as keyof StudentBasicDetailsEditablePayload;
      updatePayload[typedKey] =
        value as StudentBasicDetailsEditablePayload[keyof StudentBasicDetailsEditablePayload];
    }
  }

  if (!Object.keys(updatePayload).length) {
    return NextResponse.json(
      { error: "No se detectaron cambios para guardar." },
      { status: 400 },
    );
  }

  try {
    const typedPayload = updatePayload as StudentBasicDetailsEditablePayload;
    const updated = await updateStudentBasicDetails(studentId, typedPayload);
    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating student basic details", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar la información del estudiante.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
