import { NextResponse } from "next/server";
import { updateStudentBasicField } from "@/features/administration/data/student-profile";

export async function PATCH(
  request: Request,
  { params }: { params: { studentId: string } },
) {
  try {
    const studentId = Number(params.studentId);
    if (!Number.isFinite(studentId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const { field, value } = await request.json();

    if (!field || typeof field !== "string") {
      return NextResponse.json({ error: "Falta el campo a actualizar." }, { status: 400 });
    }

    await updateStudentBasicField(studentId, field, value ?? null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating student basic field", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar la información del estudiante.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
