import { NextResponse } from "next/server";
import { createStaffMember, listStaffMembers } from "@/features/staff/data/queries";

export async function GET() {
  try {
    const staff = await listStaffMembers();
    return NextResponse.json(staff);
  } catch (error) {
    console.error("Error al listar el personal", error);
    return NextResponse.json(
      { error: "No se pudo obtener la lista de personal." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const fullName = typeof body.fullName === "string" ? body.fullName : "";
    const role = typeof body.role === "string" ? body.role : null;
    const hourlyWage = body.hourlyWage ?? null;
    const weeklyHours = body.weeklyHours ?? null;
    const active = body.active !== undefined ? Boolean(body.active) : true;

    const staffMember = await createStaffMember({
      fullName,
      role,
      hourlyWage,
      weeklyHours,
      active,
    });

    return NextResponse.json(staffMember, { status: 201 });
  } catch (error) {
    console.error("Error al crear personal", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear el registro del personal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
