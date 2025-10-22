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
  const rows = normalizeRows<SqlRow>(
    await sql`
    WITH vencidos AS (
      SELECT
        sa.id,
        sa.checkin_time,
        timezone(
          ${TIMEZONE},
          date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE}) + INTERVAL '20 hours 15 minutes'
        ) AS checkout_programado
      FROM student_attendance sa
      WHERE sa.checkout_time IS NULL
        AND timezone(${TIMEZONE}, now()) >= timezone(
          ${TIMEZONE},
          date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE}) + INTERVAL '20 hours 15 minutes'
        )
    ),
    actualizados AS (
      UPDATE student_attendance AS sa
      SET checkout_time = GREATEST(sa.checkin_time, vencidos.checkout_programado)
      FROM vencidos
      WHERE sa.id = vencidos.id
      RETURNING sa.id
    )
    SELECT COUNT(*)::int AS total_cerrados
    FROM actualizados
  `,
  );

  const count = Number(rows[0]?.total_cerrados ?? 0);
  return Number.isFinite(count) ? count : 0;
}

export async function closeExpiredStaffSessions(
  sql = getSqlClient(),
): Promise<number> {
  const rows = normalizeRows<SqlRow>(
    await sql`
    WITH vencidos AS (
      SELECT
        sa.id,
        sa.checkin_time,
        timezone(
          ${TIMEZONE},
          date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE}) + INTERVAL '20 hours 15 minutes'
        ) AS checkout_programado
      FROM staff_attendance sa
      WHERE sa.checkout_time IS NULL
        AND timezone(${TIMEZONE}, now()) >= timezone(
          ${TIMEZONE},
          date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE}) + INTERVAL '20 hours 15 minutes'
        )
    ),
    actualizados AS (
      UPDATE staff_attendance AS sa
      SET checkout_time = GREATEST(sa.checkin_time, vencidos.checkout_programado)
      FROM vencidos
      WHERE sa.id = vencidos.id
      RETURNING sa.id
    )
    SELECT COUNT(*)::int AS total_cerrados
    FROM actualizados
  `,
  );

  const count = Number(rows[0]?.total_cerrados ?? 0);
  return Number.isFinite(count) ? count : 0;
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
