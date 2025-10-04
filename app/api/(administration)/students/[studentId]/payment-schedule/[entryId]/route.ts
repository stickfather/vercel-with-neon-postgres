import { NextResponse } from "next/server";
import {
  deletePaymentScheduleEntry,
  updatePaymentScheduleEntry,
} from "@/features/administration/data/student-profile";

type PayParams = Promise<{ studentId: string; entryId: string }>;

export async function PUT(
  request: Request,
  { params }: { params: PayParams }
) {
  try {
    const { entryId: entryIdStr } = await params; // 👈 await params
    const entryId = Number(entryIdStr);
    if (!Number.isFinite(entryId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = await request.json();
    const dueDate =
      typeof body?.dueDate === "string" && body.dueDate.trim().length
        ? body.dueDate
        : null;
    const amountValue = body?.amount;
    const amount =
      amountValue == null || amountValue === ""
        ? null
        : typeof amountValue === "number"
          ? amountValue
          : Number(amountValue);

    if (amount != null && (!Number.isFinite(amount) || amount <= 0)) {
      return NextResponse.json(
        { error: "El monto debe ser un número mayor a cero." },
        { status: 400 },
      );
    }

    const isPaid = Boolean(body?.isPaid);
    const receivedDate =
      typeof body?.receivedDate === "string" && body.receivedDate.trim().length
        ? body.receivedDate
        : null;
    const note =
      typeof body?.note === "string" && body.note.trim().length
        ? body.note.trim()
        : null;

    await updatePaymentScheduleEntry(entryId, {
      dueDate,
      amount,
      isPaid,
      receivedDate,
      note,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating payment schedule entry", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el registro de pago.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: PayParams }
) {
  try {
    const { entryId: entryIdStr } = await params; // 👈 await params
    const entryId = Number(entryIdStr);
    if (!Number.isFinite(entryId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    await deletePaymentScheduleEntry(entryId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment schedule entry", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo eliminar el registro de pago.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
