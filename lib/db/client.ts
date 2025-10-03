import { neon } from "@neondatabase/serverless";

export type SqlRow = Record<string, unknown>;

type SqlClient = ReturnType<typeof neon>;

let sqlInstance: SqlClient | null = null;

export const TIMEZONE = "America/Guayaquil";

export function getSqlClient(): SqlClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("No DATABASE_URL environment variable");
  }
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

export async function closeExpiredSessions(sql = getSqlClient()) {
  await sql`
    WITH vencidos AS (
      SELECT
        sa.id,
        sa.checkin_time,
        timezone(
          ${TIMEZONE},
          date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE}) + INTERVAL '20 hours 30 minutes'
        ) AS checkout_programado
      FROM student_attendance sa
      WHERE sa.checkout_time IS NULL
        AND timezone(${TIMEZONE}, now()) >= timezone(
          ${TIMEZONE},
          date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE}) + INTERVAL '20 hours 30 minutes'
        )
    )
    UPDATE student_attendance AS sa
    SET checkout_time = GREATEST(sa.checkin_time, vencidos.checkout_programado)
    FROM vencidos
    WHERE sa.id = vencidos.id
  `;
}

export async function closeExpiredStaffSessions(sql = getSqlClient()) {
  await sql`
    WITH vencidos AS (
      SELECT
        sa.id,
        sa.checkin_time,
        timezone(
          ${TIMEZONE},
          date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE}) + INTERVAL '20 hours 30 minutes'
        ) AS checkout_programado
      FROM staff_attendance sa
      WHERE sa.checkout_time IS NULL
        AND timezone(${TIMEZONE}, now()) >= timezone(
          ${TIMEZONE},
          date_trunc('day', sa.checkin_time AT TIME ZONE ${TIMEZONE}) + INTERVAL '20 hours 30 minutes'
        )
    )
    UPDATE staff_attendance AS sa
    SET checkout_time = GREATEST(sa.checkin_time, vencidos.checkout_programado)
    FROM vencidos
    WHERE sa.id = vencidos.id
  `;
}

function isPermissionDeniedError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (code === "42501") return true;
    if (typeof message === "string" && message.toLowerCase().includes("permission denied")) {
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
      console.warn("Skipping session auto-closure due to permission error:", message);
      return;
    }
    throw error;
  }
}
