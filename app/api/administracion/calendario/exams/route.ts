import { NextResponse } from "next/server";

import { createExam } from "@/features/administration/data/calendar";

type RequestPayload = {
  studentId?: number;
  timeScheduled?: string;
  status?: string | null;
  score?: number | null;
  passed?: boolean | null;
  notes?: string | null;
};

export async function POST(request: Request) {
  let payload: RequestPayload;
  try {
    payload = (await request.json()) as RequestPayload;
  } catch (error) {
    console.error("No se pudo leer el cuerpo de la solicitud de examen", error);
    return NextResponse.json(
      { error: "Formato de solicitud inválido." },
      { status: 400 },
    );
  }

  try {
    const result = await createExam({
      studentId: Number(payload.studentId),
      timeScheduled: payload.timeScheduled ?? "",
      status: payload.status ?? undefined,
      score:
        payload.score === undefined || payload.score === null
          ? null
          : Number(payload.score),
      passed:
        payload.passed === undefined ? null : Boolean(payload.passed),
      notes: payload.notes ?? null,
    });

    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("No se pudo crear el examen", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo registrar el examen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
