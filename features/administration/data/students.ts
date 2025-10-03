import { getSqlClient, normalizeRows, SqlRow } from "@/lib/db/client";

export type StudentManagementEntry = {
  id: number;
  fullName: string;
  level: string | null;
  state: string | null;
  isExamPreparation: boolean;
  hasSpecialNeeds: boolean;
  hasPaymentIssues: boolean;
  isLowProgress: boolean;
  isSlowProgress: boolean;
  isDropoutRisk: boolean;
};

function coerceString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  return null;
}

function coerceBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "t", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "f", "0", "no", "n"].includes(normalized)) return false;
  }
  return null;
}

function pick<T = unknown>(row: SqlRow, keys: string[]): T | null {
  for (const key of keys) {
    if (key in row && row[key] != null) {
      return row[key] as T;
    }
  }
  return null;
}

export async function listStudentManagementEntries(): Promise<StudentManagementEntry[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.student_management_v
    ORDER BY full_name ASC
  `);

  return rows
    .map((row) => ({
      id: Number(row["student_id"] ?? row.id ?? row["id"] ?? 0),
      fullName: ((row.full_name as string | null) ?? "").trim(),
      level:
        coerceString(
          pick(row, ["level", "current_level", "last_level", "student_level"]),
        ) ?? null,
      state:
        coerceString(pick(row, ["state", "status", "student_state"])) ?? null,
      isExamPreparation:
        coerceBoolean(
          pick(row, [
            "is_exam_preparation",
            "exam_preparation",
            "is_exam",
            "preparation",
          ]),
        ) ?? false,
      hasSpecialNeeds:
        coerceBoolean(
          pick(row, [
            "has_special_needs",
            "special_needs",
            "is_special_needs",
          ]),
        ) ?? false,
      hasPaymentIssues:
        coerceBoolean(
          pick(row, [
            "has_payment_issues",
            "payment_issues",
            "is_payment_issue",
          ]),
        ) ?? false,
      isLowProgress:
        coerceBoolean(
          pick(row, [
            "is_low_progress",
            "low_progress",
            "has_low_progress",
          ]),
        ) ?? false,
      isSlowProgress:
        coerceBoolean(
          pick(row, [
            "is_slow_progress",
            "slow_progress",
            "has_slow_progress",
          ]),
        ) ?? false,
      isDropoutRisk:
        coerceBoolean(
          pick(row, [
            "is_dropout_risk",
            "dropout_risk",
            "is_dropout",
            "dropout",
          ]),
        ) ?? false,
    }))
    .filter((student) => student.fullName.length > 0 && Number.isFinite(student.id) && student.id > 0);
}
