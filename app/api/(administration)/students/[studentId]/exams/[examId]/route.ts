import { NextResponse } from "next/server";
import { deleteStudentExam, updateStudentExam } from "@/features/administration/data/student-profile";

export async function PUT(
  request: Request,
  { params }: { params: { studentId: string; examId: string } },
) {
  try {
    const examId = Number(params.examId);
    if (!Number.isFinite(examId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = await request.json();

    await updateStudentExam(examId, {
      examDate: body?.examDate ?? null,
      examType: body?.examType ?? null,
      status: body?.status ?? null,
      location: body?.location ?? null,
      result: body?.result ?? null,
      notes: body?.notes ?? null,
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
  { params }: { params: { studentId: string; examId: string } },
) {
  try {
    const examId = Number(params.examId);
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
