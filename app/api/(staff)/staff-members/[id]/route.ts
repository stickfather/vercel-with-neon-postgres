import { NextResponse } from "next/server.js";
import { deleteStaffMember, updateStaffMember } from "@/features/staff/data/queries";

export async function PATCH(request: Request, context: any) {
  const params = await context.params;
  const parsedId = Number(params.id);

  if (!Number.isFinite(parsedId)) {
    return NextResponse.json(
      { error: "El identificador enviado no es válido." },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const fullName = typeof body.fullName === "string" ? body.fullName : "";
    const role = typeof body.role === "string" ? body.role : null;
    const hourlyWage = body.hourlyWage ?? null;
    const weeklyHours = body.weeklyHours ?? null;
    const active = body.active !== undefined ? Boolean(body.active) : false;

    const updated = await updateStaffMember(parsedId, {
      fullName,
      role,
      hourlyWage,
      weeklyHours,
      active,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error al actualizar personal", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el registro del personal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: any) {
  const params = await context.params;
  const parsedId = Number(params.id);

  if (!Number.isFinite(parsedId)) {
    return NextResponse.json(
      { error: "El identificador enviado no es válido." },
      { status: 400 },
    );
  }

  try {
    await deleteStaffMember(parsedId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar personal", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo eliminar al miembro del personal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
