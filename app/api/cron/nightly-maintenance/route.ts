import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { runScheduledAutoCheckout } from "@/features/session-maintenance/auto-checkout";

export const runtime = "edge";

async function refreshMaterializedViewsPhased() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("🔄 Starting phased MV refresh...");

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

  // Log the refresh completion
  const rows = (await sql`
    INSERT INTO mgmt.data_refresh_log (refreshed_at)
    VALUES (now())
    RETURNING refreshed_at;
  `) as { refreshed_at: string }[];

  const refreshedAt = rows[0]?.refreshed_at;
  console.log("✅ Full MV refresh complete at", refreshedAt);

  return refreshedAt;
}

export async function GET() {
  try {
    console.log("🌙 Starting nightly maintenance...");

    // Step 1: Run auto-checkout for students and staff
    const autoCheckoutResult = await runScheduledAutoCheckout({ force: false });
    console.log("✅ Auto-checkout complete:", {
      studentsClosed: autoCheckoutResult.studentsClosed,
      staffClosed: autoCheckoutResult.staffClosed,
      status: autoCheckoutResult.status,
      alreadyRan: autoCheckoutResult.alreadyRan,
    });

    // Step 2: Refresh all materialized views
    const refreshedAt = await refreshMaterializedViewsPhased();

    return NextResponse.json({
      success: true,
      autoCheckout: {
        studentsClosed: autoCheckoutResult.studentsClosed,
        staffClosed: autoCheckoutResult.staffClosed,
        status: autoCheckoutResult.status,
        alreadyRan: autoCheckoutResult.alreadyRan,
      },
      mvRefresh: {
        completedAt: refreshedAt,
      },
    });
  } catch (error) {
    console.error("❌ Nightly maintenance error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
