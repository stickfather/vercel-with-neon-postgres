import { NextResponse } from "next/server";
import { deleteStudentExam, updateStudentExam } from "@/features/administration/data/student-profile";

type ExamParams = Promise<{ studentId: string; examId: string }>;

export async function PUT(
  request: Request,
  { params }: { params: ExamParams }
) {
  try {
    const { examId: examIdStr } = await params;         // 👈 await params
    const examId = Number(examIdStr);
    if (!Number.isFinite(examId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = await request.json();
    const timeScheduled =
      typeof body?.timeScheduled === "string" && body.timeScheduled.trim().length
        ? body.timeScheduled
        : null;
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

    await updateStudentExam(examId, {
      timeScheduled,
      status,
      score,
      passed,
      notes,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating student exam", error);
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar el examen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: ExamParams }
) {
  try {
    const { examId: examIdStr } = await params;         // 👈 await params
    const examId = Number(examIdStr);
    if (!Number.isFinite(examId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    await deleteStudentExam(examId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting student exam", error);
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar el examen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
