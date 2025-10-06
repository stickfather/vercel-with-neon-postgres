import { cache } from "react";
import { createPanelGerencialClient } from "./client";

type MinutesByDayRow = {
  activity_date: string;
  total_minutes: number | null;
};

type DauWauRow = {
  d: string;
  dau: number | null;
  wau: number | null;
};

type ShortSessionRow = {
  activity_date: string;
  total_sessions: number | null;
  short_sessions: number | null;
  short_rate_pct: number | null;
};

type SegmentRow = {
  band: "green" | "amber" | "red";
  count: number | null;
};

type SegmentByLevelRow = {
  level_code: string;
  band: "green" | "amber" | "red";
  count: number | null;
};

type EngagementSnapshot = {
  median_active_days_per_week: number | null;
  p25_active_days_per_week: number | null;
  p75_active_days_per_week: number | null;
};

type EngagementData = {
  minutesByDay: MinutesByDayRow[];
  dauWauTrend: DauWauRow[];
  shortSessionTrend: ShortSessionRow[];
  segments: SegmentRow[];
  segmentsByLevel: SegmentByLevelRow[];
  snapshot: EngagementSnapshot | null;
};

async function fetchEngagementData(): Promise<EngagementData> {
  const sql = await createPanelGerencialClient();
  const rows = (await sql`
    WITH
      minutes_by_day AS (
        SELECT activity_date, total_minutes
        FROM analytics.v_minutes_by_day
        ORDER BY activity_date
      ),
      dau_wau AS (
        SELECT d, dau, wau
        FROM analytics.v_dau_wau_trend_90d
        ORDER BY d
      ),
      short_sessions AS (
        SELECT activity_date, total_sessions, short_sessions, short_rate_pct
        FROM analytics.v_short_session_trend_90d
        ORDER BY activity_date
      ),
      segments AS (
        SELECT band, count
        FROM analytics.v_engagement_segments
        ORDER BY band
      ),
      segments_by_level AS (
        SELECT level_code, band, count
        FROM analytics.v_engagement_segments_by_level
        ORDER BY level_code, band
      ),
      snapshot AS (
        SELECT median_active_days_per_week, p25_active_days_per_week, p75_active_days_per_week
        FROM analytics.v_engagement_snapshot
        LIMIT 1
      )
    SELECT
      COALESCE((SELECT json_agg(mb ORDER BY activity_date) FROM minutes_by_day mb), '[]'::json) AS minutes_by_day,
      COALESCE((SELECT json_agg(dw ORDER BY d) FROM dau_wau dw), '[]'::json) AS dau_wau,
      COALESCE((SELECT json_agg(ss ORDER BY activity_date) FROM short_sessions ss), '[]'::json) AS short_sessions,
      COALESCE((SELECT json_agg(s ORDER BY band) FROM segments s), '[]'::json) AS segments,
      COALESCE((SELECT json_agg(sl ORDER BY level_code, band) FROM segments_by_level sl), '[]'::json) AS segments_by_level,
      (SELECT row_to_json(snap) FROM snapshot snap) AS snapshot
    FROM (SELECT 1) AS _;
  `) as Array<{
    minutes_by_day: MinutesByDayRow[] | null;
    dau_wau: DauWauRow[] | null;
    short_sessions: ShortSessionRow[] | null;
    segments: SegmentRow[] | null;
    segments_by_level: SegmentByLevelRow[] | null;
    snapshot: EngagementSnapshot | null;
  }>;

  const row = rows[0];
  return {
    minutesByDay: row?.minutes_by_day ?? [],
    dauWauTrend: row?.dau_wau ?? [],
    shortSessionTrend: row?.short_sessions ?? [],
    segments: row?.segments ?? [],
    segmentsByLevel: row?.segments_by_level ?? [],
    snapshot: row?.snapshot ?? null,
  };
}

const getEngagementData = cache(fetchEngagementData);

export async function minutesByDay() {
  return (await getEngagementData()).minutesByDay;
}

export async function dauWauTrend90d() {
  return (await getEngagementData()).dauWauTrend;
}

export async function shortSessionTrend90d() {
  return (await getEngagementData()).shortSessionTrend;
}

export async function engagementSegments() {
  return (await getEngagementData()).segments;
}

export async function engagementSegmentsByLevel() {
  return (await getEngagementData()).segmentsByLevel;
}

export async function engagementSnapshot() {
  return (await getEngagementData()).snapshot;
}

export { type MinutesByDayRow, type DauWauRow, type ShortSessionRow, type SegmentRow, type SegmentByLevelRow, type EngagementSnapshot };
