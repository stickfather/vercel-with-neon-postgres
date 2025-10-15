import { NextResponse } from "next/server.js";

import {
  HttpError,
  MonthSummaryQuerySchema,
  SetMonthPaidSchema,
  getMonthSummary,
  parseWithSchema,
  setMonthPaid,
} from "@/lib/payroll/reports-service";
import type { MonthSummaryRow } from "@/types/payroll";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function normalizeMonth(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }
  return trimmed;
}

function parseStaffId(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.length) {
    throw new HttpError(400, "El parámetro 'staffId' no es válido.");
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new HttpError(400, "El parámetro 'staffId' no es válido.");
  }
  return parsed;
}

type MonthStatusRow = {
  staffId: number;
  staffName: string | null;
  month: string;
  approvedDays: number;
  approvedHours: number;
  amountPaid: number;
  paid: boolean;
  lastApprovedAt: string | null;
  reference: string | null;
  paidBy: string | null;
  paidAt: string | null;
};

function toMonthStatusRow(row: MonthSummaryRow): MonthStatusRow {
  const amountPaidBase =
    row.amountPaid != null ? Number(row.amountPaid.toFixed(2)) : null;
  const approvedAmountBase = Number(row.approvedAmount.toFixed(2));
  return {
    staffId: row.staffId,
    staffName: row.staffName,
    month: row.month,
    approvedDays: 0,
    approvedHours: Number(row.approvedHours.toFixed(2)),
    amountPaid: amountPaidBase ?? approvedAmountBase,
    paid: Boolean(row.paid),
    lastApprovedAt: null,
    reference: row.reference,
    paidBy: row.paidBy,
    paidAt: row.paidAt,
  };
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  console.error("Error en el estado mensual de nómina", error);
  return NextResponse.json(
    { error: "No pudimos procesar el estado mensual de nómina." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const params = parseWithSchema(MonthSummaryQuerySchema, {
      month: normalizeMonth(searchParams.get("month")),
    });
    const staffId = parseStaffId(searchParams.get("staffId"));
    const summary = await getMonthSummary(params);
    const filtered =
      staffId == null
        ? summary
        : summary.filter((row) => row.staffId === staffId);
    return NextResponse.json(
      { rows: filtered.map(toMonthStatusRow) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "No pudimos leer los datos enviados." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const normalizedMonth = normalizeMonth((body as { month?: string })?.month ?? null);
    const payload = parseWithSchema(SetMonthPaidSchema, {
      ...((body && typeof body === "object") ? body : {}),
      month: normalizedMonth,
    });

    await setMonthPaid(payload);
    const summary = await getMonthSummary({ month: payload.month });
    const updated = summary.find((row) => row.staffId === payload.staffId) ?? null;

    return NextResponse.json(
      { row: updated ? toMonthStatusRow(updated) : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
