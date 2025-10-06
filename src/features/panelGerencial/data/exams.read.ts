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

type LatestViewName = "analytics.v_kpi_exam_pass_latest" | "analytics.v_exam_kpis";

async function readPassTrend(
  sql: Awaited<ReturnType<typeof createPanelGerencialClient>>,
): Promise<PassTrendRow[]> {
  const rows = (await sql`
    SELECT month, pass_rate
    FROM analytics.v_kpi_exam_pass_trend
    ORDER BY month;
  `) as PassTrendRow[];
  return rows ?? [];
}

async function readLatest(
  sql: Awaited<ReturnType<typeof createPanelGerencialClient>>,
  viewName: LatestViewName,
): Promise<LatestExamKpis | null> {
  const rows = (await sql`
    SELECT pass_rate_pct, avg_score, sample_size
    FROM ${sql.unsafe(viewName)}
    LIMIT 1;
  `) as LatestExamKpis[];
  return rows?.[0] ?? null;
}

async function fetchExamsData(): Promise<ExamsData> {
  const sql = await createPanelGerencialClient();

  let passTrendRows: PassTrendRow[] = [];
  let hasPassTrendView = false;
  try {
    passTrendRows = await readPassTrend(sql);
    hasPassTrendView = true;
  } catch (error) {
    console.warn("No se pudo leer analytics.v_kpi_exam_pass_trend", error);
  }

  let latest: LatestExamKpis | null = null;
  let hasLatestView = false;
  try {
    latest = await readLatest(sql, "analytics.v_kpi_exam_pass_latest");
    hasLatestView = latest !== null;
  } catch (primaryError) {
    console.warn(
      "Fallo al leer analytics.v_kpi_exam_pass_latest, intentando con analytics.v_exam_kpis",
      primaryError,
    );
    try {
      latest = await readLatest(sql, "analytics.v_exam_kpis");
      hasLatestView = latest !== null;
    } catch (fallbackError) {
      console.warn("Vistas de exámenes no disponibles", fallbackError);
    }
  }

  const available = hasPassTrendView || hasLatestView;

  if (!available) {
    return { available: false, passTrend: [], latest: null };
  }

  return {
    available,
    passTrend: passTrendRows,
    latest,
  } satisfies ExamsData;
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
