import { cache } from "react";
import { createPanelGerencialClient } from "./client";

type LeiDistributionRow = {
  student_id: string;
  level_code: string | null;
  lei_30d: number | null;
};

type LeiQuartilesRow = {
  level_code: string;
  p25: number | null;
  p50: number | null;
  p75: number | null;
};

type StallHeatmapRow = {
  level_code: string;
  lesson_seq: number;
  avg_repeats_per_student: number | null;
  total_visits: number | null;
  unique_students: number | null;
};

type ForecastByLevelRow = {
  level_code: string;
  n_students_with_forecast: number | null;
  p25_months: number | null;
  median_months: number | null;
  p75_months: number | null;
};

type LevelCompletionRow = {
  level_code: string;
  completions_90d: number | null;
  students_active_90d: number | null;
  students_in_level_snapshot: number | null;
  completion_rate_90d_active_pct: number | null;
  completion_rate_90d_snapshot_pct: number | null;
};

type LevelTtcMedianRow = {
  level_code: string;
  n_completions: number | null;
  median_months: number | null;
  p25_months: number | null;
  p75_months: number | null;
};

export type ProgressData = {
  leiDistribution: LeiDistributionRow[];
  leiQuartiles: LeiQuartilesRow[];
  stallHeatmap: StallHeatmapRow[];
  forecastByLevel: ForecastByLevelRow[];
  levelCompletion: LevelCompletionRow[];
  levelTtcMedian: LevelTtcMedianRow[];
};

async function fetchProgressData(): Promise<ProgressData> {
  const sql = await createPanelGerencialClient();
  const rows = (await sql`
    WITH
      lei_distribution AS (
        SELECT student_id, level_code, lei_30d
        FROM analytics.v_lei_distribution
      ),
      lei_quartiles AS (
        SELECT level_code, p25, p50, p75
        FROM analytics.v_lei_quartiles
      ),
      stall_heatmap AS (
        SELECT level_code, lesson_seq, avg_repeats_per_student, total_visits, unique_students
        FROM mart.mv_kpi_stall_heatmap
      ),
      forecast_by_level AS (
        SELECT level_code, n_students_with_forecast, p25_months, median_months, p75_months
        FROM analytics.v_forecast_by_level_box
        ORDER BY level_code
      ),
      level_completion AS (
        SELECT level_code, completions_90d, students_active_90d, students_in_level_snapshot,
          completion_rate_90d_active_pct, completion_rate_90d_snapshot_pct
        FROM analytics.v_level_completion_90d
        ORDER BY level_code
      ),
      level_ttc AS (
        SELECT level_code, n_completions, median_months, p25_months, p75_months
        FROM analytics.v_level_ttc_median
        ORDER BY level_code
      )
    SELECT
      COALESCE((SELECT json_agg(ld) FROM lei_distribution ld), '[]'::json) AS lei_distribution,
      COALESCE((SELECT json_agg(lq ORDER BY level_code) FROM lei_quartiles lq), '[]'::json) AS lei_quartiles,
      COALESCE((SELECT json_agg(sh ORDER BY level_code, lesson_seq) FROM stall_heatmap sh), '[]'::json) AS stall_heatmap,
      COALESCE((SELECT json_agg(fb ORDER BY level_code) FROM forecast_by_level fb), '[]'::json) AS forecast_by_level,
      COALESCE((SELECT json_agg(lc ORDER BY level_code) FROM level_completion lc), '[]'::json) AS level_completion,
      COALESCE((SELECT json_agg(lt ORDER BY level_code) FROM level_ttc lt), '[]'::json) AS level_ttc
    FROM (SELECT 1) AS _;
  `) as Array<{
    lei_distribution: LeiDistributionRow[] | null;
    lei_quartiles: LeiQuartilesRow[] | null;
    stall_heatmap: StallHeatmapRow[] | null;
    forecast_by_level: ForecastByLevelRow[] | null;
    level_completion: LevelCompletionRow[] | null;
    level_ttc: LevelTtcMedianRow[] | null;
  }>;

  const row = rows[0];
  return {
    leiDistribution: row?.lei_distribution ?? [],
    leiQuartiles: row?.lei_quartiles ?? [],
    stallHeatmap: row?.stall_heatmap ?? [],
    forecastByLevel: row?.forecast_by_level ?? [],
    levelCompletion: row?.level_completion ?? [],
    levelTtcMedian: row?.level_ttc ?? [],
  };
}

export const getProgressData = cache(fetchProgressData);
