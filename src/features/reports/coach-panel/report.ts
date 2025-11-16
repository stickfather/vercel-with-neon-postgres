import { getSqlClient, isMissingRelationError, normalizeRows } from "@/lib/db/client";
import type { SqlRow } from "@/lib/db/client";

import type {
  CoachPanelReportResponse,
  ConsistencyMetrics,
  DailyMinutesPoint,
  EfficiencyStabilityMetrics,
  ExamPrepGap,
  HabitReliability,
  HoursHistogram,
  InstructivosStatus,
  QuadrantProfile,
} from "./types";

const EMPTY_RESPONSE: CoachPanelReportResponse = {
  examReadiness: { score: null, label: null },
  studyVolume: {
    diasActivos30d: null,
    minutosTotales30d: null,
    promedioMinutosPorSesion30d: null,
  },
  consistency: { dailyHeatmap: [], consistencyScore: null },
  efficiencyStability: { efficiencyStabilityScore: null },
  habitReliability: { label: null },
  hoursHistogram: { byHour: [] },
  examPrepGap: { gapDaysToNextExam: null, alerts: [] },
  instructivosStatus: { pendientes: 0, overdue: 0 },
  quadrantProfile: null,
  fallback: true,
};

type StudentMetricsRow = SqlRow & {
  exam_readiness_score: number | null;
  exam_readiness_label: string | null;
  dias_activos_30d: number | null;
  minutos_totales_30d: number | null;
  promedio_minutos_por_sesion_30d: number | null;
  minutes_by_day_30d: unknown;
  consistency_score: number | null;
  efficiency_stability_score: number | null;
  habit_reliability_label: string | null;
  minutes_by_hour_30d: unknown;
  prep_gap_days_to_next_exam: number | null;
  instructivos_pendientes: number | null;
  instructivos_overdue: number | null;
};

type QuadrantRow = SqlRow & {
  quadrant_label?: string | null;
  lei_value?: number | null;
  lessons_per_hour_30d?: number | null;
  lessons_per_week_30d?: number | null;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (value === null || value === undefined) {
    return null;
  }
  const str = String(value).trim();
  return str.length ? str : null;
}

function safeJsonValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("[CoachPanel] JSON parse error", error);
      return null;
    }
  }
  if (typeof value === "object") {
    return value;
  }
  return null;
}

function parseDailyMinutes(raw: unknown): DailyMinutesPoint[] {
  const payload = safeJsonValue(raw);
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const date = toString((entry as Record<string, unknown>).date);
        const minutes = toNumber((entry as Record<string, unknown>).minutes);
        if (!date || minutes == null) {
          return null;
        }
        return { date, minutes: Math.max(0, Math.trunc(minutes)) };
      })
      .filter((item): item is DailyMinutesPoint => Boolean(item))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  if (payload && typeof payload === "object") {
    return Object.entries(payload as Record<string, unknown>)
      .map(([dateKey, minutesValue]) => {
        const date = toString(dateKey);
        const minutes = toNumber(minutesValue);
        if (!date || minutes == null) {
          return null;
        }
        return { date, minutes: Math.max(0, Math.trunc(minutes)) };
      })
      .filter((item): item is DailyMinutesPoint => Boolean(item))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  return [];
}

function parseHourlyMinutes(raw: unknown): HoursHistogram {
  const payload = safeJsonValue(raw);
  const buckets: { hourLabel: string; minutes: number }[] = [];

  if (Array.isArray(payload)) {
    payload.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        return;
      }
      const record = entry as Record<string, unknown>;
      const hourRaw = record.hour ?? record.hour_label ?? record.bucket;
      const minutes = toNumber(record.minutes ?? record.total_minutes);
      const hourLabel = normalizeHourLabel(hourRaw);
      if (!hourLabel || minutes == null) {
        return;
      }
      buckets.push({ hourLabel, minutes: Math.max(0, minutes) });
    });
  } else if (payload && typeof payload === "object") {
    Object.entries(payload as Record<string, unknown>).forEach(([hourKey, value]) => {
      const hourLabel = normalizeHourLabel(hourKey);
      const minutes = toNumber(value);
      if (!hourLabel || minutes == null) {
        return;
      }
      buckets.push({ hourLabel, minutes: Math.max(0, minutes) });
    });
  }

  return {
    byHour: buckets.sort((a, b) => a.hourLabel.localeCompare(b.hourLabel)),
  };
}

