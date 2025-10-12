import {
  closeExpiredSessions,
  closeExpiredStaffSessions,
  getSqlClient,
  normalizeRows,
  SqlRow,
  TIMEZONE,
} from "@/lib/db/client";

type AutoCheckoutRecord = {
  runDate: string;
  executedAt: string;
  studentsClosed: number;
  staffClosed: number;
  status: "success" | "skipped" | "error";
  attempts: number;
  message: string | null;
  alreadyRan: boolean;
};

function getLocalDateString(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const partMap = parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  const year = partMap.year ?? String(new Date().getFullYear());
  const month = partMap.month ?? "01";
  const day = partMap.day ?? "01";
  return `${year}-${month}-${day}`;
}

async function ensureLogTable() {
  const sql = getSqlClient();
  await sql`
    CREATE TABLE IF NOT EXISTS auto_checkout_runs (
      run_date date PRIMARY KEY,
      executed_at timestamptz NOT NULL DEFAULT now(),
      students_closed integer NOT NULL DEFAULT 0,
      staff_closed integer NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'pending',
      message text,
      run_attempts integer NOT NULL DEFAULT 0
    )
  `;
}

function parseCount(row: SqlRow | undefined, key: string): number {
  if (!row) return 0;
  const value = row[key];
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function mapRecord(row: SqlRow): AutoCheckoutRecord {
  return {
    runDate: String(row.run_date ?? row.runDate ?? ""),
    executedAt: String(row.executed_at ?? row.executedAt ?? new Date().toISOString()),
    studentsClosed: parseCount(row, "students_closed"),
    staffClosed: parseCount(row, "staff_closed"),
    status: (() => {
      const rawStatus = String(row.status ?? "success").toLowerCase();
      if (rawStatus === "success") return "success";
      if (rawStatus === "error") return "error";
      return "skipped";
    })(),
    attempts: Math.max(parseCount(row, "run_attempts"), 0),
    message: (row.message as string | null) ?? null,
    alreadyRan: Boolean(row.status && String(row.status).toLowerCase() === "success"),
  };
}

export async function runScheduledAutoCheckout({
  force = false,
}: { force?: boolean } = {}): Promise<AutoCheckoutRecord> {
  await ensureLogTable();
  const sql = getSqlClient();
  const localDate = getLocalDateString(TIMEZONE);

  const existingRows = normalizeRows<SqlRow>(await sql`
    SELECT run_date, executed_at, students_closed, staff_closed, status, message, run_attempts
    FROM auto_checkout_runs
    WHERE run_date = ${localDate}::date
    LIMIT 1
  `);

  const existing = existingRows[0];
  if (existing && String(existing.status).toLowerCase() === "success" && !force) {
    const mapped = mapRecord(existing);
    return { ...mapped, status: "skipped", alreadyRan: true };
  }

  try {
    const studentsClosed = await closeExpiredSessions(sql);
    const staffClosed = await closeExpiredStaffSessions(sql);
    const attempts = existing ? parseCount(existing, "run_attempts") + 1 : 1;

    const upsertRows = normalizeRows<SqlRow>(await sql`
      INSERT INTO auto_checkout_runs (
        run_date,
        executed_at,
        students_closed,
        staff_closed,
        status,
        message,
        run_attempts
      )
      VALUES (
        ${localDate}::date,
        now(),
        ${studentsClosed},
        ${staffClosed},
        'success',
        ${`Cierre automático diario completado (${studentsClosed} estudiantes, ${staffClosed} staff).`},
        ${attempts}
      )
      ON CONFLICT (run_date)
      DO UPDATE SET
        executed_at = excluded.executed_at,
        students_closed = excluded.students_closed,
        staff_closed = excluded.staff_closed,
        status = excluded.status,
        message = excluded.message,
        run_attempts = excluded.run_attempts
      RETURNING run_date, executed_at, students_closed, staff_closed, status, message, run_attempts
    `);

    const mapped = mapRecord(upsertRows[0]);
    return {
      ...mapped,
      studentsClosed,
      staffClosed,
      status: "success",
      alreadyRan: false,
    };
  } catch (error) {
    const attempts = existing ? parseCount(existing, "run_attempts") + 1 : 1;
    const failureMessage =
      error instanceof Error
        ? error.message
        : "Error desconocido durante el cierre automático.";

    const failureRows = normalizeRows<SqlRow>(await sql`
      INSERT INTO auto_checkout_runs (
        run_date,
        executed_at,
        students_closed,
        staff_closed,
        status,
        message,
        run_attempts
      )
      VALUES (
        ${localDate}::date,
        now(),
        ${existing ? parseCount(existing, "students_closed") : 0},
        ${existing ? parseCount(existing, "staff_closed") : 0},
        'error',
        ${failureMessage},
        ${attempts}
      )
      ON CONFLICT (run_date)
      DO UPDATE SET
        executed_at = excluded.executed_at,
        status = excluded.status,
        message = excluded.message,
        run_attempts = excluded.run_attempts
      RETURNING run_date, executed_at, students_closed, staff_closed, status, message, run_attempts
    `);

    const mappedFailure = mapRecord(failureRows[0]);
    return { ...mappedFailure, status: "error", message: failureMessage, alreadyRan: false };
  }
}
