import { neon } from "@neondatabase/serverless";

import { PAYROLL_TIMEZONE } from "@/lib/payroll/timezone";
import { requireEnv } from "@/src/config/env";

export type SqlRow = Record<string, unknown>;

type SqlClient = ReturnType<typeof neon>;

let sqlInstance: SqlClient | null = null;

export const TIMEZONE = PAYROLL_TIMEZONE;

export function getSqlClient(): SqlClient {
  const connectionString = requireEnv("databaseUrl");
  if (!sqlInstance) {
    sqlInstance = neon(connectionString);
  }
  return sqlInstance;
}

export function normalizeRows<T extends SqlRow>(result: unknown): T[] {
  if (Array.isArray(result)) {
    if (!result.length) return [];
    if (Array.isArray(result[0])) return [];
    return result as T[];
  }
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return normalizeRows<T>(rows);
  }
  return [];
}

export async function closeExpiredSessions(
  sql = getSqlClient(),
): Promise<number> {
  const runUpdate = async () =>
    normalizeRows<SqlRow>(
      await sql`
        UPDATE public.student_attendance
        SET checkout_time = GREATEST(
          checkin_time,
          timezone(
            ${TIMEZONE},
            date_trunc('day', checkin_time AT TIME ZONE ${TIMEZONE}) + INTERVAL '20 hours 15 minutes'
          )
        )
        WHERE checkout_time IS NULL
          AND timezone(${TIMEZONE}, now()) >= timezone(
            ${TIMEZONE},
            date_trunc('day', checkin_time AT TIME ZONE ${TIMEZONE}) + INTERVAL '20 hours 15 minutes'
          )
        RETURNING id
      `,
    );

  const rows = await runUpdate();

  return rows.length;
}

export async function closeExpiredStaffSessions(
  sql = getSqlClient(),
): Promise<number> {
  try {
    const rows = normalizeRows<SqlRow>(
      await sql`
        UPDATE public.staff_attendance
        SET checkout_time = GREATEST(
          checkin_time,
          timezone(
            ${TIMEZONE},
            date_trunc('day', checkin_time AT TIME ZONE ${TIMEZONE}) + INTERVAL '20 hours 15 minutes'
          )
        )
        WHERE checkout_time IS NULL
          AND timezone(${TIMEZONE}, now()) >= timezone(
            ${TIMEZONE},
            date_trunc('day', checkin_time AT TIME ZONE ${TIMEZONE}) + INTERVAL '20 hours 15 minutes'
          )
        RETURNING id
      `,
    );

    return rows.length;
  } catch (error) {
    if (isMissingRelationError(error)) {
      console.warn(
        "No pudimos cerrar asistencias vencidas del personal porque falta una relación esperada.",
        error,
      );
      return 0;
    }
    throw error;
  }
}

function isPermissionDeniedError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (code === "42501") return true;
    if (
      typeof message === "string" &&
      message.toLowerCase().includes("permission denied")
    ) {
      return true;
    }
  }
  return false;
}

export async function safelyCloseExpiredSessions(
  sql: SqlClient,
  closer: (sql: SqlClient) => Promise<void>,
): Promise<void> {
  try {
    await closer(sql);
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        "Skipping session auto-closure due to permission error:",
        message,
      );
      return;
    }
    throw error;
  }
}

export function isMissingRelationError(error: unknown, relation?: string): boolean {
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (code === "42P01") {
      if (!relation) return true;
      if (typeof message === "string") {
        return message.includes(relation);
      }
      return true;
    }
    if (
      typeof message === "string" &&
      message.toLowerCase().includes("does not exist") &&
      (!relation || message.includes(relation))
    ) {
      return true;
    }
  }
  return false;
}
