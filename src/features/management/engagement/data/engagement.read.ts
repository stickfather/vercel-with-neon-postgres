import { cache } from "react";

import { getSqlClient, normalizeRows } from "@/lib/db/client";
import type {
  ArrivalRow,
  EngagementFilters,
  HeatmapCell,
  HourTrendRow,
  SegmentMemberRow,
  SegmentSummaryRow,
  StudentProfile,
  StudentSegmentRow,
  StudentTimeProfileRow,
  UtilizationAvgRow,
  UtilizationTodayRow,
} from "@/types/management.engagement";

const tableColumnsCache = new Map<string, Promise<Set<string>>>();

function cacheKey(schema: string, table: string): string {
  return `${schema}.${table}`;
}

async function getTableColumns(schema: string, table: string): Promise<Set<string>> {
  const key = cacheKey(schema, table);
  if (!tableColumnsCache.has(key)) {
    const sql = getSqlClient();
    tableColumnsCache.set(
      key,
      (async () => {
        const rows = normalizeRows<{ column_name?: unknown }>(
          await sql`SELECT column_name FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = ${table}`,
        );
        const columns = new Set<string>();
        rows.forEach((row) => {
          if (!row) return;
          const name = row.column_name;
          if (typeof name === "string" && name.length) {
            columns.add(name);
          }
        });
        return columns;
      })(),
    );
  }
  return tableColumnsCache.get(key)!;
}

function normalizeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function normalizeDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

type FilterClause = {
  clause: string;
  values: unknown[];
  nextIndex: number;
};

const STUDENT_FILTER_CANDIDATES: Record<keyof EngagementFilters, string[]> = {
  level: ["level", "current_level", "level_code", "levelname"],
  coach: ["coach", "coach_id", "coach_name", "primary_coach_id"],
  plan: ["plan", "plan_id", "plan_code", "planname"],
  campus: ["campus", "campus_id", "campus_code", "campusname"],
  date: [],
};

function pickColumn(columns: Set<string>, candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (columns.has(candidate)) return candidate;
  }
  return null;
}

function buildColumnFilterClause(
  filters: EngagementFilters,
  availableColumns: Set<string>,
  alias: string,
  startIndex = 1,
): FilterClause {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let index = startIndex;

  (Object.entries(filters) as Array<[keyof EngagementFilters, string | null | undefined]>).forEach(([key, rawValue]) => {
    if (!rawValue || key === "date") return;
    const candidates = STUDENT_FILTER_CANDIDATES[key];
    const column = pickColumn(availableColumns, candidates);
    if (!column) return;
    const reference = `${alias}."${column}"`;
    conditions.push(`COALESCE(${reference}::text, '') = $${index}`);
    values.push(rawValue);
    index += 1;
  });

  return {
    clause: conditions.join(" AND "),
    values,
    nextIndex: index,
  };
}

async function buildStudentFilterClause(
  filters: EngagementFilters,
  startIndex = 1,
): Promise<FilterClause> {
  if (!filters.level && !filters.coach && !filters.plan && !filters.campus) {
    return { clause: "", values: [], nextIndex: startIndex };
  }
  const studentColumns = await getTableColumns("public", "students");
  return buildColumnFilterClause(filters, studentColumns, "s", startIndex);
}

function mapUtilizationTodayRow(row: Partial<UtilizationTodayRow>): UtilizationTodayRow {
  return {
    slot_start: normalizeDateString(row.slot_start),
    hour: normalizeNumber(row.hour),
    minute: normalizeNumber(row.minute),
    concurrent_sessions: normalizeNumber(row.concurrent_sessions),
    arrivals: normalizeNumber(row.arrivals),
    active_minutes_in_slot: normalizeNumber(row.active_minutes_in_slot),
  };
}

export async function fetchUtilizationToday(
  filters: EngagementFilters = {},
): Promise<UtilizationTodayRow[]> {
  const sql = getSqlClient();
  const viewColumns = await getTableColumns("mgmt", "engagement_utilization_today");
  const hasStudentId = viewColumns.has("student_id");

  const viewClause = buildColumnFilterClause(filters, viewColumns, "t");
  const studentClause = hasStudentId ? await buildStudentFilterClause(filters, viewClause.nextIndex) : { clause: "", values: [], nextIndex: viewClause.nextIndex };

  const shouldJoinStudents = hasStudentId && studentClause.values.length > 0;
  const conditions = [viewClause.clause, studentClause.clause].filter(Boolean);
  const whereClause = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const joinClause = shouldJoinStudents ? " JOIN public.students s ON s.id = t.student_id" : "";
  const query =
    "SELECT t.slot_start, t.hour, t.minute, t.concurrent_sessions, t.arrivals, t.active_minutes_in_slot " +
    "FROM mgmt.engagement_utilization_today t" +
    joinClause +
    whereClause +
    " ORDER BY t.slot_start";

  const rows = normalizeRows<Partial<UtilizationTodayRow>>(
    await sql.query(query, [...viewClause.values, ...studentClause.values]),
  );
  return rows.map(mapUtilizationTodayRow);
}

