import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

async function refreshMaterializedViews() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("🔄 Running full MV refresh (manual or cron)...");

  // Phase 1: Base MVs (run in parallel)
  console.log("⏳ Phase 1: Refreshing base MVs...");
  await Promise.all([
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mart.student_activity_30d_mv`,
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mart.student_hourly_30d_mv`,
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mart.student_daypart_30d_mv`,
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mart.student_lesson_effort_mv`,
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mart.staff_hourly_30d_mv`,
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mart.mv_kpi_active_students_mtd`,
    sql`REFRESH MATERIALIZED VIEW mart.mv_kpi_avg_daily_checkins`,
  ]);
  console.log("✅ Phase 1 complete");

  // Phase 2: Dependent MVs (run in parallel after Phase 1)
  console.log("⏳ Phase 2: Refreshing dependent MVs...");
  await Promise.all([
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mart.lei_speed_benchmarks_30d_mv`,
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mart.student_lei_rank_30d_mv`,
  ]);
  console.log("✅ Phase 2 complete");

  const rows = (await sql`
      INSERT INTO mgmt.data_refresh_log (refreshed_at)
      VALUES (now())
      RETURNING refreshed_at;
    `) as { refreshed_at: string }[];

  const refreshedAt = rows[0]?.refreshed_at;
  console.log("✅ MV refresh complete at", refreshedAt);

  return refreshedAt;
}

async function handleRequest(method: "GET" | "POST") {
  try {
    if (method === "POST") {
      // TODO: enforce admin-only POST access when called from the browser.
    }

    const refreshedAt = await refreshMaterializedViews();

    return NextResponse.json({ ok: true, refreshed_at: refreshedAt });
  } catch (error) {
    console.error("❌ Error refreshing MVs:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return handleRequest("GET");
}

export async function POST() {
  return handleRequest("POST");
}
