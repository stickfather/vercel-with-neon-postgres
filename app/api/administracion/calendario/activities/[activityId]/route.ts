import { NextResponse } from "next/server";

import {
  deleteActivity,
  updateActivity,
  type UpdateActivityPayload,
} from "@/features/administration/data/calendar";

function parseActivityId(params: { activityId: string }): number | null {
  const parsed = Number(params.activityId);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export async function PATCH(request: Request, { params }: any) {
  const activityId = parseActivityId(params);
  if (!activityId) {
    return NextResponse.json(
      { error: "Identificador de actividad inválido." },
      { status: 400 },
    );
  }

  let payload: UpdateActivityPayload;
  try {
    payload = (await request.json()) as UpdateActivityPayload;
  } catch (error) {
    console.error("No se pudo leer el cuerpo de actualización de la actividad", error);
    return NextResponse.json(
      { error: "Formato de solicitud inválido." },
      { status: 400 },
    );
  }

  try {
    await updateActivity(activityId, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("No se pudo actualizar la actividad", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar la actividad.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: any) {
  const activityId = parseActivityId(params);
  if (!activityId) {
    return NextResponse.json(
      { error: "Identificador de actividad inválido." },
      { status: 400 },
    );
  }

  try {
    await deleteActivity(activityId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("No se pudo eliminar la actividad", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo eliminar la actividad.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
