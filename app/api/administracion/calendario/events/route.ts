import { NextResponse } from "next/server";

import {
  listCalendarEvents,
  type CalendarKind,
} from "@/features/administration/data/calendar";

function parseKind(value: string | null): CalendarKind | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "exam" || normalized === "examen") return "exam";
  if (normalized === "activity" || normalized === "actividad") return "activity";
  return undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const kind = parseKind(searchParams.get("kind"));
  const status = searchParams.get("status");
  const studentIdParam = searchParams.get("studentId");

  if (!start || !end) {
    return NextResponse.json(
      {
        error: "Debes proporcionar un rango de fechas válido.",
      },
      { status: 400 },
    );
  }

  let studentId: number | undefined;
  if (studentIdParam) {
    const parsed = Number(studentIdParam);
    if (!Number.isFinite(parsed)) {
      return NextResponse.json(
        { error: "El estudiante proporcionado no es válido." },
        { status: 400 },
      );
    }
    studentId = parsed;
  }

  try {
    const events = await listCalendarEvents({
      start,
      end,
      kind,
      status,
      studentId: studentId ?? null,
    });
    return NextResponse.json({ events });
  } catch (error) {
    console.error("No se pudieron cargar los eventos del calendario", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo consultar el calendario.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
