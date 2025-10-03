import { NextResponse } from "next/server";
import { createPaymentScheduleEntry } from "@/features/administration/data/student-profile";

export async function POST(
  request: Request,
  { params }: { params: { studentId: string } },
) {
  try {
    const studentId = Number(params.studentId);
    if (!Number.isFinite(studentId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = await request.json();

    const entry = await createPaymentScheduleEntry(studentId, {
      dueDate: body?.dueDate ?? null,
      amount: body?.amount ?? null,
      status: body?.status ?? null,
      notes: body?.notes ?? null,
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error creating payment schedule entry", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear el registro de pago.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
