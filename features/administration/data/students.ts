import { getSqlClient, normalizeRows, SqlRow } from "@/lib/db/client";

export type StudentWithFlags = {
  id: number;
  fullName: string;
  status: string | null;
  state: string | null;
  flags: {
    isAbsent: boolean;
    isNewStudent: boolean;
    isExamApproaching: boolean;
    hasSpecialNeeds: boolean;
    isSlowProgress: boolean;
    instructivoActive: boolean;
    instructivoOverdue: boolean;
  };
};

export async function listStudentsWithFlags(): Promise<StudentWithFlags[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      s.id,
      s.full_name,
      s.status,
      s.state,
      sf.is_absent,
      sf.is_new_student,
      sf.is_exam_approaching,
      sf.has_special_needs,
      sf.is_slow_progress,
      sf.instructivo_active,
      sf.instructivo_overdue
    FROM students s
    LEFT JOIN student_flags sf ON sf.student_id = s.id
    ORDER BY s.full_name ASC
  `);

  return rows
    .map((row) => ({
      id: Number(row.id),
      fullName: ((row.full_name as string | null) ?? "").trim(),
      status: (row.status as string | null) ?? null,
      state: (row.state as string | null) ?? null,
      flags: {
        isAbsent: Boolean(row["is_absent"] ?? false),
        isNewStudent: Boolean(row["is_new_student"] ?? false),
        isExamApproaching: Boolean(row["is_exam_approaching"] ?? false),
        hasSpecialNeeds: Boolean(row["has_special_needs"] ?? false),
        isSlowProgress: Boolean(row["is_slow_progress"] ?? false),
        instructivoActive: Boolean(row["instructivo_active"] ?? false),
        instructivoOverdue: Boolean(row["instructivo_overdue"] ?? false),
      },
    }))
    .filter((student) => student.fullName.length > 0);
}
