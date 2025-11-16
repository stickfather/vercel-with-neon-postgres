import {
  getSqlClient,
  isMissingRelationError,
  normalizeRows,
  type SqlRow,
} from "@/lib/db/client";
import type {
  ActiveSummary,
  AvgDaysBetweenVisits,
  DeclinePoint,
  EngagementReportResponse,
  FrequencyScore,
  HourHeatmapByDay,
  InactivityTables,
  ZeroAttendanceRow,
} from "@/types/reports.engagement";

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function readValue(row: SqlRow | null, keys: string[]): unknown {
  if (!row) return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }
  return undefined;
}

function normalizeBucket(value: unknown): InactivityTables[keyof InactivityTables][number]["inactivityBucket"] {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("180")) return "long_term_inactive_180d";
  if (normalized.includes("30")) return "dormant_30d";
  if (normalized.includes("14")) return "inactive_14d";
  return "inactive_7d";
}

function emptySummary(): ActiveSummary {
  return {
    last7d: { count: 0, changePct: null },
    last14d: { count: 0, changePct: null },
    last30d: { count: 0, changePct: null },
    last180d: { count: 0, changePct: null },
  };
}

function emptyInactivityTables(): InactivityTables {
  return {
    inactive7d: [],
    inactive14d: [],
    dormant30d: [],
    longTerm180d: [],
  };
}

function emptyAvgGap(): AvgDaysBetweenVisits {
  return { value: null };
}

function emptyFrequency(): FrequencyScore {
  return { sessionsPerWeek: null, targetSessionsPerWeek: null, sparkline: [] };
}

function safeSparkline(value: unknown): number[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry))
      .map((entry) => Number(entry));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry))
          .map((entry) => Number(entry));
      }
    } catch (error) {
      console.warn("No pudimos parsear sparkline", error);
    }
    return value
      .split(",")
      .map((entry) => Number(entry.trim()))
      .filter((entry) => Number.isFinite(entry));
  }
  return [];
}

