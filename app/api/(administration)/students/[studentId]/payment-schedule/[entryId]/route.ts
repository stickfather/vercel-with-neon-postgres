import { NextResponse } from "next/server";
import {
  deletePaymentScheduleEntry,
  updatePaymentScheduleEntry,
} from "@/features/administration/data/student-profile";

export async function PUT(
  request: Request,
  { params }: { params: { studentId: string; entryId: string } },
) {
  try {
    const entryId = Number(params.entryId);
    if (!Number.isFinite(entryId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = await request.json();

    await updatePaymentScheduleEntry(entryId, {
      dueDate: body?.dueDate ?? null,
      amount: body?.amount ?? null,
      status: body?.status ?? null,
      notes: body?.notes ?? null,
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
  { params }: { params: { studentId: string; entryId: string } },
) {
  try {
    const entryId = Number(params.entryId);
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
