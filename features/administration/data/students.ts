import { getSqlClient, normalizeRows, SqlRow } from "@/lib/db/client";

export type StudentManagementEntry = {
  id: number;
  fullName: string;
  status: string | null;
  flags: string[];
  lastLessonId: number | null;
  lastLesson: string | null;
  lastLessonAt: string | null;
  lastAttendanceAt: string | null;
  firstLessonAt: string | null;
  allowsProgression: boolean | null;
  instructiveOwner: string | null;
  statusUpdatedAt: string | null;
  flagsUpdatedAt: string | null;
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

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
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

function coerceIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? value.toISOString() : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
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
      status: (row.status as string | null) ?? null,
      flags: normalizeFlagList(row.flags),
      lastLessonId:
        coerceNumber(
          pick(row, ["last_lesson_id", "lesson_id", "lastlesson_id"]),
        ) ?? null,
      lastLesson:
        coerceString(
          pick(row, ["last_lesson", "lesson_name", "lesson_title"]),
        ) ?? null,
      lastLessonAt:
        coerceIso(pick(row, ["last_lesson_at", "lesson_at", "lastlesson_at"])) ??
        null,
      lastAttendanceAt:
        coerceIso(
          pick(row, ["last_attendance_at", "attendance_at", "lastattendance_at"]),
        ) ?? null,
      firstLessonAt:
        coerceIso(
          pick(row, ["first_lesson_at", "firstlesson_at", "first_attendance_at"]),
        ) ?? null,
      allowsProgression:
        coerceBoolean(
          pick(row, [
            "allows_progression",
            "allow_progression",
            "is_allow_progression",
            "is_allows_progression",
          ]),
        ) ?? null,
      instructiveOwner:
        coerceString(pick(row, ["instructive_owner", "owner", "coach"])) ?? null,
      statusUpdatedAt:
        coerceIso(pick(row, ["status_updated_at", "statusupdated_at"])) ?? null,
      flagsUpdatedAt:
        coerceIso(pick(row, ["flags_updated_at", "flagsupdated_at"])) ?? null,
    }))
    .filter((student) => student.fullName.length > 0 && Number.isFinite(student.id) && student.id > 0);
}
