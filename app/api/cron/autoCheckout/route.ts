import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge"; // optional but improves latency

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // --- Auto-checkout students ---
    const studentRows = (await sql`
      UPDATE student_attendance
      SET checkout_time = date_trunc('day', checkin_time) + interval '20 hours 15 minutes',
          auto_checkout = TRUE
      WHERE checkout_time IS NULL
        AND checkin_time::date = current_date
      RETURNING id;
    `) as { id: number }[];

    // --- Auto-checkout staff ---
    const staffRows = (await sql`
      UPDATE staff_attendance
      SET checkout_time = date_trunc('day', checkin_time) + interval '20 hours 15 minutes',
          auto_checkout = TRUE
      WHERE checkout_time IS NULL
        AND checkin_time::date = current_date
      RETURNING id;
    `) as { id: number }[];

    const studentsUpdated = studentRows.length;
    const staffUpdated = staffRows.length;

    // --- Log run into audit table ---
    await sql`
      INSERT INTO auto_checkout_log (students_updated, staff_updated)
      VALUES (${studentsUpdated}, ${staffUpdated});
    `;

    return NextResponse.json({
      success: true,
      message: "Auto-checkout completed and logged.",
      studentsUpdated,
      staffUpdated,
    });
  } catch (err: any) {
    console.error("Auto-checkout error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
