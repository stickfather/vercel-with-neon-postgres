import { getSqlClient } from "@/lib/db/client";

let hasEnsuredStudentFlagCompatibility = false;
let hasEnsuredStaffAttendanceEdits = false;

function isPermissionOrOwnershipError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (code === "42501") return true;
    if (
      typeof message === "string" &&
      (message.toLowerCase().includes("permission denied") ||
        message.toLowerCase().includes("must be owner"))
    ) {
      return true;
    }
  }
  return false;
}

export async function ensureStudentFlagRefreshCompatibility(): Promise<void> {
  if (hasEnsuredStudentFlagCompatibility) {
    return;
  }

  const sql = getSqlClient();

  try {
    await sql`CREATE SCHEMA IF NOT EXISTS mart`;
    await sql`
      CREATE OR REPLACE FUNCTION mart.refresh_flags(p_student_id bigint)
      RETURNS void
      LANGUAGE plpgsql
      AS $$
      BEGIN
        -- Legacy stub retained for backwards compatibility with triggers that
        -- still invoke mart.refresh_flags. The function no longer performs any
        -- refresh work, but we keep the signature so inserts don't fail.
        PERFORM 1;
      END;
      $$
    `;
    hasEnsuredStudentFlagCompatibility = true;
  } catch (error) {
    if (isPermissionOrOwnershipError(error)) {
      console.warn(
        "No pudimos crear el stub mart.refresh_flags; continuamos de todas formas.",
        error,
      );
      return;
    }
    throw error;
  }
}

export async function ensureStaffAttendanceEditsCompatibility(): Promise<void> {
  if (hasEnsuredStaffAttendanceEdits) {
    return;
  }

  const sql = getSqlClient();

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS public.staff_attendance_edits (
        id BIGSERIAL PRIMARY KEY,
        attendance_id BIGINT REFERENCES public.staff_attendance(id) ON DELETE CASCADE,
        staff_id BIGINT NOT NULL,
        checkin_time TIMESTAMPTZ,
        checkout_time TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        source TEXT
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS staff_attendance_edits_attendance_idx
        ON public.staff_attendance_edits (attendance_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS staff_attendance_edits_staff_idx
        ON public.staff_attendance_edits (staff_id, updated_at DESC)
    `;

    hasEnsuredStaffAttendanceEdits = true;
  } catch (error) {
    if (isPermissionOrOwnershipError(error)) {
      console.warn(
        "No pudimos crear public.staff_attendance_edits; continuamos de todas formas.",
        error,
      );
      return;
    }
    throw error;
  }
}
