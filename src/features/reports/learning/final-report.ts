import { getSqlClient, normalizeRows } from "@/lib/db/client";
import type {
  AtRiskLearnerRow,
  DaysInLevelRow,
  LearningReportResponse,
  LeiTrendPoint,
  LeiTrendSeries,
  StuckHeatmapCell,
  TopLearnerRow,
  VelocityLevelCard,
  VelocitySparklinePoint,
} from "@/types/reports.learning";

const MAX_WEEKS = 16;
const VELOCITY_WINDOW = 8;

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  const str = String(value);
  return str.length ? str : fallback;
}

function logViewError(viewName: string, error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  console.warn(`[LearningReport] ${viewName} unavailable.`, message);
}

type SqlClient = ReturnType<typeof getSqlClient>;

async function loadOrFallback<T>(
  label: string,
  loader: () => Promise<T>,
  fallbackValue: T,
  fallbackReasons: string[],
): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    logViewError(label, error);
    fallbackReasons.push(label);
    return fallbackValue;
  }
}

type LeiTrendRow = {
  week_start: string;
  level: string;
  avg_lei: number | null;
  total_lessons: number | null;
};

async function fetchLeiTrend(
  sql: SqlClient,
  fallbackReasons: string[],
): Promise<{ series: LeiTrendSeries; rows: LeiTrendRow[] }> {
  const rows = await loadOrFallback<LeiTrendRow[]>(
    "final.learning_lei_trend_weekly_mv",
    async () => {
      const results = normalizeRows<Partial<LeiTrendRow>>(await sql`
        SELECT
          week_start::date AS week_start,
          level::text AS level,
          avg_lei::numeric AS avg_lei,
          total_lessons::numeric AS total_lessons
        FROM final.learning_lei_trend_weekly_mv
        WHERE week_start >= (CURRENT_DATE - INTERVAL '24 weeks')
        ORDER BY week_start
      `);
      return results.map((row) => ({
        week_start: toString(row.week_start),
        level: toString(row.level),
        avg_lei: row.avg_lei === null || row.avg_lei === undefined ? null : Number(row.avg_lei),
        total_lessons:
          row.total_lessons === null || row.total_lessons === undefined
            ? null
            : Number(row.total_lessons),
      }));
    },
    [],
    fallbackReasons,
  );

  const trimmedRows = rows.slice(-MAX_WEEKS);
  const byLevel: Record<string, LeiTrendPoint[]> = {};
  const overallMap = new Map<string, { sum: number; count: number }>();

  trimmedRows.forEach((row) => {
    if (!byLevel[row.level]) {
      byLevel[row.level] = [];
    }
    byLevel[row.level].push({
      level: row.level,
      weekStart: row.week_start,
      avgLei: row.avg_lei ?? 0,
      totalLessons: row.total_lessons ?? 0,
    });

    if (row.avg_lei !== null && row.avg_lei !== undefined) {
      const entry = overallMap.get(row.week_start) ?? { sum: 0, count: 0 };
      entry.sum += row.avg_lei;
      entry.count += 1;
      overallMap.set(row.week_start, entry);
    }
  });

  const overall = Array.from(overallMap.entries())
    .map(([weekStart, bucket]) => ({
      weekStart,
      avgLei: bucket.count ? bucket.sum / bucket.count : 0,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .slice(-MAX_WEEKS);

  return { series: { overall, byLevel }, rows: trimmedRows };
}

type RawLearnerRow = {
  student_id: number;
  level: string;
  lei_30d: number | null;
  lessons_this_week: number | null;
  full_name: string | null;
  photo_url: string | null;
};

async function fetchTopLearners(sql: SqlClient, fallbackReasons: string[]): Promise<TopLearnerRow[]> {
  const rows = await loadOrFallback<RawLearnerRow[]>(
    "final.learning_lei_student_30d_mv",
    async () => {
      const results = normalizeRows<Partial<RawLearnerRow>>(await sql`
        SELECT
          mv.student_id,
          mv.level::text AS level,
          mv.lei_30d::numeric AS lei_30d,
          mv.lessons_this_week::numeric AS lessons_this_week,
          s.full_name,
          s.photo_url
        FROM final.learning_lei_student_30d_mv mv
        LEFT JOIN public.students s ON s.id = mv.student_id
        WHERE mv.lei_30d IS NOT NULL
      `);
      return results.map((row) => ({
        student_id: toNumber(row.student_id),
        level: toString(row.level, ""),
        lei_30d: row.lei_30d === null || row.lei_30d === undefined ? null : Number(row.lei_30d),
        lessons_this_week:
          row.lessons_this_week === null || row.lessons_this_week === undefined
            ? null
            : Number(row.lessons_this_week),
        full_name: row.full_name === null || row.full_name === undefined ? null : String(row.full_name),
        photo_url: row.photo_url === null || row.photo_url === undefined ? null : String(row.photo_url),
      }));
    },
    [],
    fallbackReasons,
  );

  const grouped = new Map<string, TopLearnerRow[]>();

  rows.forEach((row) => {
    if (row.lei_30d === null) return;
    const normalized: TopLearnerRow = {
      studentId: row.student_id,
      level: row.level,
      lei30d: row.lei_30d,
      lessonsThisWeek: row.lessons_this_week ?? 0,
      fullName: row.full_name ?? "Sin nombre",
      photoUrl: row.photo_url,
    };
    if (!grouped.has(row.level)) {
      grouped.set(row.level, []);
    }
    grouped.get(row.level)!.push(normalized);
  });

  const topLearners: TopLearnerRow[] = [];
  grouped.forEach((list) => {
    const sorted = list.sort((a, b) => b.lei30d - a.lei30d);
    const limit = Math.max(1, Math.ceil(sorted.length * 0.1));
    topLearners.push(...sorted.slice(0, limit));
  });

  return topLearners.sort((a, b) => b.lei30d - a.lei30d);
}

type InactivityRow = {
  student_id: number;
  days_since_last_visit: number | null;
};

async function fetchInactivityMap(sql: SqlClient, fallbackReasons: string[]): Promise<Map<number, number>> {
  const rows = await loadOrFallback<InactivityRow[]>(
    "final.engagement_inactivity_buckets_mv",
    async () => {
      const results = normalizeRows<Partial<InactivityRow>>(await sql`
        WITH latest AS (
          SELECT MAX(as_of_date) AS as_of_date FROM final.engagement_inactivity_buckets_mv
        )
        SELECT b.student_id, b.days_since_last_visit::int AS days_since_last_visit
        FROM final.engagement_inactivity_buckets_mv b
        JOIN latest l ON b.as_of_date = l.as_of_date
      `);
      return results.map((row) => ({
        student_id: toNumber(row.student_id),
        days_since_last_visit:
          row.days_since_last_visit === null || row.days_since_last_visit === undefined
            ? null
            : Number(row.days_since_last_visit),
      }));
    },
    [],
    fallbackReasons,
  );

  const map = new Map<number, number>();
  rows.forEach((row) => {
    if (row.days_since_last_visit === null) return;
    map.set(row.student_id, row.days_since_last_visit);
  });
  return map;
}

function recommendAction(lei: number, daysSince: number | null): string {
  if (daysSince !== null && daysSince >= 30) return "Visita urgente";
  if (lei < 0.7) return "Coaching 1:1";
  if (daysSince !== null && daysSince >= 14) return "Llamar esta semana";
  return "Seguimiento";
}

async function fetchBottomLearners(
  sql: SqlClient,
  inactivity: Map<number, number>,
  fallbackReasons: string[],
): Promise<AtRiskLearnerRow[]> {
  const rows = await loadOrFallback<RawLearnerRow[]>(
    "final.learning_lei_student_30d_mv",
    async () => {
      const results = normalizeRows<Partial<RawLearnerRow>>(await sql`
        SELECT
          mv.student_id,
          mv.level::text AS level,
          mv.lei_30d::numeric AS lei_30d,
          mv.lessons_this_week::numeric AS lessons_this_week,
          s.full_name,
          s.photo_url
        FROM final.learning_lei_student_30d_mv mv
        LEFT JOIN public.students s ON s.id = mv.student_id
        WHERE mv.lei_30d IS NOT NULL
      `);
      return results.map((row) => ({
        student_id: toNumber(row.student_id),
        level: toString(row.level, ""),
        lei_30d: row.lei_30d === null || row.lei_30d === undefined ? null : Number(row.lei_30d),
        lessons_this_week:
          row.lessons_this_week === null || row.lessons_this_week === undefined
            ? null
            : Number(row.lessons_this_week),
        full_name: row.full_name === null || row.full_name === undefined ? null : String(row.full_name),
        photo_url: row.photo_url === null || row.photo_url === undefined ? null : String(row.photo_url),
      }));
    },
    [],
    fallbackReasons,
  );

  const grouped = new Map<string, AtRiskLearnerRow[]>();
  rows.forEach((row) => {
    if (row.lei_30d === null) return;
    const daysSince = inactivity.get(row.student_id) ?? null;
    const learner: AtRiskLearnerRow = {
      studentId: row.student_id,
      fullName: row.full_name ?? "Sin nombre",
      level: row.level,
      lei30d: row.lei_30d,
      daysSinceLastVisit: daysSince,
      recommendedAction: recommendAction(row.lei_30d, daysSince),
    };
    if (!grouped.has(row.level)) {
      grouped.set(row.level, []);
    }
    grouped.get(row.level)!.push(learner);
  });

  const atRisk: AtRiskLearnerRow[] = [];
  grouped.forEach((list) => {
    const sorted = list.sort((a, b) => a.lei30d - b.lei30d);
    const limit = Math.max(1, Math.ceil(sorted.length * 0.2));
    atRisk.push(...sorted.slice(0, limit));
  });

  return atRisk.sort((a, b) => a.lei30d - b.lei30d);
}

type RawDaysInLevelRow = {
  level: string;
  median_days_in_level: number | null;
  student_count: number | null;
  avg_days_in_level: number | null;
};

async function fetchDaysInLevel(sql: SqlClient, fallbackReasons: string[]): Promise<DaysInLevelRow[]> {
  const rows = await loadOrFallback<RawDaysInLevelRow[]>(
    "final.learning_days_in_level_mv",
    async () => {
      const results = normalizeRows<Partial<RawDaysInLevelRow>>(await sql`
        SELECT
          level::text AS level,
          median_days_in_level::numeric AS median_days_in_level,
          avg_days_in_level::numeric AS avg_days_in_level,
          student_count::int AS student_count
        FROM final.learning_days_in_level_mv
      `);
      return results.map((row) => ({
        level: toString(row.level),
        median_days_in_level:
          row.median_days_in_level === null || row.median_days_in_level === undefined
            ? null
            : Number(row.median_days_in_level),
        avg_days_in_level:
          row.avg_days_in_level === null || row.avg_days_in_level === undefined
            ? null
            : Number(row.avg_days_in_level),
        student_count:
          row.student_count === null || row.student_count === undefined
            ? null
            : Number(row.student_count),
      }));
    },
    [],
    fallbackReasons,
  );

  return rows.map((row) => ({
    level: row.level,
    medianDays: row.median_days_in_level ?? 0,
    avgDays: row.avg_days_in_level ?? 0,
    studentCount: row.student_count ?? 0,
  }));
}

type RawHeatmapRow = {
  level: string;
  lesson_id: number | null;
  lesson_label: string | null;
  stuck_count: number | null;
};

async function fetchStuckHeatmap(sql: SqlClient, fallbackReasons: string[]): Promise<StuckHeatmapCell[]> {
  const rows = await loadOrFallback<RawHeatmapRow[]>(
    "final.learning_stuck_lessons_heatmap_mv",
    async () => {
      const results = normalizeRows<Partial<RawHeatmapRow>>(await sql`
        SELECT
          level::text AS level,
          lesson_id::int AS lesson_id,
          lesson_label::text AS lesson_label,
          stuck_count::int AS stuck_count
        FROM final.learning_stuck_lessons_heatmap_mv
      `);
      return results.map((row) => ({
        level: toString(row.level),
        lesson_id: row.lesson_id === null || row.lesson_id === undefined ? null : Number(row.lesson_id),
        lesson_label: row.lesson_label === null || row.lesson_label === undefined ? null : String(row.lesson_label),
        stuck_count: row.stuck_count === null || row.stuck_count === undefined ? null : Number(row.stuck_count),
      }));
    },
    [],
    fallbackReasons,
  );

  return rows
    .filter(
      (row): row is RawHeatmapRow & { lesson_id: number; lesson_label: string; stuck_count: number } =>
        row.lesson_id !== null && row.lesson_label !== null && row.stuck_count !== null,
    )
    .map((row) => ({
      level: row.level,
      lessonId: row.lesson_id,
      lessonLabel: row.lesson_label,
      stuckCount: row.stuck_count,
    }));
}

function buildVelocityCards(rows: LeiTrendRow[]): VelocityLevelCard[] {
  const grouped = new Map<string, LeiTrendRow[]>();
  rows.forEach((row) => {
    if (!grouped.has(row.level)) {
      grouped.set(row.level, []);
    }
    grouped.get(row.level)!.push(row);
  });

  const cards: VelocityLevelCard[] = [];

  grouped.forEach((values, level) => {
    const sorted = values
      .slice()
      .sort((a, b) => a.week_start.localeCompare(b.week_start))
      .slice(-VELOCITY_WINDOW);
    const lessonsSeries: VelocitySparklinePoint[] = sorted.map((row) => ({
      weekStart: row.week_start,
      lessons: row.total_lessons ?? 0,
    }));
    const lessonsPerWeek = lessonsSeries.length
      ? lessonsSeries.reduce((sum, point) => sum + point.lessons, 0) / lessonsSeries.length
      : 0;

    const firstHalf = lessonsSeries.slice(0, Math.max(1, Math.floor(lessonsSeries.length / 2)));
    const secondHalf = lessonsSeries.slice(-Math.max(1, Math.floor(lessonsSeries.length / 2)));
    const firstAvg = firstHalf.length
      ? firstHalf.reduce((sum, point) => sum + point.lessons, 0) / firstHalf.length
      : 0;
    const secondAvg = secondHalf.length
      ? secondHalf.reduce((sum, point) => sum + point.lessons, 0) / secondHalf.length
      : 0;

    let trend: VelocityLevelCard["trend"] = "flat";
    if (secondAvg > firstAvg * 1.05) {
      trend = "up";
    } else if (secondAvg < firstAvg * 0.95) {
      trend = "down";
    }

    cards.push({
      level,
      lessonsPerWeek,
      trend,
      sparkline: lessonsSeries,
    });
  });

  return cards.sort((a, b) => a.level.localeCompare(b.level, "es", { numeric: true }));
}

export async function buildLearningReport(): Promise<LearningReportResponse> {
  const sql = getSqlClient();
  const fallbackReasons: string[] = [];

  const leiTrendResult = await fetchLeiTrend(sql, fallbackReasons);
  const inactivityMap = await fetchInactivityMap(sql, fallbackReasons);
  const [top10, bottom20, daysInLevel, stuckHeatmap] = await Promise.all([
    fetchTopLearners(sql, fallbackReasons),
    fetchBottomLearners(sql, inactivityMap, fallbackReasons),
    fetchDaysInLevel(sql, fallbackReasons),
    fetchStuckHeatmap(sql, fallbackReasons),
  ]);

  const velocityByLevel = buildVelocityCards(leiTrendResult.rows);

  const uniqueFallbacks = [...new Set(fallbackReasons)];

  return {
    lastRefreshedAt: new Date().toISOString(),
    fallback: uniqueFallbacks.length > 0,
    fallbackReasons: uniqueFallbacks,
    leiTrend: leiTrendResult.series,
    top10,
    bottom20,
    daysInLevel,
    stuckHeatmap,
    velocityByLevel,
  };
}
