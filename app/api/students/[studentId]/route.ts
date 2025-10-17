import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getStudentBasicDetails } from "@/features/administration/data/student-profile";
import { getSqlClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

function normalizeStudentId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDateInput(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new Error("Formato de fecha inválido. Usa AAAA-MM-DD.");
    }
    return trimmed;
  }

  throw new Error("Formato de fecha inválido. Usa AAAA-MM-DD.");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const resolvedParams = await params;
  const studentId = normalizeStudentId(resolvedParams.studentId);

  if (studentId == null) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("Error parsing graduation payload", error);
    return NextResponse.json({ error: "No se pudo procesar la solicitud." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const hasGraduated = Object.prototype.hasOwnProperty.call(body, "graduated");
  const hasContractEnd =
    Object.prototype.hasOwnProperty.call(body, "contract_end") ||
    Object.prototype.hasOwnProperty.call(body, "contractEnd");

  if (!hasGraduated && !hasContractEnd) {
    return NextResponse.json(
      { error: "No se detectaron cambios para guardar." },
      { status: 400 },
    );
  }

  const rawGraduated = hasGraduated ? body.graduated : undefined;

  if (hasGraduated && typeof rawGraduated !== "boolean") {
    return NextResponse.json(
      { error: "El estado de graduación debe ser verdadero o falso." },
      { status: 400 },
    );
  }

  const rawContractEnd = hasContractEnd
    ? Object.prototype.hasOwnProperty.call(body, "contract_end")
      ? body.contract_end
      : body.contractEnd
    : undefined;

  let contractEndDate: string | null | undefined;
  try {
    if (hasContractEnd) {
      contractEndDate = normalizeDateInput(rawContractEnd);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Formato de fecha inválido. Usa AAAA-MM-DD.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const sql = getSqlClient();

    if (hasGraduated) {
      const graduated = rawGraduated as boolean;
      const statusValue = graduated ? "graduado" : "activo";

      if (graduated) {
        if (contractEndDate == null) {
          await sql`
            UPDATE public.students
            SET graduated = true,
                status = ${statusValue},
                contract_end = CURRENT_DATE,
                updated_at = NOW()
            WHERE id = ${studentId}::bigint
          `;
        } else {
          await sql`
            UPDATE public.students
            SET graduated = true,
                status = ${statusValue},
                contract_end = ${contractEndDate}::date,
                updated_at = NOW()
            WHERE id = ${studentId}::bigint
          `;
        }
      } else {
        const nextContractEnd = hasContractEnd ? contractEndDate : null;
        await sql`
          UPDATE public.students
          SET graduated = false,
              status = ${statusValue},
              contract_end = ${nextContractEnd ?? null}::date,
              updated_at = NOW()
          WHERE id = ${studentId}::bigint
        `;
      }
    } else if (hasContractEnd) {
      await sql`
        UPDATE public.students
        SET contract_end = ${contractEndDate ?? null}::date,
            updated_at = NOW()
        WHERE id = ${studentId}::bigint
      `;
    }

    const updated = await getStudentBasicDetails(studentId);

    if (!updated) {
      return NextResponse.json({ error: "Estudiante no encontrado." }, { status: 404 });
    }

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);

    return NextResponse.json({
      graduated: Boolean(updated.graduated),
      contract_end: updated.contractEnd,
      status: updated.status,
    });
  } catch (error) {
    console.error("Error updating student graduation state", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el estado del estudiante." },
      { status: 500 },
    );
  }
}
