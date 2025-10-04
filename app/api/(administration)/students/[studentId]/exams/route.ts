import { NextResponse } from "next/server";
import { createStudentExam } from "@/features/administration/data/student-profile";

type StudentParams = Promise<{ studentId: string }>;

export async function POST(
  request: Request,
  { params }: { params: StudentParams }
) {
  try {
    const { studentId: studentIdStr } = await params; // 👈 await params
    const studentId = Number(studentIdStr);
    if (!Number.isFinite(studentId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = await request.json();

    const timeScheduled =
      typeof body?.timeScheduled === "string" && body.timeScheduled.trim().length
        ? body.timeScheduled
        : null;

    if (!timeScheduled) {
      return NextResponse.json(
        { error: "La fecha y hora programada es obligatoria." },
        { status: 400 },
      );
    }

    const scoreValue = body?.score;
    const score =
      scoreValue == null || scoreValue === ""
        ? null
        : typeof scoreValue === "number"
          ? scoreValue
          : Number(scoreValue);

    if (score != null && !Number.isFinite(score)) {
      return NextResponse.json(
        { error: "La calificación debe ser numérica." },
        { status: 400 },
      );
    }

    const status = typeof body?.status === "string" ? body.status : null;
    const passed = Boolean(body?.passed);
    const notes = typeof body?.notes === "string" ? body.notes.trim() || null : null;

    const exam = await createStudentExam(studentId, {
      timeScheduled,
      status,
      score,
      passed,
      notes,
    });

    return NextResponse.json(exam);
  } catch (error) {
    console.error("Error creating student exam", error);
    const message =
      error instanceof Error ? error.message : "No se pudo crear el examen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
