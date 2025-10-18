import { NextResponse } from "next/server";

import { fetchPayrollMatrixContract } from "@/features/administration/data/payroll-reports";
import { HttpError } from "@/lib/payroll/reports-service";
import { isManagerAuthorized } from "@/lib/security/manager-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");

  if (!fromRaw || !fromRaw.trim().length || !toRaw || !toRaw.trim().length) {
    return NextResponse.json(
      { error: "Debes indicar el rango de fechas 'from' y 'to'." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const staffParams = [
    ...searchParams.getAll("staffId"),
    ...searchParams.getAll("staff_id"),
  ];
  const staffIds = staffParams
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  try {
    const matrix = await fetchPayrollMatrixContract({
      from: fromRaw,
      to: toRaw,
      staffIds,
    });
    const manager = isManagerAuthorized(request);
    const amountsHidden = !manager;

    const rows = matrix.rows.map((row) => ({
      staff_id: row.staffId,
      staff_name: row.staffName,
      work_date: row.workDate,
      total_hours: Number(row.totalHours.toFixed(2)),
      approved_hours:
        amountsHidden || row.approvedHours == null
          ? null
          : Number(row.approvedHours.toFixed(2)),
      approved: row.approved,
      has_edits: row.hasEdits,
      cell_color: row.cellColor,
    }));

    return NextResponse.json(
      {
        range: matrix.range,
        rows,
        amounts_hidden: amountsHidden,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Error al obtener la matriz de nómina", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No pudimos cargar la matriz de nómina." },
      {
        status: error instanceof Error ? 400 : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
