import { cache } from "react";
import { createPanelGerencialClient } from "./client";

type StudentsByHourRow = {
  dow: number;
  hour: number;
  avg_students: number | null;
  p95_students: number | null;
};

type StaffByHourRow = {
  dow: number;
  hour: number;
  avg_staff: number | null;
  p95_staff: number | null;
};

type StudentStaffRatioRow = {
  dow: number;
  hour: number;
  avg_students: number | null;
  avg_staff: number | null;
  avg_student_staff_ratio: number | null;
  p95_students: number | null;
  p95_staff: number | null;
};

type PeakLoadWindowRow = {
  dow: number;
  hour: number;
  avg_students: number | null;
  p95_students: number | null;
};

type OpsData = {
  students: StudentsByHourRow[];
  staff: StaffByHourRow[];
  ratios: StudentStaffRatioRow[];
  peaks: PeakLoadWindowRow[];
};

async function fetchOpsData(): Promise<OpsData> {
  const sql = await createPanelGerencialClient();
  const rows = (await sql`
    WITH
      students AS (
        SELECT dow, hour, avg_students, p95_students
        FROM analytics.v_students_by_hour_30d
        ORDER BY dow, hour
      ),
      staff AS (
        SELECT dow, hour, avg_staff, p95_staff
        FROM analytics.v_staff_by_hour_30d
        ORDER BY dow, hour
      ),
      ratios AS (
        SELECT dow, hour, avg_students, avg_staff, avg_student_staff_ratio, p95_students, p95_staff
        FROM analytics.v_student_staff_ratio_by_hour_30d
        ORDER BY dow, hour
      ),
      peaks AS (
        SELECT dow, hour, avg_students, p95_students
        FROM analytics.v_peak_load_windows
        ORDER BY avg_students DESC, p95_students DESC, dow, hour
        LIMIT 50
      )
    SELECT
      COALESCE((SELECT json_agg(s ORDER BY dow, hour) FROM students s), '[]'::json) AS students,
      COALESCE((SELECT json_agg(st ORDER BY dow, hour) FROM staff st), '[]'::json) AS staff,
      COALESCE((SELECT json_agg(r ORDER BY dow, hour) FROM ratios r), '[]'::json) AS ratios,
      COALESCE((SELECT json_agg(p ORDER BY avg_students DESC, p95_students DESC, dow, hour) FROM peaks p), '[]'::json) AS peaks
    FROM (SELECT 1) AS _;
  `) as Array<{
    students: StudentsByHourRow[] | null;
    staff: StaffByHourRow[] | null;
    ratios: StudentStaffRatioRow[] | null;
    peaks: PeakLoadWindowRow[] | null;
  }>;

  const row = rows[0];
  return {
    students: row?.students ?? [],
    staff: row?.staff ?? [],
    ratios: row?.ratios ?? [],
    peaks: row?.peaks ?? [],
  };
}

const getOpsData = cache(fetchOpsData);

export async function studentsByHour30d() {
  return (await getOpsData()).students;
}

export async function staffByHour30d() {
  return (await getOpsData()).staff;
}

export async function studentStaffRatioByHour30d() {
  return (await getOpsData()).ratios;
}

export async function peakLoadWindows() {
  return (await getOpsData()).peaks;
}

export type {
  StudentsByHourRow,
  StaffByHourRow,
  StudentStaffRatioRow,
  PeakLoadWindowRow,
};
