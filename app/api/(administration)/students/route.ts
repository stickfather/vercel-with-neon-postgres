import { NextResponse } from "next/server";

import { createStudentManagementEntry } from "@/features/administration/data/students";

export async function POST(request: Request) {
  try {
    const { fullName, plannedLevelMin, plannedLevelMax } = await request
      .json()
      .catch(() => ({}));

    if (
      typeof fullName !== "string" ||
      typeof plannedLevelMin !== "string" ||
      typeof plannedLevelMax !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Debes indicar el nombre y los niveles planificados mínimo y máximo del estudiante.",
        },
        { status: 400 },
      );
    }

    const entry = await createStudentManagementEntry({
      fullName,
      plannedLevelMin,
      plannedLevelMax,
    });

    return NextResponse.json({ student: entry });
  } catch (error) {
    console.error("No se pudo crear el estudiante", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear el estudiante solicitado.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
