import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

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
    }

    return tableExists || false;
  } catch (error) {
    console.error("❌ Error checking auto_checkout_log table:", error);
    return false;
  }
}

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  
  console.log("🔄 Starting MV refresh using mart.refresh_all_mvs()...");
  
  try {
    // Step 1: Check if auto_checkout_log table exists (optional check)
    const tableExists = await checkAutoCheckoutLogTable();
    
    // Step 2: Run the centralized refresh function
    await sql`SELECT mart.refresh_all_mvs();`;
    
    const timestamp = new Date().toISOString();
    console.log(`✅ MV refresh completed at ${timestamp}`);
    
    return NextResponse.json({ 
      ok: true, 
      refreshed_at: timestamp,
      auto_checkout_log_exists: tableExists
    });
  } catch (error) {
    console.error("❌ Error refreshing MVs:", error);
    console.error("[refresh-mvs] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) { 
  return run(); 
}

export async function POST(req: Request) { 
  return run(); 
}
