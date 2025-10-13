import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server.js";

import { createPaymentScheduleEntry } from "@/features/administration/data/student-profile";

export const dynamic = "force-dynamic";

function normalizeStudentId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const resolvedParams = await params;
    const studentId = normalizeStudentId(resolvedParams.studentId);

    if (studentId == null) {
      return NextResponse.json(
        { error: "Identificador inválido." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }
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
    const note = typeof body?.note === "string" ? body.note.trim() || null : null;

    const entry = await createPaymentScheduleEntry(studentId, {
      dueDate,
      amount,
      isPaid,
      receivedDate,
      note,
    });

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);
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