export async function fetchUtilizationAverage(
  filters: EngagementFilters = {},
): Promise<UtilizationAvgRow[]> {
  const sql = getSqlClient();
  const viewColumns = await getTableColumns("mgmt", "engagement_utilization_avg30d");
  const viewClause = buildColumnFilterClause(filters, viewColumns, "t");

  const whereClause = viewClause.clause ? ` WHERE ${viewClause.clause}` : "";
  const query =
    "SELECT t.hour, t.minute, t.avg_concurrent " +
    "FROM mgmt.engagement_utilization_avg30d t" +
    whereClause +
    " ORDER BY t.hour, t.minute";

  const rows = normalizeRows<Partial<UtilizationAvgRow>>(
    await sql.query(query, viewClause.values),
  );
  return rows.map((row) => ({
    hour: normalizeNumber(row.hour),
    minute: normalizeNumber(row.minute),
    avg_concurrent: normalizeNumber(row.avg_concurrent),
  }));
}

export async function fetchHeatmap(
  filters: EngagementFilters = {},
): Promise<HeatmapCell[]> {
  const sql = getSqlClient();
  const viewColumns = await getTableColumns("mgmt", "engagement_heatmap_dow_hour");
  const hasStudentId = viewColumns.has("student_id");
  const viewClause = buildColumnFilterClause(filters, viewColumns, "t");
  const studentClause = hasStudentId ? await buildStudentFilterClause(filters, viewClause.nextIndex) : { clause: "", values: [], nextIndex: viewClause.nextIndex };
  const shouldJoinStudents = hasStudentId && studentClause.values.length > 0;

  const conditions = [viewClause.clause, studentClause.clause].filter(Boolean);
  const whereClause = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const joinClause = shouldJoinStudents ? " JOIN public.students s ON s.id = t.student_id" : "";

  const query =
    "SELECT t.dow, t.hour, t.avg_concurrent, t.total_arrivals, t.avg_active_minutes_in_slot " +
    "FROM mgmt.engagement_heatmap_dow_hour t" +
    joinClause +
    whereClause +
    " ORDER BY t.dow, t.hour";

  const rows = normalizeRows<Partial<HeatmapCell>>(
    await sql.query(query, [...viewClause.values, ...studentClause.values]),
  );
  return rows.map((row) => ({
    dow: normalizeNumber(row.dow),
    hour: normalizeNumber(row.hour),
    avg_concurrent: normalizeNumber(row.avg_concurrent),
    total_arrivals: normalizeNumber(row.total_arrivals),
    avg_active_minutes_in_slot: normalizeNumber(row.avg_active_minutes_in_slot),
  }));
}

export async function fetchArrivalsToday(
  filters: EngagementFilters = {},
): Promise<ArrivalRow[]> {
  const sql = getSqlClient();
  const viewColumns = await getTableColumns("mgmt", "engagement_arrivals_today");
  const hasStudentId = viewColumns.has("student_id");
  const viewClause = buildColumnFilterClause(filters, viewColumns, "t");
  const studentClause = hasStudentId ? await buildStudentFilterClause(filters, viewClause.nextIndex) : { clause: "", values: [], nextIndex: viewClause.nextIndex };
  const shouldJoinStudents = hasStudentId && studentClause.values.length > 0;

  const conditions = [viewClause.clause, studentClause.clause].filter(Boolean);
  const whereClause = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const joinClause = shouldJoinStudents ? " JOIN public.students s ON s.id = t.student_id" : "";

  const query =
    "SELECT t.slot_start, t.hour, t.minute, t.arrivals " +
    "FROM mgmt.engagement_arrivals_today t" +
    joinClause +
    whereClause +
    " ORDER BY t.slot_start";

  const rows = normalizeRows<Partial<ArrivalRow>>(
    await sql.query(query, [...viewClause.values, ...studentClause.values]),
  );
  return rows.map((row) => ({
    slot_start: normalizeDateString(row.slot_start),
    hour: normalizeNumber(row.hour),
    minute: normalizeNumber(row.minute),
    arrivals: normalizeNumber(row.arrivals),
  }));
}

export async function fetchSegmentSummary(
  filters: EngagementFilters = {},
): Promise<SegmentSummaryRow[]> {
  const sql = getSqlClient();
  const viewColumns = await getTableColumns("mgmt", "engagement_segment_summary");
  const hasStudentId = viewColumns.has("student_id");
  const viewClause = buildColumnFilterClause(filters, viewColumns, "t");
  const studentClause = hasStudentId ? await buildStudentFilterClause(filters, viewClause.nextIndex) : { clause: "", values: [], nextIndex: viewClause.nextIndex };
  const shouldJoinStudents = hasStudentId && studentClause.values.length > 0;

  const conditions = [viewClause.clause, studentClause.clause].filter(Boolean);
  const whereClause = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const joinClause = shouldJoinStudents ? " JOIN public.students s ON s.id = t.student_id" : "";

  const query =
    "SELECT t.primary_segment, t.students, t.avg_sessions_per_week, t.avg_minutes_per_session, t.avg_concentration_index, t.avg_segment_health_score " +
    "FROM mgmt.engagement_segment_summary t" +
    joinClause +
    whereClause +
    " ORDER BY t.students DESC, t.avg_segment_health_score DESC";

  const rows = normalizeRows<Partial<SegmentSummaryRow>>(
    await sql.query(query, [...viewClause.values, ...studentClause.values]),
  );
  return rows.map((row) => ({
    primary_segment: normalizeString(row.primary_segment),
    students: normalizeNumber(row.students),
    avg_sessions_per_week: normalizeNumber(row.avg_sessions_per_week),
    avg_minutes_per_session: normalizeNumber(row.avg_minutes_per_session),
    avg_concentration_index: normalizeNumber(row.avg_concentration_index),
    avg_segment_health_score: normalizeNumber(row.avg_segment_health_score),
  }));
}

