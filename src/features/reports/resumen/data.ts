import { cache } from "react";
import type { GenHeader, LevelBands, LevelKPI } from "@/types/reports.resumen";
import { getSqlClient, normalizeRows } from "@/lib/db/client";

function normalizeNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function fetchResumenHeader(): Promise<GenHeader | null> {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<GenHeader>>(await sql`SELECT * FROM mgmt.gen_header_v LIMIT 1`);
  if (!rows.length) return null;
  const row = rows[0];
  return {
    students_total: normalizeNumber(row.students_total),
    active_7d: normalizeNumber(row.active_7d),
    active_30d: normalizeNumber(row.active_30d),
    new_30d: normalizeNumber(row.new_30d),
    returning_30d: normalizeNumber(row.returning_30d),
    pct_on_pace: normalizeNullableNumber(row.pct_on_pace),
    median_session_minutes_30d: normalizeNullableNumber(row.median_session_minutes_30d),
    avg_study_hours_per_student_30d: normalizeNullableNumber(row.avg_study_hours_per_student_30d),
  };
}

async function fetchLevelBands(): Promise<LevelBands[]> {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<LevelBands>>(await sql`
    SELECT level, band_0_33, band_34_66, band_67_99, band_100
    FROM mgmt.gen_level_progress_bands_v
    ORDER BY level
  `);
  return rows.map((row) => ({
    level: String(row.level ?? "—"),
    band_0_33: normalizeNumber(row.band_0_33),
    band_34_66: normalizeNumber(row.band_34_66),
    band_67_99: normalizeNumber(row.band_67_99),
    band_100: normalizeNumber(row.band_100),
  }));
}

async function fetchLevelKpis(): Promise<LevelKPI[]> {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<LevelKPI>>(await sql`
    SELECT level, students, active_30d_pct, on_pace_pct, median_lei_30d, median_months_to_finish
    FROM mgmt.gen_level_kpis_v
    ORDER BY level
  `);
  return rows.map((row) => ({
    level: String(row.level ?? "—"),
    students: normalizeNumber(row.students),
    active_30d_pct: normalizeNullableNumber(row.active_30d_pct),
    on_pace_pct: normalizeNullableNumber(row.on_pace_pct),
    median_lei_30d: normalizeNullableNumber(row.median_lei_30d),
    median_months_to_finish: normalizeNullableNumber(row.median_months_to_finish),
  }));
}

export const getResumenHeader = cache(fetchResumenHeader);
export const getLevelBands = cache(fetchLevelBands);
export const getLevelKpis = cache(fetchLevelKpis);

export async function getResumenGeneralData() {
  const [header, bands, kpis] = await Promise.all([
    getResumenHeader(),
    getLevelBands(),
    getLevelKpis(),
  ]);

  return { header, bands, kpis };
}