export async function getEngagementReport(): Promise<EngagementReportResponse> {
  const sql = getSqlClient();
  const fallbackReasons: string[] = [];
  let fallback = false;

  async function safeQuery<T>(label: string, fallbackValue: T, query: () => Promise<T>): Promise<T> {
    try {
      return await query();
    } catch (error) {
      fallback = true;
      if (isMissingRelationError(error, label)) {
        console.warn(`Vista no encontrada: ${label}`);
        fallbackReasons.push(`Vista faltante: ${label}`);
        return fallbackValue;
      }
      console.error(`Error en consulta ${label}`, error);
      fallbackReasons.push(`Error al consultar ${label}`);
      return fallbackValue;
    }
  }

  const activeRows = await safeQuery<SqlRow[]>(
    "final.engagement_active_counts_mv",
    [],
    async () =>
      normalizeRows(
        await sql`
          SELECT
            as_of_date::text AS as_of_date,
            active_7d,
            active_14d,
            active_30d,
            active_180d
          FROM final.engagement_active_counts_mv
          ORDER BY as_of_date DESC
          LIMIT 2
        `,
      ),
  );

  const inactivityRows = await safeQuery<SqlRow[]>(
    "final.engagement_inactivity_buckets_mv",
    [],
    async () =>
      normalizeRows(
        await sql`
          SELECT
            student_id,
            student_name,
            student_status,
            student_archived,
            last_visit_day::text AS last_visit_day,
            days_since_last_visit,
            inactivity_bucket
          FROM final.engagement_inactivity_buckets_mv
        `,
      ),
  );

  const visitGapRows = await safeQuery<SqlRow[]>(
    "final.engagement_visit_gaps_mv",
    [],
    async () =>
      normalizeRows(
        await sql`
          SELECT
            AVG(avg_gap_days)::numeric(10, 2) AS avg_gap_days
          FROM final.engagement_visit_gaps_mv
        `,
      ),
  );

  const declineRows = await safeQuery<SqlRow[]>(
    "final.engagement_decline_index_mv",
    [],
    async () =>
      normalizeRows(
        await sql`
          SELECT
            week_start::text AS week_start,
            active_students,
            total_minutes,
            prev_active_students,
            prev_total_minutes,
            pct_change_active_students,
            pct_change_total_minutes
          FROM final.engagement_decline_index_mv
          ORDER BY week_start DESC
          LIMIT 8
        `,
      ),
  );

  const hourlyHeatmapRows = await safeQuery<SqlRow[]>(
    "final.engagement_hour_heatmap_mv",
    [],
    async () =>
      normalizeRows(
        await sql`
          SELECT weekday_index, hour_24, total_minutes_90d
          FROM final.engagement_hour_heatmap_mv
          WHERE hour_24 BETWEEN 8 AND 20
          ORDER BY weekday_index, hour_24
        `,
      ),
  );

  const zeroAttendanceRows = await safeQuery<SqlRow[]>(
    "final.engagement_zero_attendance_v",
    [],
    async () =>
      normalizeRows(
        await sql`
          SELECT
            student_id,
            student_name,
            student_status,
            student_archived,
            contract_start::text AS contract_start,
            representative_name,
            representative_phone,
            representative_email
          FROM final.engagement_zero_attendance_v
          ORDER BY contract_start NULLS LAST
          LIMIT 50
        `,
      ),
  );

  const frequencyRows = await safeQuery<SqlRow[]>(
    "final.engagement_frequency_score_mv",
    [],
    async () =>
      normalizeRows(
        await sql`
          SELECT
            AVG(sessions_per_week_approx)::numeric(10, 2) AS sessions_per_week_approx
          FROM final.engagement_frequency_score_mv
        `,
      ),
  );

  const summary = (() => {
    if (!activeRows.length) return emptySummary();
    const latest = activeRows[0];
    const previous = activeRows[1] ?? null;
    const computeChange = (keys: string[]) => {
      const currValue = toNumber(readValue(latest, keys));
      const prevValue = toNumber(readValue(previous, keys));
      if (prevValue <= 0) return { count: currValue, changePct: null };
      const change = ((currValue - prevValue) / prevValue) * 100;
      return { count: currValue, changePct: Number.isFinite(change) ? change : null };
    };

    return {
      last7d: computeChange(["active_7d", "active7d"]),
      last14d: computeChange(["active_14d", "active14d"]),
      last30d: computeChange(["active_30d", "active_30"]),
      last180d: computeChange(["active_180d", "active_6mo", "active_180"]),
    } satisfies ActiveSummary;
  })();

  const inactivityTables = (() => {
    if (!inactivityRows.length) return emptyInactivityTables();
    const tables = emptyInactivityTables();
    inactivityRows.forEach((row) => {
      const bucket = normalizeBucket(row.inactivity_bucket);
      const entry = {
        studentId: toNumber(row.student_id),
        fullName: toStringValue(row.student_name) || "Sin nombre",
        phone: null,
        daysSinceLastVisit: toNullableNumber(row.days_since_last_visit),
        inactivityBucket: bucket,
        lastVisitDate: row.last_visit_day ? String(row.last_visit_day) : null,
      };
      switch (bucket) {
        case "inactive_14d":
          tables.inactive14d.push(entry);
          break;
        case "dormant_30d":
          tables.dormant30d.push(entry);
          break;
        case "long_term_inactive_180d":
          tables.longTerm180d.push(entry);
          break;
        default:
          tables.inactive7d.push(entry);
      }
    });
    return tables;
  })();

  const avgGap: AvgDaysBetweenVisits = (() => {
    if (!visitGapRows.length) return emptyAvgGap();
    const row = visitGapRows[0];
    return { value: toNullableNumber(row.avg_gap_days) };
  })();

  const declineIndex: DeclinePoint[] = declineRows
    .slice()
    .reverse()
    .map((row) => ({
      weekStart: row.week_start ? String(row.week_start) : "",
      declineIndex: toNullableNumber(row.pct_change_active_students),
    }))
    .filter((point) => point.weekStart.length > 0);

  const hourlyHeatmap: HourHeatmapByDay = (() => {
    if (!hourlyHeatmapRows.length) {
      return {};
    }

    const byDay: HourHeatmapByDay = {};

    hourlyHeatmapRows.forEach((row) => {
      const weekdayIndex = toNumber(row.weekday_index, NaN);
      const hour24 = toNumber(row.hour_24, NaN);
      if (!Number.isFinite(weekdayIndex) || !Number.isFinite(hour24)) {
        return;
      }

      const minutes = toNumber(row.total_minutes_90d);
      if (!byDay[weekdayIndex]) {
        byDay[weekdayIndex] = [];
      }

      byDay[weekdayIndex].push({
        weekdayIndex,
        hour24,
        totalMinutes90d: minutes,
      });
    });

    Object.keys(byDay).forEach((key) => {
      const index = Number(key);
      byDay[index] = byDay[index].sort((a, b) => a.hour24 - b.hour24);
    });

    return byDay;
  })();

  const zeroAttendance: ZeroAttendanceRow[] = zeroAttendanceRows.map((row) => ({
    studentId: toNumber(row.student_id),
    fullName: toStringValue(row.student_name) || "Sin nombre",
    phone: row.representative_phone === null || row.representative_phone === undefined ? null : String(row.representative_phone),
    enrollmentDate: row.contract_start ? String(row.contract_start) : null,
  }));

  const frequencyScore: FrequencyScore = (() => {
    if (!frequencyRows.length) return emptyFrequency();
    const row = frequencyRows[0];
    return {
      sessionsPerWeek: toNullableNumber(row.sessions_per_week_approx),
      targetSessionsPerWeek: 3.0,
      sparkline: [],
    };
  })();

  return {
    lastRefreshedAt: new Date().toISOString(),
    fallback,
    fallbackReasons,
    activeSummary: summary,
    inactivityTables,
    avgDaysBetweenVisits: avgGap,
    declineIndex,
    hourlyHeatmap,
    zeroAttendance,
    frequencyScore,
  };
}
