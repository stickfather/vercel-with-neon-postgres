import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge"; // optional but improves latency

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // --- Auto-checkout students ---
    const students = await sql(`
      UPDATE student_attendance
      SET checkout_time = date_trunc('day', checkin_time) + interval '20 hours 15 minutes',
          auto_checkout = TRUE
      WHERE checkout_time IS NULL
        AND checkin_time::date = current_date
      RETURNING id;
    `);

    // --- Auto-checkout staff ---
    const staff = await sql(`
      UPDATE staff_attendance
      SET checkout_time = date_trunc('day', checkin_time) + interval '20 hours 15 minutes',
          auto_checkout = TRUE
      WHERE checkout_time IS NULL
        AND checkin_time::date = current_date
      RETURNING id;
    `);

    // --- Log run into audit table ---
    await sql(`
      INSERT INTO auto_checkout_log (students_updated, staff_updated)
      VALUES (${students.length}, ${staff.length});
    `);

    return NextResponse.json({
      success: true,
      message: "Auto-checkout completed and logged.",
      studentsUpdated: students.length,
      staffUpdated: staff.length,
    });
  } catch (err: any) {
    console.error("Auto-checkout error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
