import { cache } from "react";
import { createPanelGerencialClient } from "./client";

type AtRiskRow = {
  student_id: string;
  level_code: string | null;
  on_pace: boolean | null;
  inactive_14d: boolean | null;
  stall_flag: boolean | null;
  lei_30d: number | null;
  lei_ratio: number | null;
  minutes_30d: number | null;
  days_since_last: number | null;
  lessons_remaining: number | null;
  forecast_months_to_finish: number | null;
  risk_score: number | null;
  engagement_band: "green" | "amber" | "red";
};

type OnpaceByLevelRow = {
  level_code: string;
  n_with_forecast: number | null;
  onpace_pct: number | null;
};

type RiskData = {
  atRisk: AtRiskRow[];
  onpaceByLevel: OnpaceByLevelRow[];
};

async function fetchRiskData(): Promise<RiskData> {
  const sql = await createPanelGerencialClient();
  const rows = (await sql`
    WITH
      at_risk AS (
        SELECT
          student_id,
          level_code,
          on_pace,
          inactive_14d,
          stall_flag,
          lei_30d,
          lei_ratio,
          minutes_30d,
          days_since_last,
          lessons_remaining,
          forecast_months_to_finish,
          risk_score,
          CASE
            WHEN inactive_14d THEN 'red'
            WHEN lei_ratio IS NULL THEN 'amber'
            WHEN lei_ratio < 0.6 THEN 'red'
            WHEN lei_ratio < 1 THEN 'amber'
            ELSE 'green'
          END AS engagement_band
        FROM analytics.v_at_risk_top
        ORDER BY risk_score DESC NULLS LAST, days_since_last DESC NULLS LAST
      ),
      onpace AS (
        SELECT level_code, n_with_forecast, onpace_pct
        FROM analytics.v_onpace_by_level
        ORDER BY level_code
      )
    SELECT
      COALESCE((SELECT json_agg(ar ORDER BY risk_score DESC NULLS LAST, days_since_last DESC NULLS LAST) FROM at_risk ar), '[]'::json) AS at_risk,
      COALESCE((SELECT json_agg(op ORDER BY level_code) FROM onpace op), '[]'::json) AS onpace
    FROM (SELECT 1) AS _;
  `) as Array<{
    at_risk: AtRiskRow[] | null;
    onpace: OnpaceByLevelRow[] | null;
  }>;

  const row = rows[0];
  return {
    atRisk: row?.at_risk ?? [],
    onpaceByLevel: row?.onpace ?? [],
  };
}

const getRiskData = cache(fetchRiskData);

export async function atRiskTop() {
  return (await getRiskData()).atRisk;
}

export async function onpaceByLevel() {
  return (await getRiskData()).onpaceByLevel;
}

export { type AtRiskRow, type OnpaceByLevelRow };