function mapSegmentMember(row: Partial<SegmentMemberRow>): SegmentMemberRow {
  return {
    student_id: normalizeNumber(row.student_id),
    primary_segment: normalizeString(row.primary_segment),
    sessions_per_week: normalizeNumber(row.sessions_per_week),
    avg_minutes_30d: normalizeNumber(row.avg_minutes_30d),
    concentration_index: normalizeNumber(row.concentration_index),
    segment_health_score: normalizeNullableNumber(row.segment_health_score),
    recency_norm: normalizeNullableNumber(row.recency_norm),
    freq_norm: normalizeNullableNumber(row.freq_norm),
    intensity_norm: normalizeNullableNumber(row.intensity_norm),
    concentration_norm: normalizeNullableNumber(row.concentration_norm),
  };
}

export async function fetchSegmentMembers(
  primarySegment: string,
  filters: EngagementFilters = {},
): Promise<SegmentMemberRow[]> {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<SegmentMemberRow>>(
    await sql`
      SELECT sc.student_id,
             sc.primary_segment,
             sc.sessions_per_week,
             sc.avg_minutes_30d,
             sc.concentration_index,
             sh.segment_health_score,
             sh.recency_norm,
             sh.freq_norm,
             sh.intensity_norm,
             sh.concentration_norm
      FROM mgmt.engagement_segments_current sc
      LEFT JOIN mgmt.engagement_segment_health sh
        ON sh.student_id = sc.student_id AND sh.primary_segment = sc.primary_segment
      WHERE sc.primary_segment = ${primarySegment}
      ORDER BY sh.segment_health_score DESC NULLS LAST
      LIMIT 500
    `,
  );
  return rows.map(mapSegmentMember);
}

export async function fetchStudentProfile(studentId: number): Promise<StudentProfile | null> {
  const sql = getSqlClient();
  const segmentRows = normalizeRows<Partial<StudentSegmentRow>>(
    await sql`
      SELECT sc.student_id,
             sc.primary_segment,
             sc.sessions_per_week,
             sc.avg_minutes_30d,
             sc.concentration_index,
             sc.days_since_last,
             sc.distinct_hours_30d,
             sh.segment_health_score,
             sh.recency_norm,
             sh.freq_norm,
             sh.intensity_norm,
             sh.concentration_norm
      FROM mgmt.engagement_segments_current sc
      LEFT JOIN mgmt.engagement_segment_health sh
        ON sh.student_id = sc.student_id AND sh.primary_segment = sc.primary_segment
      WHERE sc.student_id = ${studentId}
      LIMIT 1
    `,
  );

  const segment = segmentRows.length ? mapSegmentMember(segmentRows[0]) : null;
  const studentSegment: StudentSegmentRow | null = segment
    ? {
        ...segment,
        days_since_last: normalizeNullableNumber(segmentRows[0]?.days_since_last),
        distinct_hours_30d: normalizeNullableNumber(segmentRows[0]?.distinct_hours_30d),
      }
    : null;

  const timeRows = normalizeRows<Partial<StudentTimeProfileRow>>(
    await sql`
      SELECT preferred_hour, concentration_index
      FROM mgmt.engagement_student_time_profile
      WHERE student_id = ${studentId}
      LIMIT 1
    `,
  );

  const timeProfile = timeRows.length
    ? {
        preferred_hour: normalizeNullableNumber(timeRows[0]?.preferred_hour),
        concentration_index: normalizeNullableNumber(timeRows[0]?.concentration_index),
      }
    : null;

  if (!studentSegment && !timeProfile) return null;

  return {
    segment: studentSegment,
    timeProfile,
  };
}

export const fetchHourTrend = cache(async (hour: number): Promise<HourTrendRow[]> => {
  const sql = getSqlClient();
  const rows = normalizeRows<Partial<HourTrendRow>>(
    await sql`
      SELECT slot_start, avg_concurrent, total_arrivals
      FROM mgmt.engagement_timegrid_60d
      WHERE hour = ${hour}
      ORDER BY slot_start
      LIMIT 600
    `,
  );
  return rows.map((row) => ({
    slot_start: normalizeDateString(row.slot_start),
    avg_concurrent: normalizeNumber(row.avg_concurrent),
    total_arrivals: normalizeNumber(row.total_arrivals),
  }));
});
