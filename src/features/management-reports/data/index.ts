import {
  getSqlClient,
  normalizeRows,
  type SqlRow,
} from "@/lib/db/client";
import type {
  ExamsAverageScore,
  ExamStrugglingStudent,
  ExamsRate,
  ExamsReport,
  ExamsUpcoming,
  FinancialAgingBucket,
  FinancialCollectionPoint,
  FinancialDebtor,
  FinancialOutstandingSummary,
  FinancialReport,
} from "@/types/management-reports";

type SqlClient = ReturnType<typeof getSqlClient>;

type Normalizer<T> = (row: SqlRow) => T | null;

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) return null;
    const parsed = Number(trimmed.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeInteger(value: unknown): number | null {
  const numeric = normalizeNumber(value);
  if (numeric === null) return null;
  return Math.round(numeric);
}

function normalizeString(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : "—";
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return "—";
}

function findKey(
  row: SqlRow,
  candidates: string[],
  includes: string[][] = [],
): string | null {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    if (!candidate) continue;
    const exact = keys.find((key) => key === candidate);
    if (exact) return exact;
    const insensitive = keys.find(
      (key) => key.toLowerCase() === candidate.toLowerCase(),
    );
    if (insensitive) return insensitive;
  }

  for (const parts of includes) {
    const match = keys.find((key) => {
      const lower = key.toLowerCase();
      return parts.every((part) => lower.includes(part));
    });
    if (match) return match;
  }

  return null;
}

function readString(
  row: SqlRow,
  candidates: string[],
  includes: string[][] = [],
  fallback = "—",
): string {
  const key = findKey(row, candidates, includes);
  if (!key) return fallback;
  return normalizeString(row[key]);
}

function readNumber(
  row: SqlRow,
  candidates: string[],
  includes: string[][] = [],
): number | null {
  const key = findKey(row, candidates, includes);
  if (!key) return null;
  return normalizeNumber(row[key]);
}

function readInteger(
  row: SqlRow,
  candidates: string[],
  includes: string[][] = [],
): number | null {
  const key = findKey(row, candidates, includes);
  if (!key) return null;
  return normalizeInteger(row[key]);
}

async function safeRows(
  runner: () => Promise<unknown>,
  label: string,
): Promise<SqlRow[]> {
  try {
    const result = await runner();
    return normalizeRows<SqlRow>(result);
  } catch (error) {
    console.warn(`No se pudo cargar la vista ${label}`, error);
    return [];
  }
}

function mapRows<T>(rows: SqlRow[], normalizer: Normalizer<T>): T[] {
  return rows
    .map((row) => normalizer(row))
    .filter((value): value is T => value !== null);
}

export async function getFinancialReport(sql: SqlClient = getSqlClient()): Promise<FinancialReport> {
  const [
    outstandingRows,
    collectionsRows,
    debtRows,
  ] = await Promise.all([
    // Get summary from final.finance_outstanding_today_mv
    safeRows(() => sql`
      SELECT 
        COUNT(DISTINCT student_id) AS students,
        COALESCE(SUM(outstanding_amount), 0) AS balance
      FROM final.finance_outstanding_today_mv
      WHERE outstanding_amount > 0
    `, "final.finance_outstanding_today_mv"),
    // Get collections from final.finance_collections_30d_mv
    safeRows(() => sql`
      SELECT 
        local_day AS date,
        payments_amount AS amount
      FROM final.finance_collections_30d_mv
      ORDER BY local_day
    `, "final.finance_collections_30d_mv"),
    // Get debtors from final.finance_outstanding_today_mv
    safeRows(() => sql`
      SELECT 
        student_name AS student,
        overdue_amount AS amount,
        CASE
          WHEN overdue_90_plus > 0 THEN 90
          WHEN overdue_61_90 > 0 THEN 75
          WHEN overdue_31_60 > 0 THEN 45
          WHEN overdue_0_30 > 0 THEN 15
          ELSE 0
        END AS days_overdue
      FROM final.finance_outstanding_today_mv
      WHERE overdue_amount > 0
      ORDER BY overdue_amount DESC
      LIMIT 50
    `, "final.finance_outstanding_today_mv"),
  ]);

  const outstandingRecord = outstandingRows[0] ?? {};
  const outstanding: FinancialOutstandingSummary = {
    students: normalizeInteger(
      readInteger(outstandingRecord, ["students", "students_outstanding", "alumnos"], [["student"], ["alumno"]]),
    ),
    balance: readNumber(outstandingRecord, ["balance", "total_balance", "saldo"], [["balance"], ["saldo"]]),
  };

  // Compute aging buckets from outstanding data
  const aging: FinancialAgingBucket[] = [
    { label: "0-30 días", value: null },
    { label: "31-60 días", value: null },
    { label: "61-90 días", value: null },
    { label: ">90 días", value: null },
  ];

  const collections = mapRows(collectionsRows, (row) => {
    const label = readString(row, ["date", "fecha", "period", "local_day"], [["dia"], ["fecha"], ["period"], ["day"]]);
    const value = readNumber(row, ["amount", "monto", "total", "payments_amount"], [["amount"], ["monto"], ["total"], ["payment"]]);
    return { label, value } satisfies FinancialCollectionPoint;
  });

  const debtors = mapRows(debtRows, (row) => {
    const student = readString(row, ["student", "nombre", "student_name"], [["student"], ["nombre"]]);
    const amount = readNumber(row, ["amount", "balance", "saldo", "overdue_amount"], [["amount"], ["saldo"], ["overdue"]]);
    const daysOverdue = readInteger(row, ["days_overdue", "dias_mora"], [
      ["dias", "mora"],
      ["day", "overdue"],
    ]);
    return { student, amount, daysOverdue } satisfies FinancialDebtor;
  });

  return { outstanding, aging, collections, debtors };
}

