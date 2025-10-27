import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server.js";

import {
  deletePaymentScheduleEntry,
  updatePaymentScheduleEntry,
} from "@/features/administration/data/student-profile";
import {
  readRouteParam,
  resolveRouteParams,
  type RouteParamsContext,
} from "@/lib/api/route-params";

export const dynamic = "force-dynamic";

function normalizeId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function PUT(
  request: Request,
  context: any,
) {
  try {
    const params = await resolveRouteParams(context);
    const entryParam = readRouteParam(params, "entryId");
    const studentParam = readRouteParam(params, "studentId");
    const entryId = normalizeId(entryParam ?? "");
    const studentId = normalizeId(studentParam ?? "");

    if (entryId == null || studentId == null) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }
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

    const updated = await updatePaymentScheduleEntry(entryId, {
      dueDate,
      amount,
      isPaid,
      receivedDate,
      note,
    });

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);
    return NextResponse.json(updated);
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
  context: any,
) {
  try {
    const params = await resolveRouteParams(context);
    const entryParam = readRouteParam(params, "entryId");
    const studentParam = readRouteParam(params, "studentId");
    const entryId = normalizeId(entryParam ?? "");
    const studentId = normalizeId(studentParam ?? "");
    if (entryId == null || studentId == null) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const deleted = await deletePaymentScheduleEntry(entryId);

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);

    return NextResponse.json(deleted);
  } catch (error) {
    console.error("Error deleting payment schedule entry", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo eliminar el registro de pago.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
