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

    const exam = await createStudentExam(studentId, {
      examDate: body?.examDate ?? null,
      examType: body?.examType ?? null,
      status: body?.status ?? null,
      location: body?.location ?? null,
      result: body?.result ?? null,
      notes: body?.notes ?? null,
    });

    return NextResponse.json(exam);
  } catch (error) {
    console.error("Error creating student exam", error);
    const message =
      error instanceof Error ? error.message : "No se pudo crear el examen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
