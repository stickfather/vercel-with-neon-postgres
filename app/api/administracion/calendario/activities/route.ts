import { NextResponse } from "next/server.js";

import { createActivity } from "@/features/administration/data/calendar";

type RequestPayload = {
  title?: string;
  description?: string | null;
  startTime?: string;
  kind?: string | null;
};

export async function POST(request: Request) {
  let payload: RequestPayload;
  try {
    payload = (await request.json()) as RequestPayload;
  } catch (error) {
    console.error("No se pudo leer el cuerpo de la actividad", error);
    return NextResponse.json(
      { error: "Formato de solicitud inválido." },
      { status: 400 },
    );
  }

  try {
    const result = await createActivity({
      title: payload.title ?? "",
      description: payload.description ?? null,
      startTime: payload.startTime ?? "",
      kind: payload.kind ?? undefined,
    });
    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("No se pudo crear la actividad", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo registrar la actividad.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
