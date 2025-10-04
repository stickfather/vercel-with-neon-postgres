import { NextResponse } from "next/server";
import { createPaymentScheduleEntry } from "@/features/administration/data/student-profile";

type StudentParams = Promise<{ studentId: string }>;

export async function POST(
  request: Request,
  { params }: { params: StudentParams }
) {
  try {
    const { studentId: studentIdStr } = await params; // 👈 await params
    const studentId = Number(studentIdStr);

    if (!Number.isFinite(studentId)) {
      return NextResponse.json(
        { error: "Identificador inválido." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const dueDate = typeof body?.dueDate === "string" ? body.dueDate : null;
    const amountValue = body?.amount;
    const amount =
      amountValue == null
        ? null
        : typeof amountValue === "number"
          ? amountValue
          : Number(amountValue);

    if (!dueDate) {
      return NextResponse.json(
        { error: "La fecha de vencimiento es obligatoria." },
        { status: 400 },
      );
    }

    if (amount == null || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser un número mayor a cero." },
        { status: 400 },
      );
    }

    const isPaid = Boolean(body?.isPaid);
    const receivedDate = typeof body?.receivedDate === "string" ? body.receivedDate : null;
    const externalRef = typeof body?.externalRef === "string" ? body.externalRef.trim() || null : null;
    const note = typeof body?.note === "string" ? body.note.trim() || null : null;

    const entry = await createPaymentScheduleEntry(studentId, {
      dueDate,
      amount,
      isPaid,
      receivedDate,
      externalRef,
      note,
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
