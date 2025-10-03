import { getSqlClient, normalizeRows, SqlRow } from "@/lib/db/client";

export type StudentManagementEntry = {
  id: number;
  fullName: string;
  status: string | null;
  flags: string[];
};

function normalizeFlagList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((value) => (typeof value === "string" ? value : value == null ? "" : String(value)))
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  if (typeof raw === "string") {
    return raw
      .split(/[,;\n]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (raw && typeof raw === "object") {
    return Object.values(raw)
      .map((value) => (typeof value === "string" ? value.trim() : value == null ? "" : String(value)))
      .filter((value) => value.length > 0);
  }

  return [];
}

export async function listStudentManagementEntries(): Promise<StudentManagementEntry[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      student_id,
      full_name,
      status,
      flags
    FROM public.student_management_v
    ORDER BY full_name ASC
  `);

  return rows
    .map((row) => ({
      id: Number(row["student_id"] ?? row.id ?? row["id"] ?? 0),
      fullName: ((row.full_name as string | null) ?? "").trim(),
      status: (row.status as string | null) ?? null,
      flags: normalizeFlagList(row.flags),
    }))
    .filter((student) => student.fullName.length > 0 && Number.isFinite(student.id) && student.id > 0);
}