function normalizeHourLabel(value: unknown): string | null {
  if (typeof value === "number") {
    const safeHour = Math.max(0, Math.min(23, Math.trunc(value)));
    return `${String(safeHour).padStart(2, "0")}:00`;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (/^\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      const safeHour = Math.max(0, Math.min(23, Math.trunc(numeric)));
      return `${String(safeHour).padStart(2, "0")}:00`;
    }
  }
  return null;
}

function buildExamPrepAlerts(gapDays: number | null): ExamPrepGap["alerts"] {
  if (gapDays == null) {
    return [];
  }
  if (gapDays <= 2) {
    return [
      {
        label: "Examen muy próximo: prioriza sesiones guiadas y repasos.",
        severity: "warning",
      },
    ];
  }
  if (gapDays >= 30) {
    return [
      {
        label: "Lleva mucho tiempo en preparación. Revisa si necesita agendar examen.",
        severity: "info",
      },
    ];
  }
  return [];
}

function describeQuadrant(label: string | null): string | undefined {
  if (!label) {
    return undefined;
  }
  const normalized = label.trim().toUpperCase();
  switch (normalized) {
    case "A":
      return "Eficiente y activo";
    case "B":
      return "Activo con oportunidades de eficiencia";
    case "C":
      return "Eficiente pero necesita más ritmo";
    case "D":
      return "Bajo ritmo y eficiencia";
    default:
      return undefined;
  }
}

