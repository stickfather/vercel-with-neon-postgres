import { NextResponse } from "next/server";
import { getSqlClient, normalizeRows } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type MonthSummaryEntry = {
  staff_id: number;
  work_date: string;
  minutes: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");

  // Support both year+month params and single month param for backward compatibility
  let year: number;
  let month: number;

  if (yearParam && monthParam) {
    year = Number(yearParam);
    month = Number(monthParam);
  } else if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    // Parse YYYY-MM format
    const parts = monthParam.split("-");
    year = Number(parts[0]);
    month = Number(parts[1]);
  } else {
    return NextResponse.json(
      { error: "Debes indicar 'year' y 'month' o 'month' en formato 'YYYY-MM'." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Año o mes inválido." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const sql = getSqlClient();
    
    // Compute month boundaries
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const monthEndExclusive = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
    
    // Generate days array using Postgres generate_series
    const daysResult = normalizeRows<{ work_date: string }>(await sql`
      SELECT generate_series(
        ${monthStart}::date,
        (${monthEndExclusive}::date - interval '1 day')::date,
        interval '1 day'
      )::date::text AS work_date
    `);
    
    const days = daysResult.map((row) => row.work_date);
    
    // Aggregate sessions from staff_day_sessions_v
    const entriesResult = normalizeRows<MonthSummaryEntry>(await sql`
      SELECT
        staff_id,
        work_date::text AS work_date,
        SUM(COALESCE(minutes, 0))::integer AS minutes
      FROM public.staff_day_sessions_v
      WHERE work_date >= ${monthStart}::date
        AND work_date < ${monthEndExclusive}::date
      GROUP BY staff_id, work_date
      ORDER BY staff_id, work_date
    `);
    
    return NextResponse.json(
      { days, entries: entriesResult },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error al obtener el resumen mensual", error);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos cargar el resumen mensual.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
