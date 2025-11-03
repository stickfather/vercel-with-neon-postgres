import { NextRequest, NextResponse } from "next/server";

import { getSqlClient, normalizeRows } from "@/lib/db/client";
import type { StuckStudent } from "@/types/reports.learning";

export const revalidate = 0;

function isMissingRelation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const pgError = error as { code?: string; message?: string };
  if (pgError.code && pgError.code.toUpperCase() === "42P01") return true;
  return typeof pgError.message === "string" && /does not exist/i.test(pgError.message);
}

async function queryWithFallback<T>(primary: () => Promise<T>, fallback?: () => Promise<T>) {
  try {
    return await primary();
  } catch (error) {
    if (fallback && isMissingRelation(error)) {
      return await fallback();
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const level = request.nextUrl.searchParams.get("level");
  const seqParam = request.nextUrl.searchParams.get("seq");
  const currentSeq = seqParam ? Number(seqParam) : NaN;

  if (!level || Number.isNaN(currentSeq)) {
    return NextResponse.json(
      { error: "Parámetros inválidos" },
      { status: 400 },
    );
  }

  const sql = getSqlClient();
  const rows = normalizeRows<Partial<StuckStudent>>(
    await queryWithFallback(
      () => sql`
        SELECT student_id, full_name, level::text AS level, current_seq, last_seen_date
        FROM learning_stuck_students_v
        WHERE level = ${level} AND current_seq = ${currentSeq}
        ORDER BY full_name
      `,
      () => sql`
        SELECT student_id, full_name, level::text AS level, current_seq, last_seen_date
        FROM mgmt.learning_stuck_students_v
        WHERE level = ${level} AND current_seq = ${currentSeq}
        ORDER BY full_name
      `,
    ),
  );

  const students: StuckStudent[] = rows.map((row) => ({
    student_id: Number(row.student_id ?? 0),
    full_name: String(row.full_name ?? "Sin nombre"),
    level: String(row.level ?? level),
    current_seq: Number(row.current_seq ?? currentSeq),
    last_seen_date: row.last_seen_date ? String(row.last_seen_date) : null,
  }));

  return NextResponse.json({ students });
}