export async function getExamsReport(sql: SqlClient = getSqlClient()): Promise<ExamsReport> {
  const [
    upcomingRows,
    firstAttemptRows,
    overallRows,
    averageRows,
    instructiveCompletionRows,
    instructiveDaysRows,
    strugglingRows,
    linkRateRows,
  ] = await Promise.all([
    safeRows(() => sql`SELECT * FROM mgmt.exam_upcoming_30d_v`, "mgmt.exam_upcoming_30d_v"),
    safeRows(() => sql`SELECT * FROM mgmt.exam_first_attempt_pass_rate_v`, "mgmt.exam_first_attempt_pass_rate_v"),
    safeRows(() => sql`SELECT * FROM mgmt.exam_overall_pass_rate_v`, "mgmt.exam_overall_pass_rate_v"),
    safeRows(() => sql`SELECT * FROM mgmt.exam_average_score_v`, "mgmt.exam_average_score_v"),
    safeRows(() => sql`SELECT * FROM mgmt.exam_instructivo_completion_rate_v`, "mgmt.exam_instructivo_completion_rate_v"),
    safeRows(() => sql`SELECT * FROM mgmt.exam_instructivo_avg_days_to_complete_v`, "mgmt.exam_instructivo_avg_days_to_complete_v"),
    safeRows(() => sql`SELECT * FROM mgmt.exam_students_struggling_v`, "mgmt.exam_students_struggling_v"),
    safeRows(() => sql`SELECT * FROM mgmt.exam_failed_to_instructivo_link_rate_v`, "mgmt.exam_failed_to_instructivo_link_rate_v"),
  ]);

  const upcoming = mapRows(upcomingRows, (row) => {
    const exam = readString(row, ["exam", "evaluacion"], [["exam"], ["evaluacion"]]);
    const date = readString(row, ["date", "fecha"], [["date"], ["fecha"]]);
    const candidates = readInteger(row, ["candidates", "students", "alumnos"], [["candid"], ["student"], ["alumno"]]);
    return { exam, date, candidates } satisfies ExamsUpcoming;
  });

  const firstAttemptRate = mapRows(firstAttemptRows, (row) => {
    const label = readString(row, ["label", "metric", "descripcion"], [["primer"], ["first"]]);
    const value = readNumber(row, ["rate", "percentage", "valor"], [["rate"], ["pct"], ["porc"]]);
    return { label, value } satisfies ExamsRate;
  })[0] ?? null;

  const overallRate = mapRows(overallRows, (row) => {
    const label = readString(row, ["label", "metric"], [["global"], ["overall"]]);
    const value = readNumber(row, ["rate", "percentage", "valor"], [["rate"], ["pct"], ["porc"]]);
    return { label, value } satisfies ExamsRate;
  })[0] ?? null;

  const averageScore = mapRows(averageRows, (row) => {
    const label = readString(row, ["label", "metric", "descripcion"], [["score"], ["puntaje"]]);
    const value = readNumber(row, ["score", "average", "promedio"], [["score"], ["avg"], ["promedio"]]);
    return { label, value } satisfies ExamsAverageScore;
  })[0] ?? null;

  const instructiveCompletion = mapRows(instructiveCompletionRows, (row) => {
    const label = readString(row, ["label", "metric"], [["instructivo"], ["completion"]]);
    const value = readNumber(row, ["rate", "percentage", "valor"], [["rate"], ["pct"], ["porc"]]);
    return { label, value } satisfies ExamsRate;
  })[0] ?? null;

  const instructiveDays = mapRows(instructiveDaysRows, (row) => {
    const label = readString(row, ["label", "metric"], [["dias"], ["days"], ["promedio"]]);
    const value = readNumber(row, ["avg_days", "promedio_dias"], [["avg"], ["dias"]]);
    return { label, value } satisfies ExamsRate;
  })[0] ?? null;

  const strugglingStudents = mapRows(strugglingRows, (row) => {
    const student = readString(row, ["student", "nombre"], [["student"], ["nombre"]]);
    const exam = readString(row, ["exam", "evaluacion"], [["exam"], ["evaluacion"]]);
    const attempts = readInteger(row, ["attempts", "intentos"], [["attempt"], ["intento"]]);
    const score = readNumber(row, ["score", "puntaje"], [["score"], ["puntaje"]]);
    return { student, exam, attempts, score } satisfies ExamStrugglingStudent;
  });

  const failToInstructiveLink = mapRows(linkRateRows, (row) => {
    const label = readString(row, ["label", "metric"], [["instructivo"], ["vincul"]]);
    const value = readNumber(row, ["rate", "percentage", "valor"], [["rate"], ["pct"], ["porc"]]);
    return { label, value } satisfies ExamsRate;
  })[0] ?? null;

  return {
    upcoming,
    firstAttemptRate,
    overallRate,
    averageScore,
    instructiveCompletion,
    instructiveDays,
    strugglingStudents,
    failToInstructiveLink,
  };
}