export async function buildCoachPanelReport(studentId: number): Promise<CoachPanelReportResponse> {
  if (!Number.isFinite(studentId)) {
    console.warn("[CoachPanel] Invalid studentId:", studentId);
    return EMPTY_RESPONSE;
  }

  const sql = getSqlClient();
  let baseRow: StudentMetricsRow | null = null;

  try {
    const rows = normalizeRows<StudentMetricsRow>(await sql`
      SELECT
        student_id,
        exam_readiness_score,
        exam_readiness_label,
        dias_activos_30d,
        minutos_totales_30d,
        promedio_minutos_por_sesion_30d,
        minutes_by_day_30d,
        consistency_score,
        efficiency_stability_score,
        habit_reliability_label,
        minutes_by_hour_30d,
        prep_gap_days_to_next_exam,
        instructivos_pendientes,
        instructivos_overdue
      FROM final.coach_panel_student_30d_mv
      WHERE student_id = ${studentId}
      LIMIT 1
    `);
    baseRow = rows[0] ?? null;
    
    if (!baseRow) {
      console.warn("[CoachPanel] No data found in final.coach_panel_student_30d_mv for studentId:", studentId);
    } else {
      console.log("[CoachPanel] Successfully fetched data for studentId:", studentId, {
        diasActivos: baseRow.dias_activos_30d,
        minutosTotales: baseRow.minutos_totales_30d,
      });
    }
  } catch (error) {
    if (isMissingRelationError(error, "final.coach_panel_student_30d_mv")) {
      console.warn("[CoachPanel] Vista final.coach_panel_student_30d_mv no disponible", error);
    } else {
      console.error("[CoachPanel] Error cargando coach_panel_student_30d_mv", error);
    }
    return EMPTY_RESPONSE;
  }

  if (!baseRow) {
    return EMPTY_RESPONSE;
  }

  const examReadiness = {
    score: toNumber(baseRow.exam_readiness_score),
    label: toString(baseRow.exam_readiness_label),
  } satisfies CoachPanelReportResponse["examReadiness"];

  const studyVolume = {
    diasActivos30d: toNumber(baseRow.dias_activos_30d),
    minutosTotales30d: toNumber(baseRow.minutos_totales_30d),
    promedioMinutosPorSesion30d: toNumber(baseRow.promedio_minutos_por_sesion_30d),
  } satisfies CoachPanelReportResponse["studyVolume"];

  const consistency: ConsistencyMetrics = {
    dailyHeatmap: parseDailyMinutes(baseRow.minutes_by_day_30d),
    consistencyScore: toNumber(baseRow.consistency_score),
  };

  const efficiencyStability: EfficiencyStabilityMetrics = {
    efficiencyStabilityScore: toNumber(baseRow.efficiency_stability_score),
  };

  const habitReliability: HabitReliability = {
    label: toString(baseRow.habit_reliability_label),
  };

  const hoursHistogram = parseHourlyMinutes(baseRow.minutes_by_hour_30d);

  const gapDays = toNumber(baseRow.prep_gap_days_to_next_exam);
  const examPrepGap: ExamPrepGap = {
    gapDaysToNextExam: gapDays,
    alerts: buildExamPrepAlerts(gapDays),
  };

  const instructivosStatus: InstructivosStatus = {
    pendientes: toNumber(baseRow.instructivos_pendientes) ?? 0,
    overdue: toNumber(baseRow.instructivos_overdue) ?? 0,
  };

  let stabilitySparkline: number[] | undefined;
  try {
    const sparklineRows = normalizeRows<SqlRow>(await sql`
      SELECT *
      FROM final.student_daily_level_progress_v
      WHERE student_id = ${studentId}
        AND day >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY day
    `);
    stabilitySparkline = sparklineRows
      .map((row) => {
        const payload = row as Record<string, unknown>;
        return (
          toNumber(payload.lei_value) ??
          toNumber(payload.lei) ??
          toNumber(payload.efficiency_score)
        );
      })
      .filter((value): value is number => value != null);
  } catch (error) {
    if (isMissingRelationError(error, "final.student_daily_level_progress_v")) {
      console.warn("[CoachPanel] Vista final.student_daily_level_progress_v no disponible", error);
    } else {
      console.warn("[CoachPanel] Error cargando student_daily_level_progress_v", error);
    }
  }

  if (stabilitySparkline?.length) {
    efficiencyStability.stabilitySparkline = stabilitySparkline;
  }

  let quadrantProfile: QuadrantProfile | null = null;
  try {
    const quadrantRows = normalizeRows<QuadrantRow>(await sql`
      SELECT *
      FROM final.coach_panel_quadrant_30d_mv
      WHERE student_id = ${studentId}
      LIMIT 1
    `);
    const row = quadrantRows[0];
    
    if (!row) {
      console.warn("[CoachPanel] No quadrant data found for studentId:", studentId);
    } else {
      console.log("[CoachPanel] Quadrant data for studentId:", studentId, {
        quadrant_label: row.quadrant_label,
        lessons_per_hour_30d: row.lessons_per_hour_30d,
        lessons_per_week_30d: row.lessons_per_week_30d,
      });
    }
    
    if (row) {
      const quadrantLabel = toString(row.quadrant_label ?? (row as Record<string, unknown>).quadrant) ?? "";
      const leiValue = toNumber(row.lei_value ?? (row as Record<string, unknown>).lei);
      const lessonsPerHour = toNumber(
        row.lessons_per_hour_30d ?? 
        (row as Record<string, unknown>).lessons_per_hour ?? 
        (row as Record<string, unknown>).lessons_hour
      );
      const lessonsPerWeek = toNumber(
        row.lessons_per_week_30d ?? 
        (row as Record<string, unknown>).lessons_per_week ?? 
        (row as Record<string, unknown>).lessons_week
      );
      if (quadrantLabel || leiValue != null || lessonsPerHour != null || lessonsPerWeek != null) {
        quadrantProfile = {
          quadrantLabel: quadrantLabel || "",
          leiValue,
          lessonsPerHour,
          lessonsPerWeek,
          description: describeQuadrant(quadrantLabel ?? undefined),
        };
        console.log("[CoachPanel] Created quadrant profile:", quadrantProfile);
      } else {
        console.warn("[CoachPanel] All quadrant values are null for studentId:", studentId);
      }
    }
  } catch (error) {
    if (isMissingRelationError(error, "final.coach_panel_quadrant_30d_mv")) {
      console.warn("[CoachPanel] Vista final.coach_panel_quadrant_30d_mv no disponible", error);
    } else {
      console.warn("[CoachPanel] Error cargando coach_panel_quadrant_30d_mv", error);
    }
  }

  return {
    examReadiness,
    studyVolume,
    consistency,
    efficiencyStability,
    habitReliability,
    hoursHistogram,
    examPrepGap,
    instructivosStatus,
    quadrantProfile,
    fallback: false,
  } satisfies CoachPanelReportResponse;
}
