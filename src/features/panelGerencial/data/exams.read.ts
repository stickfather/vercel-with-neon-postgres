import { cache } from "react";
import { createPanelGerencialClient } from "./client";

type PassTrendRow = {
  month: string;
  pass_rate: number | null;
};

type LatestExamKpis = {
  pass_rate_pct: number | null;
  avg_score: number | null;
  sample_size: number | null;
};

type ExamsData = {
  available: boolean;
  passTrend: PassTrendRow[];
  latest: LatestExamKpis | null;
};

async function fetchFromLatestView(
  sql: Awaited<ReturnType<typeof createPanelGerencialClient>>,
  viewName: "analytics.v_kpi_exam_pass_latest" | "analytics.v_exam_kpis",
) {
  const rows = (await sql`
    WITH
      pass_trend AS (
        SELECT month, pass_rate
        FROM analytics.v_kpi_exam_pass_trend
        ORDER BY month
      ),
      latest AS (
        SELECT pass_rate_pct, avg_score, sample_size
        FROM ${sql.unsafe(viewName)}
        LIMIT 1
      )
    SELECT
      COALESCE((SELECT json_agg(pt ORDER BY month) FROM pass_trend pt), '[]'::json) AS pass_trend,
      (SELECT row_to_json(l) FROM latest l) AS latest
    FROM (SELECT 1) AS _;
  `) as Array<{
    pass_trend: PassTrendRow[] | null;
    latest: LatestExamKpis | null;
  }>;

  const row = rows[0];
  return {
    available: true,
    passTrend: row?.pass_trend ?? [],
    latest: row?.latest ?? null,
  } satisfies ExamsData;
}

async function fetchExamsData(): Promise<ExamsData> {
  const sql = await createPanelGerencialClient();

  try {
    return await fetchFromLatestView(sql, "analytics.v_kpi_exam_pass_latest");
  } catch (primaryError) {
    console.warn("Fallo al leer analytics.v_kpi_exam_pass_latest, intentando con analytics.v_exam_kpis", primaryError);
    try {
      return await fetchFromLatestView(sql, "analytics.v_exam_kpis");
    } catch (fallbackError) {
      console.warn("Vistas de exámenes no disponibles", fallbackError);
      return { available: false, passTrend: [], latest: null };
    }
  }
}

const getExamsData = cache(fetchExamsData);

export async function passTrend() {
  const data = await getExamsData();
  return data.passTrend;
}

export async function latestExamKpis() {
  const data = await getExamsData();
  return data.latest;
}

export async function examsModuleAvailable() {
  const data = await getExamsData();
  return data.available;
}

export type { PassTrendRow, LatestExamKpis };
