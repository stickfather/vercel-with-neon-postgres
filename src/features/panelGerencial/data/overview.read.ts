import { cache } from "react";
import { createPanelGerencialClient } from "./client";

type OverviewCards = {
  onpace_pct: number | null;
  median_lei: number | null;
  total_minutes_30d: number | null;
  pct_inactive_ge_14d: number | null;
  active_students_30d: number | null;
  dau: number | null;
  wau: number | null;
  dau_over_wau: number | null;
  avg_daily_minutes: number | null;
};

type OnpaceTrendPoint = {
  snapshot_date: string;
  onpace_pct: number | null;
  median_lei?: number | null;
};

type OnpaceByLevelRow = {
  level_code: string;
  n_with_forecast: number | null;
  onpace_pct: number | null;
};

type MinutesByDayRow = {
  activity_date: string;
  total_minutes: number | null;
};

export type OverviewData = {
  cards: OverviewCards | null;
  onpaceTrend: OnpaceTrendPoint[];
  onpaceByLevel: OnpaceByLevelRow[];
  minutesByDay: MinutesByDayRow[];
};

async function fetchOverviewData(): Promise<OverviewData> {
  const sql = await createPanelGerencialClient();
  const rows = (await sql`
    WITH
      cards_data AS (
        SELECT *
        FROM analytics.v_management_overview_cards
        LIMIT 1
      ),
      onpace_trend AS (
        SELECT snapshot_date, onpace_pct, median_lei
        FROM analytics.v_onpace_trend_daily
        ORDER BY snapshot_date
      ),
      onpace_by_level AS (
        SELECT level_code, n_with_forecast, onpace_pct
        FROM analytics.v_onpace_by_level
        ORDER BY level_code
      ),
      minutes_by_day AS (
        SELECT activity_date, total_minutes
        FROM analytics.v_minutes_by_day
        ORDER BY activity_date
      )
    SELECT
      (SELECT row_to_json(cd) FROM cards_data cd) AS cards,
      COALESCE((SELECT json_agg(ot ORDER BY snapshot_date) FROM onpace_trend ot), '[]'::json) AS onpace_trend,
      COALESCE((SELECT json_agg(ob ORDER BY level_code) FROM onpace_by_level ob), '[]'::json) AS onpace_by_level,
      COALESCE((SELECT json_agg(md ORDER BY activity_date) FROM minutes_by_day md), '[]'::json) AS minutes_by_day
    FROM (SELECT 1) AS _;
  `) as Array<{
    cards: OverviewCards | null;
    onpace_trend: OnpaceTrendPoint[] | null;
    onpace_by_level: OnpaceByLevelRow[] | null;
    minutes_by_day: MinutesByDayRow[] | null;
  }>;

  const row = rows[0];
  return {
    cards: row?.cards ?? null,
    onpaceTrend: row?.onpace_trend ?? [],
    onpaceByLevel: row?.onpace_by_level ?? [],
    minutesByDay: row?.minutes_by_day ?? [],
  };
}

export const getOverviewData = cache(fetchOverviewData);
