"use server";

import { getSqlClient } from "@/lib/db/client";
import { revalidatePath } from "next/cache";

export async function approveStaffDayAction(input: {
  staffId: number;
  workDate: string;
  approved: boolean;
  minutesOverride?: number | null;
  approvedBy?: number | null;
  note?: string | null;
  revalidate?: string;
}) {
  const {
    staffId,
    workDate,
    approved,
    minutesOverride = null,
    approvedBy = null,
    note = null,
    revalidate,
  } = input;

  const sql = await getSqlClient();
  await sql.query(
    `SELECT public.approve_staff_day($1::bigint,$2::date,$3::boolean,$4::integer,$5::bigint,$6::text);`,
    [staffId, workDate, approved, minutesOverride, approvedBy, note],
  );

  if (revalidate) {
    revalidatePath(revalidate);
  }
}
