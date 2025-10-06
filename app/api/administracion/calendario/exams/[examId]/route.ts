import { NextResponse } from "next/server";

import {
  deleteExam,
  updateExam,
  type UpdateExamPayload,
} from "@/features/administration/data/calendar";

type RequestPayload = UpdateExamPayload;

function parseExamId(params: { examId: string }): number | null {
  const parsed = Number(params.examId);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export async function PATCH(request: Request, { params }: any) {
  const examId = parseExamId(params);
  if (!examId) {
    return NextResponse.json(
      { error: "Identificador de examen inválido." },
      { status: 400 },
    );
  }

  let payload: RequestPayload;
  try {
    payload = (await request.json()) as RequestPayload;
  } catch (error) {
    console.error("No se pudo leer el cuerpo de actualización de examen", error);
    return NextResponse.json(
      { error: "Formato de solicitud inválido." },
      { status: 400 },
    );
  }

  try {
    await updateExam(examId, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("No se pudo actualizar el examen", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el examen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: any) {
  const examId = parseExamId(params);
  if (!examId) {
    return NextResponse.json(
      { error: "Identificador de examen inválido." },
      { status: 400 },
    );
  }

  try {
    await deleteExam(examId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("No se pudo eliminar el examen", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo eliminar el examen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
