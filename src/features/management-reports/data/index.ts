import {
  getSqlClient,
  normalizeRows,
  type SqlRow,
} from "@/lib/db/client";
import type {
  AcademicRiskLevel,
  EngagementDeclinePoint,
  EngagementHourSplit,
  EngagementReport,
  EngagementRosterEntry,
  EngagementVisitPace,
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
  LearningLevelDuration,
  LearningReport,
  LevelVelocity,
  PersonnelCoverage,
  PersonnelLoadPoint,
  PersonnelMix,
  PersonnelReport,
  SlowStudent,
  SpeedBucket,
  StuckStudent,
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

function ensureSortedNumber<T extends { value: number | null }>(data: T[]) {
  return data.slice().sort((a, b) => {
    if (a.value == null && b.value == null) return 0;
    if (a.value == null) return 1;
    if (b.value == null) return -1;
    return b.value - a.value;
  });
}

export async function getLearningReport(sql: SqlClient = getSqlClient()): Promise<LearningReport> {
  const [
    durationRows,
    stuckRows,
    riskRows,
    velocityRows,
    speedRows,
    heatmapRows,
  ] = await Promise.all([
    safeRows(() => sql`SELECT * FROM mgmt.learning_level_duration_v`, "mgmt.learning_level_duration_v"),
    safeRows(() => sql`SELECT * FROM mgmt.learning_stuck_heatmap_v`, "mgmt.learning_stuck_heatmap_v"),
    safeRows(() => sql`SELECT * FROM mgmt.learning_days_since_progress_v`, "mgmt.learning_days_since_progress_v"),
    safeRows(() => sql`SELECT * FROM mgmt.learning_level_completion_velocity_v`, "mgmt.learning_level_completion_velocity_v"),
    safeRows(() => sql`SELECT * FROM mgmt.learning_speed_buckets_v`, "mgmt.learning_speed_buckets_v"),
    safeRows(() => sql`SELECT * FROM mgmt.learning_lesson_variance_v`, "mgmt.learning_lesson_variance_v"),
  ]);

  const levelDurations = mapRows(durationRows, (row) => {
    const level = readString(row, ["level", "nivel"], [["level"], ["nivel"]]);
    const medianDays = readNumber(row, ["median_days", "median", "median_days_in_level"], [
      ["median", "day"],
      ["mediana"],
    ]);
    return { level, medianDays } satisfies LearningLevelDuration;
  });

  const stuckStudents = mapRows(stuckRows, (row) => {
    const student = readString(row, ["student", "student_name", "nombre"], [["student"], ["nombre"]]);
    const level = readString(row, ["level", "nivel"], [["level"], ["nivel"]]);
    const lesson = readString(row, ["lesson", "leccion", "module"], [["lesson"], ["leccion"], ["module"]]);
    const daysStuck = readInteger(row, ["days_stuck", "dias_estancado"], [
      ["day", "stuck"],
      ["dias", "estanc"],
    ]);
    return { student, level, lesson, daysStuck } satisfies StuckStudent;
  });

  const academicRisk = mapRows(riskRows, (row) => {
    const level = readString(row, ["level", "nivel"], [["level"], ["nivel"]]);
    const medianDaysSinceProgress = readNumber(
      row,
      ["median_days", "median_days_since_progress"],
      [["median", "progress"], ["dias", "progreso"]],
    );
    const stalledCount = readInteger(row, ["stalled", "students_stalled"], [["estanc"], ["stalled"]]);
    const inactiveCount = readInteger(row, ["inactive_14d", "inactive"], [["inactive"], ["inactivo"]]);
    return {
      level,
      medianDaysSinceProgress,
      stalledCount,
      inactiveCount,
    } satisfies AcademicRiskLevel;
  });

  const completionVelocity = mapRows(velocityRows, (row) => {
    const level = readString(row, ["level", "nivel"], [["level"], ["nivel"]]);
    const lessonsPerWeek = readNumber(row, ["lessons_per_week", "velocity"], [["lesson"], ["velocidad"]]);
    return { level, lessonsPerWeek } satisfies LevelVelocity;
  });

  const bucketTotals = new Map<string, SpeedBucket>();
  const slowStudents = mapRows(speedRows, (row) => {
    const bucketRaw = readString(row, ["bucket", "speed_bucket", "categoria"], [["bucket"], ["velocidad"]]);
    const bucket = bucketRaw.toLowerCase();
    const label = bucketRaw === "—" ? "Sin clasificar" : bucketRaw;
    const percentage = readNumber(row, ["percentage", "pct", "ratio"], [["pct"], ["percent"], ["porc"]]);
    const count = readInteger(row, ["count", "total"], [["count"], ["total"]]);
    const student = readString(row, ["student", "student_name", "nombre"], [["student"], ["nombre"]]);
    const level = readString(row, ["level", "nivel"], [["level"], ["nivel"]]);
    const metric = readNumber(row, ["speed_index", "score", "days_per_lesson"], [
      ["speed"],
      ["lent"],
      ["dias", "leccion"],
    ]);

    if (!bucketTotals.has(bucket)) {
      bucketTotals.set(bucket, {
        bucket,
        label,
        percentage: percentage ?? null,
        count: count ?? null,
      });
    } else {
      const existing = bucketTotals.get(bucket);
      if (existing) {
        if (percentage != null && (existing.percentage == null || percentage > existing.percentage)) {
          existing.percentage = percentage;
        }
        if (count != null && (existing.count == null || count > existing.count)) {
          existing.count = count;
        }
      }
    }

    if (bucket.includes("slow") || bucket.includes("lento")) {
      return { student, level, metric } satisfies SlowStudent;
    }

    return null;
  });

  const speedBuckets = Array.from(bucketTotals.values());

  const heatmapStudents = mapRows(heatmapRows, (row) => {
    const student = readString(row, ["student", "nombre"], [["student"], ["nombre"]]);
    const level = readString(row, ["level", "nivel"], [["level"], ["nivel"]]);
    const lesson = readString(row, ["lesson", "leccion"], [["lesson"], ["leccion"]]);
    const daysStuck = readInteger(row, ["days_stuck", "dias_estancado"], [
      ["day", "stuck"],
      ["dias", "estanc"],
    ]);
    return { student, level, lesson, daysStuck } satisfies StuckStudent;
  });

  // Combine stuck students from both sources, prioritizing longest delays
  const combinedStuck = ensureSortedNumber(
    [...stuckStudents, ...heatmapStudents].map((student) => ({
      ...student,
      value: student.daysStuck,
    })),
  )
    .slice(0, 25)
    .map(({ value, ...rest }) => ({ ...rest, daysStuck: value } satisfies StuckStudent));

  return {
    levelDurations,
    stuckStudents: combinedStuck,
    academicRisk,
    completionVelocity,
    speedBuckets,
    slowStudents,
  };
}

export async function getEngagementReport(sql: SqlClient = getSqlClient()): Promise<EngagementReport> {
  const [
    activeRows,
    inactiveRows,
    rosterRows,
    paceRows,
    declineRows,
    splitRows,
  ] = await Promise.all([
    safeRows(() => sql`SELECT * FROM mgmt.engagement_active_counts_v`, "mgmt.engagement_active_counts_v"),
    safeRows(() => sql`SELECT * FROM mgmt.engagement_inactive_counts_v`, "mgmt.engagement_inactive_counts_v"),
    safeRows(() => sql`SELECT * FROM mgmt.engagement_inactive_roster_v`, "mgmt.engagement_inactive_roster_v"),
    safeRows(() => sql`SELECT * FROM mgmt.engagement_avg_days_between_visits_v`, "mgmt.engagement_avg_days_between_visits_v"),
    safeRows(() => sql`SELECT * FROM mgmt.engagement_decline_index_v`, "mgmt.engagement_decline_index_v"),
    safeRows(() => sql`SELECT * FROM mgmt.engagement_hour_split_v`, "mgmt.engagement_hour_split_v"),
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

  return { active, inactive, roster, visitPace, declineIndex, hourSplit };
}

export async function getFinancialReport(sql: SqlClient = getSqlClient()): Promise<FinancialReport> {
  const [
    outstandingRows,
    agingRows,
    collectionsRows,
    debtRows,
  ] = await Promise.all([
    safeRows(() => sql`SELECT * FROM mgmt.financial_outstanding_balance_v`, "mgmt.financial_outstanding_balance_v"),
    safeRows(() => sql`SELECT * FROM mgmt.financial_aging_buckets_v`, "mgmt.financial_aging_buckets_v"),
    safeRows(() => sql`SELECT * FROM mgmt.financial_collections_30d_v`, "mgmt.financial_collections_30d_v"),
    safeRows(() => sql`SELECT * FROM mgmt.financial_students_with_debts_v`, "mgmt.financial_students_with_debts_v"),
  ]);

  const outstandingRecord = outstandingRows[0] ?? {};
  const outstanding: FinancialOutstandingSummary = {
    students: normalizeInteger(
      readInteger(outstandingRecord, ["students", "students_outstanding", "alumnos"], [["student"], ["alumno"]]),
    ),
    balance: readNumber(outstandingRecord, ["balance", "total_balance", "saldo"], [["balance"], ["saldo"]]),
  };

  const aging = mapRows(agingRows, (row) => {
    const label = readString(row, ["bucket", "label", "rango"], [["bucket"], ["rango"]]);
    const value = readNumber(row, ["amount", "balance", "valor"], [["amount"], ["saldo"], ["total"]]);
    return { label, value } satisfies FinancialAgingBucket;
  });

  const collections = mapRows(collectionsRows, (row) => {
    const label = readString(row, ["date", "fecha", "period"], [["dia"], ["fecha"], ["period"]]);
    const value = readNumber(row, ["amount", "monto", "total"], [["amount"], ["monto"], ["total"]]);
    return { label, value } satisfies FinancialCollectionPoint;
  });

  const debtors = mapRows(debtRows, (row) => {
    const student = readString(row, ["student", "nombre"], [["student"], ["nombre"]]);
    const amount = readNumber(row, ["amount", "balance", "saldo"], [["amount"], ["saldo"]]);
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

export async function getPersonnelReport(sql: SqlClient = getSqlClient()): Promise<PersonnelReport> {
  const [mixRows, coverageRows, loadRows] = await Promise.all([
    safeRows(() => sql`SELECT * FROM mgmt.personnel_staffing_mix_v`, "mgmt.personnel_staffing_mix_v"),
    safeRows(() => sql`SELECT * FROM mgmt.personnel_peak_load_coverage_v`, "mgmt.personnel_peak_load_coverage_v"),
    safeRows(() => sql`SELECT * FROM mgmt.personnel_student_load_v`, "mgmt.personnel_student_load_v"),
  ]);

  const staffingMix = mapRows(mixRows, (row) => {
    const hour = readString(row, ["hour", "hora"], [["hour"], ["hora"]]);
    const students = readNumber(row, ["students", "student_minutes", "alumnos"], [["student"], ["alumno"]]);
    const staff = readNumber(row, ["staff", "staff_minutes", "personal"], [["staff"], ["personal"]]);
    return { hour, students, staff } satisfies PersonnelMix;
  });

  const coverage = mapRows(coverageRows, (row) => {
    const area = readString(row, ["area", "zona"], [["area"], ["zona"]]);
    const status = readString(row, ["status", "descripcion"], [["status"], ["desc"]]);
    const riskLevel = readString(row, ["risk_level", "riesgo"], [["risk"], ["riesgo"]]);
    return { area, status, riskLevel } satisfies PersonnelCoverage;
  });

  const studentLoad = mapRows(loadRows, (row) => {
    const hour = readString(row, ["hour", "hora"], [["hour"], ["hora"]]);
    const value = readNumber(row, ["load", "students_per_teacher", "valor"], [["load"], ["students"], ["alumno"]]);
    return { hour, value } satisfies PersonnelLoadPoint;
  });

  return { staffingMix, coverage, studentLoad };
}
