import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getStudentBasicDetails } from "@/features/administration/data/student-profile";
import { getSqlClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

function normalizeStudentId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const ALLOWED_STATUS_VALUES = new Set([
  "active",
  "frozen",
  "invalid",
  "online",
  "graduated",
  "contract_terminated",
]);

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
  const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
  const hasContractEnd =
    Object.prototype.hasOwnProperty.call(body, "contract_end") ||
    Object.prototype.hasOwnProperty.call(body, "contractEnd");

  if (!hasStatus && !hasContractEnd) {
    return NextResponse.json(
      { error: "No se detectaron cambios para guardar." },
      { status: 400 },
    );
  }

  let statusValue: string | null = null;
  if (hasStatus) {
    const rawStatus = body.status;
    if (typeof rawStatus !== "string") {
      return NextResponse.json(
        { error: "El estado debe ser un texto válido." },
        { status: 400 },
      );
    }
    const normalizedStatus = rawStatus.trim().toLowerCase();
    if (!ALLOWED_STATUS_VALUES.has(normalizedStatus)) {
      return NextResponse.json(
        { error: "Estado desconocido para el estudiante." },
        { status: 400 },
      );
    }
    statusValue = normalizedStatus;
  }

  const requiresEndDate =
    statusValue === "graduated" || statusValue === "contract_terminated";

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

  if (statusValue && requiresEndDate && !hasContractEnd) {
    return NextResponse.json(
      { error: "Debes proporcionar la fecha de finalización para este estado." },
      { status: 400 },
    );
  }

  if (statusValue && !requiresEndDate && !hasContractEnd) {
    contractEndDate = null;
  }

  try {
    const sql = getSqlClient();

    if (statusValue && contractEndDate !== undefined) {
      await sql`
        UPDATE public.students
        SET status = ${statusValue},
            graduated = ${statusValue === "graduated"},
            contract_end = ${contractEndDate ?? null}::date,
            updated_at = NOW()
        WHERE id = ${studentId}::bigint
      `;
    } else if (statusValue) {
      await sql`
        UPDATE public.students
        SET status = ${statusValue},
            graduated = ${statusValue === "graduated"},
            updated_at = NOW()
        WHERE id = ${studentId}::bigint
      `;
    } else if (contractEndDate !== undefined) {
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
      graduated: Boolean(updated.graduated ?? updated.status === "graduated"),
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
