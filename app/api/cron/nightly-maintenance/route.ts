import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { runScheduledAutoCheckout } from "@/features/session-maintenance/auto-checkout";

export const runtime = "edge";

async function checkAutoCheckoutLogTable() {
  const sql = neon(process.env.DATABASE_URL!);

  try {
    // Check if the auto_checkout_log table exists
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'auto_checkout_log'
      ) as table_exists;
    `;

    const tableExists = result[0]?.table_exists;

    if (!tableExists) {
      console.warn("⚠️ auto_checkout_log table not found.");
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Error checking auto_checkout_log table:", error);
    return false;
  }
}

async function refreshMaterializedViewsPhased() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("🔄 Starting MV refresh using mart.refresh_all_mvs()...");

  try {
    // Run the database function that handles all MV refreshes
    await sql`SELECT mart.refresh_all_mvs();`;

    const timestamp = new Date().toISOString();
    console.log(`✅ MV refresh completed at ${timestamp}`);

    return timestamp;
  } catch (error) {
    console.error("❌ Error during MV refresh:", error);
    throw error;
  }
}

export async function GET() {
  try {
    console.log("🌙 Starting nightly maintenance...");

    // Step 1: Check if auto_checkout_log table exists
    const tableExists = await checkAutoCheckoutLogTable();
    if (!tableExists) {
      console.warn("⚠️ Continuing without auto_checkout_log table.");
    }

    // Step 2: Run auto-checkout for students and staff
    const autoCheckoutResult = await runScheduledAutoCheckout({ force: false });
    console.log("✅ Auto-checkout complete:", {
      studentsClosed: autoCheckoutResult.studentsClosed,
      staffClosed: autoCheckoutResult.staffClosed,
      status: autoCheckoutResult.status,
      alreadyRan: autoCheckoutResult.alreadyRan,
    });

    // Step 3: Refresh all materialized views
    const refreshedAt = await refreshMaterializedViewsPhased();

    return NextResponse.json({
      success: true,
      autoCheckoutLogExists: tableExists,
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
