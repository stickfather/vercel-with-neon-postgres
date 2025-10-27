import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getStudentBasicDetails } from "@/features/administration/data/student-profile";
import { getSqlClient } from "@/lib/db/client";
import {
  readRouteParam,
  resolveRouteParams,
  type RouteParamsContext,
} from "@/lib/api/route-params";

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

export async function PATCH(request: Request, context: any) {
  const params = await resolveRouteParams(context);
  const studentParam = readRouteParam(params, "studentId");
  const studentId = normalizeStudentId(studentParam ?? "");

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
  const hasGraduationDate =
    Object.prototype.hasOwnProperty.call(body, "graduation_date") ||
    Object.prototype.hasOwnProperty.call(body, "graduationDate");
  const hasArchived = Object.prototype.hasOwnProperty.call(body, "archived");
  const hasFrozenStart =
    Object.prototype.hasOwnProperty.call(body, "frozen_start") ||
    Object.prototype.hasOwnProperty.call(body, "frozenStart");
  const hasFrozenEnd =
    Object.prototype.hasOwnProperty.call(body, "frozen_end") ||
    Object.prototype.hasOwnProperty.call(body, "frozenEnd");

  if (
    !hasStatus &&
    !hasContractEnd &&
    !hasGraduationDate &&
    !hasArchived &&
    !hasFrozenStart &&
    !hasFrozenEnd
  ) {
    return NextResponse.json(
      { error: "No se detectaron cambios para guardar." },
      { status: 400 },
    );
  }

  let statusValue: string | undefined;
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

  const rawGraduationDate = hasGraduationDate
    ? Object.prototype.hasOwnProperty.call(body, "graduation_date")
      ? body.graduation_date
      : body.graduationDate
    : undefined;

  let graduationDate: string | null | undefined;
  try {
    if (hasGraduationDate) {
      graduationDate = normalizeDateInput(rawGraduationDate);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Formato de fecha inválido. Usa AAAA-MM-DD.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const rawFrozenStart = hasFrozenStart
    ? Object.prototype.hasOwnProperty.call(body, "frozen_start")
      ? body.frozen_start
      : body.frozenStart
    : undefined;

  let frozenStartDate: string | null | undefined;
  try {
    if (hasFrozenStart) {
      frozenStartDate = normalizeDateInput(rawFrozenStart);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Formato de fecha inválido. Usa AAAA-MM-DD.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const rawFrozenEnd = hasFrozenEnd
    ? Object.prototype.hasOwnProperty.call(body, "frozen_end")
      ? body.frozen_end
      : body.frozenEnd
    : undefined;

  let frozenEndDate: string | null | undefined;
  try {
    if (hasFrozenEnd) {
      frozenEndDate = normalizeDateInput(rawFrozenEnd);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Formato de fecha inválido. Usa AAAA-MM-DD.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let archivedValue: boolean | null | undefined;
  if (hasArchived) {
    const rawArchived = body.archived;
    if (rawArchived === null) {
      archivedValue = null;
    } else if (typeof rawArchived === "boolean") {
      archivedValue = rawArchived;
    } else if (typeof rawArchived === "number") {
      if (rawArchived === 1) archivedValue = true;
      else if (rawArchived === 0) archivedValue = false;
      else {
        return NextResponse.json(
          { error: "El valor de archivado no es válido." },
          { status: 400 },
        );
      }
    } else if (typeof rawArchived === "string") {
      const normalized = rawArchived.trim().toLowerCase();
      if (["true", "t", "1", "sí", "si", "yes"].includes(normalized)) {
        archivedValue = true;
      } else if (["false", "f", "0", "no", "n"].includes(normalized)) {
        archivedValue = false;
      } else if (!normalized.length) {
        archivedValue = null;
      } else {
        return NextResponse.json(
          { error: "El valor de archivado no es válido." },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "El valor de archivado no es válido." },
        { status: 400 },
      );
    }
  }

  try {
    const sql = getSqlClient();
    const updates: string[] = [];
    const values: unknown[] = [];

    if (statusValue !== undefined) {
      values.push(statusValue);
      updates.push(`status = $${values.length}`);
    }
    if (contractEndDate !== undefined) {
      values.push(contractEndDate);
      updates.push(`contract_end = $${values.length}::date`);
    }
    if (graduationDate !== undefined) {
      values.push(graduationDate);
      updates.push(`graduation_date = $${values.length}::date`);
    }
    if (frozenStartDate !== undefined) {
      values.push(frozenStartDate);
      updates.push(`frozen_start = $${values.length}::date`);
    }
    if (frozenEndDate !== undefined) {
      values.push(frozenEndDate);
      updates.push(`frozen_end = $${values.length}::date`);
    }
    if (archivedValue !== undefined) {
      values.push(archivedValue);
      updates.push(`archived = $${values.length}`);
    }

    if (!updates.length) {
      return NextResponse.json(
        { error: "No se detectaron cambios para guardar." },
        { status: 400 },
      );
    }

    updates.push(`updated_at = NOW()`);

    const query = `
      UPDATE public.students
      SET ${updates.join(", ")}
      WHERE id = $${values.length + 1}::bigint
    `;

    await sql.query(query, [...values, studentId]);

    await sql`
      SELECT public.recompute_status_for_student(${studentId}::bigint)
    `;

    const updated = await getStudentBasicDetails(studentId);

    if (!updated) {
      return NextResponse.json({ error: "Estudiante no encontrado." }, { status: 404 });
    }

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);

    return NextResponse.json({
      contract_end: updated.contractEnd,
      graduation_date: updated.graduationDate,
      frozen_start: updated.frozenStart,
      frozen_end: updated.frozenEnd,
      status: updated.status,
      archived: updated.archived,
    });
  } catch (error) {
    console.error("Error updating student graduation state", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el estado del estudiante." },
      { status: 500 },
    );
  }
}
