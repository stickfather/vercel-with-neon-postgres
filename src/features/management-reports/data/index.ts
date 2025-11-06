import {
  getSqlClient,
  normalizeRows,
  type SqlRow,
} from "@/lib/db/client";
import type {
  EngagementDeclinePoint,
  EngagementHourSplit,
  EngagementReport,
  EngagementRosterEntry,
  EngagementVisitPace,
  EngagementShiftPoint,
  EngagementStudyShift,
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
  PersonnelCoverage,
  PersonnelLoadPoint,
  PersonnelMix,
  PersonnelReport,
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

export async function getEngagementReport(sql: SqlClient = getSqlClient()): Promise<EngagementReport> {
  const [
    activeRows,
    inactiveRows,
    rosterRows,
    paceRows,
    declineRows,
    splitRows,
    shiftRows,
  ] = await Promise.all([
    safeRows(() => sql`SELECT * FROM mgmt.engagement_active_counts_v`, "mgmt.engagement_active_counts_v"),
    safeRows(() => sql`SELECT * FROM mgmt.engagement_inactive_counts_v`, "mgmt.engagement_inactive_counts_v"),
    safeRows(() => sql`SELECT * FROM mgmt.engagement_inactive_roster_v`, "mgmt.engagement_inactive_roster_v"),
    safeRows(() => sql`SELECT * FROM mgmt.engagement_avg_days_between_visits_v`, "mgmt.engagement_avg_days_between_visits_v"),
    safeRows(() => sql`SELECT * FROM mgmt.engagement_decline_index_v`, "mgmt.engagement_decline_index_v"),
    safeRows(() => sql`SELECT * FROM mgmt.engagement_hour_split_v`, "mgmt.engagement_hour_split_v"),
    safeRows(() => sql`
      SELECT hour_of_day, SUM(minutes) AS minutes
      FROM mart.student_hourly_30d_mv
      GROUP BY hour_of_day
      ORDER BY hour_of_day
    `, "mart.student_hourly_30d_mv"),
  ]);

  const active = mapRows(activeRows, (row) => {
    const range = readString(row, ["range", "window", "periodo"], [["day"], ["rango"], ["window"]]);
    const count = readInteger(row, ["count", "students"], [["count"], ["total"], ["estudiantes"]]);
    return { range, count };
  });

  const inactive = mapRows(inactiveRows, (row) => {
    const range = readString(row, ["range", "bucket", "categoria"], [["inactive"], ["dias"]]);
    const count = readInteger(row, ["count", "students"], [["count"], ["total"], ["estudiantes"]]);
    return { range, count };
  });

  const roster = mapRows(rosterRows, (row) => {
    const student = readString(row, ["student", "student_name", "nombre"], [["student"], ["nombre"]]);
    const status = readString(row, ["status", "motivo", "estado"], [["status"], ["motivo"], ["estado"]]);
    const lastVisit = readString(row, ["last_visit", "ultima_visita"], [["ultima"], ["visit"]]);
    const daysInactive = readInteger(row, ["days_inactive", "dias_inactivo"], [
      ["day", "inactive"],
      ["dias", "inactiv"],
    ]);
    return { student, status, lastVisit, daysInactive } satisfies EngagementRosterEntry;
  });

  const visitPace = mapRows(paceRows, (row) => {
    const label = readString(row, ["label", "categoria"], [["avg"], ["promedio"]]);
    const value = readNumber(row, ["avg_days", "promedio_dias"], [["avg"], ["dias"]]);
    return { label, value } satisfies EngagementVisitPace;
  });

  const declineIndex = mapRows(declineRows, (row) => {
    const label = readString(row, ["period", "label", "fecha"], [["sem"], ["week"], ["fecha"]]);
    const value = readNumber(row, ["index", "decline_index", "valor"], [["index"], ["decl"], ["valor"]]);
    return { label, value } satisfies EngagementDeclinePoint;
  });

  const hourSplit = mapRows(splitRows, (row) => {
    const hour = readString(row, ["hour", "hora"], [["hour"], ["hora"]]);
    const morning = readNumber(row, ["morning", "manana", "mañana"], [["morning"], ["man"], ["am"]]);
    const afternoon = readNumber(row, ["afternoon", "tarde"], [["afternoon"], ["tarde"], ["pm"]]);
    const evening = readNumber(row, ["evening", "noche"], [["evening"], ["noche"]]);
    return { hour, morning, afternoon, evening } satisfies EngagementHourSplit;
  });

  // Process study shift data - ensure all 24 hours are present
  const shiftMap = new Map<number, number>();
  shiftRows.forEach((row) => {
    const hour = readInteger(row, ["hour_of_day", "hour"], [["hour"]]);
    const minutes = readNumber(row, ["minutes", "mins"], [["minutes"], ["mins"]]);
    if (hour !== null && minutes !== null) {
      shiftMap.set(hour, minutes);
    }
  });

  // Fill in missing hours with 0
  const points: EngagementShiftPoint[] = [];
  for (let hour = 0; hour < 24; hour++) {
    points.push({
      hour_of_day: hour,
      minutes: shiftMap.get(hour) ?? 0,
    });
  }

  const total_minutes_30d = points.reduce((sum, p) => sum + p.minutes, 0);
  const studyShift: EngagementStudyShift = { points, total_minutes_30d };

  return { active, inactive, roster, visitPace, declineIndex, hourSplit, studyShift };
}

export async function getFinancialReport(sql: SqlClient = getSqlClient()): Promise<FinancialReport> {
  const [
    outstandingStudentsRows,
    outstandingBalanceRows,
    agingRows,
    collectionsTotalsRows,
    collectionsSeriesRows,
    debtorsRows,
    dueSoonSummaryRows,
    dueSoonSeriesRows,
  ] = await Promise.all([
    safeRows(() => sql`SELECT outstanding_students FROM financial_outstanding_students_v`, "financial_outstanding_students_v"),
    safeRows(() => sql`SELECT outstanding_balance FROM financial_outstanding_balance_v`, "financial_outstanding_balance_v"),
    safeRows(() => sql`SELECT * FROM financial_aging_buckets_v`, "financial_aging_buckets_v"),
    safeRows(() => sql`SELECT total_collected_30d, payments_count_30d FROM financial_collections_30d_v`, "financial_collections_30d_v"),
    safeRows(() => sql`SELECT d, amount FROM financial_collections_30d_series_v ORDER BY d`, "financial_collections_30d_series_v"),
    safeRows(() => sql`
      SELECT student_id, full_name, total_overdue_amount, max_days_overdue, 
             oldest_due_date, most_recent_missed_due_date, open_invoices, 
             COALESCE(priority_score, NULL) AS priority_score
      FROM financial_students_with_debts_v
      ORDER BY total_overdue_amount DESC
      LIMIT 200
    `, "financial_students_with_debts_v"),
    safeRows(() => sql`
      SELECT invoices_due_7d, students_due_7d, amount_due_7d, amount_due_today 
      FROM mgmt.financial_due_soon_summary_v
    `, "mgmt.financial_due_soon_summary_v"),
    safeRows(() => sql`SELECT d, amount, invoices FROM mgmt.financial_due_soon_series_v ORDER BY d`, "mgmt.financial_due_soon_series_v"),
  ]);

  const outstanding_students = readInteger(outstandingStudentsRows[0] ?? {}, ["outstanding_students"]) ?? 0;
  const outstanding_balance = readNumber(outstandingBalanceRows[0] ?? {}, ["outstanding_balance"]) ?? 0;

  const agingRow = agingRows[0] ?? {};
  const aging = {
    amt_0_30: readNumber(agingRow, ["amt_0_30"]) ?? 0,
    amt_31_60: readNumber(agingRow, ["amt_31_60"]) ?? 0,
    amt_61_90: readNumber(agingRow, ["amt_61_90"]) ?? 0,
    amt_over_90: readNumber(agingRow, ["amt_over_90"]) ?? 0,
    cnt_0_30: readInteger(agingRow, ["cnt_0_30"]) ?? 0,
    cnt_31_60: readInteger(agingRow, ["cnt_31_60"]) ?? 0,
    cnt_61_90: readInteger(agingRow, ["cnt_61_90"]) ?? 0,
    cnt_over_90: readInteger(agingRow, ["cnt_over_90"]) ?? 0,
    amt_total: readNumber(agingRow, ["amt_total"]) ?? 0,
    cnt_total: readInteger(agingRow, ["cnt_total"]) ?? 0,
  };

  const collections_totals = {
    total_collected_30d: readNumber(collectionsTotalsRows[0] ?? {}, ["total_collected_30d"]) ?? 0,
    payments_count_30d: readInteger(collectionsTotalsRows[0] ?? {}, ["payments_count_30d"]) ?? 0,
  };

  const collections_series = mapRows(collectionsSeriesRows, (row) => ({
    d: readString(row, ["d"]),
    amount: readNumber(row, ["amount"]) ?? 0,
  }));

  const debtors = mapRows(debtorsRows, (row) => ({
    student_id: readInteger(row, ["student_id"]) ?? 0,
    full_name: row.full_name ?? null,
    total_overdue_amount: readNumber(row, ["total_overdue_amount"]) ?? 0,
    max_days_overdue: readInteger(row, ["max_days_overdue"]) ?? 0,
    oldest_due_date: row.oldest_due_date ? String(row.oldest_due_date) : null,
    most_recent_missed_due_date: row.most_recent_missed_due_date ? String(row.most_recent_missed_due_date) : null,
    open_invoices: readInteger(row, ["open_invoices"]) ?? 0,
    priority_score: readNumber(row, ["priority_score"]),
  }));

  const due_soon_summary = {
    invoices_due_7d: readInteger(dueSoonSummaryRows[0] ?? {}, ["invoices_due_7d"]) ?? 0,
    students_due_7d: readInteger(dueSoonSummaryRows[0] ?? {}, ["students_due_7d"]) ?? 0,
    amount_due_7d: readNumber(dueSoonSummaryRows[0] ?? {}, ["amount_due_7d"]) ?? 0,
    amount_due_today: readNumber(dueSoonSummaryRows[0] ?? {}, ["amount_due_today"]) ?? 0,
  };

  const due_soon_series = mapRows(dueSoonSeriesRows, (row) => ({
    d: readString(row, ["d"]),
    amount: readNumber(row, ["amount"]) ?? 0,
    invoices: readInteger(row, ["invoices"]) ?? 0,
  }));

  return {
    outstanding_students,
    outstanding_balance,
    aging,
    collections_totals,
    collections_series,
    debtors,
    due_soon_summary,
    due_soon_series,
  };
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

export async function getPersonnelReport(sql: SqlClient = getSqlClient()): Promise<PersonnelReport> {
  const [mixRows, coverageRows, loadRows] = await Promise.all([
    safeRows(() => sql`SELECT * FROM mgmt.personnel_staffing_mix_v`, "mgmt.personnel_staffing_mix_v"),
    safeRows(() => sql`SELECT * FROM mgmt.personnel_peak_load_coverage_v`, "mgmt.personnel_peak_load_coverage_v"),
    safeRows(() => sql`SELECT * FROM mgmt.personnel_student_load_v`, "mgmt.personnel_student_load_v"),
  ]);

  const staffingMix = mapRows(mixRows, (row) => {
    const hour = readString(row, ["hour", "hora", "bloque"], [["hour"], ["hora"], ["bloque"]]);
    const students = readNumber(row, ["students", "student_minutes", "minutos_estudiantes", "alumnos"], [["minutos", "estudiantes"], ["student", "minutes"]]) ?? 0;
    const staff = readNumber(row, ["staff", "staff_minutes", "minutos_personal", "personal"], [["minutos", "personal"], ["staff", "minutes"]]) ?? 0;
    return { hour, students, staff } satisfies PersonnelMix;
  });

  const coverage = mapRows(coverageRows, (row) => {
    const area = readString(row, ["area", "zona", "hour_of_day"], [["area"], ["zona"], ["hour"]]);
    const status = readString(row, ["status", "descripcion", "estado_cobertura"], [["status"], ["desc"], ["estado"], ["cobertura"]]);
    const riskLevel = readString(row, ["risk_level", "riesgo", "nivel_riesgo"], [["risk"], ["riesgo"], ["nivel"]]);
    return { area, status, riskLevel } satisfies PersonnelCoverage;
  });

  const studentLoad = mapRows(loadRows, (row) => {
    const hour = readString(row, ["hour", "hora", "hour_of_day"], [["hour"], ["hora"]]);
    const value = readNumber(row, ["load", "students_per_teacher", "estudiantes_por_profesor", "valor"], [["load"], ["students"], ["alumno"], ["profesor"]]) ?? 0;
    return { hour, value } satisfies PersonnelLoadPoint;
  });

  return { staffingMix, coverage, studentLoad };
}
