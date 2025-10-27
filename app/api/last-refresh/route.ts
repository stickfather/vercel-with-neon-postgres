import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);

  try {
    const rows = (await sql`
      SELECT refreshed_at
      FROM mgmt.last_refresh_v;
    `) as { refreshed_at: string }[];

    const refreshedAt = rows[0]?.refreshed_at ?? null;

    return NextResponse.json({ refreshed_at: refreshedAt });
  } catch (error) {
    console.error("❌ Error loading last refresh time:", error);
    return NextResponse.json(
      { refreshed_at: null, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
