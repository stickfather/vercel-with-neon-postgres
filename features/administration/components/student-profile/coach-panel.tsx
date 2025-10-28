"use client";

import { useMemo } from "react";

import type {
  CoachPanelEngagementHeatmapEntry,
  CoachPanelLessonJourneyEntry,
  CoachPanelLessonJourneyLevel,
  StudentCoachPanelSummary,
} from "@/features/administration/data/student-profile";

import { StudyHoursHistogram } from "./StudyHoursHistogram";

type CoachPanelProps = {
  data: StudentCoachPanelSummary | null;
  errorMessage?: string | null;
};

const HEATMAP_DAYS = 30;

const PLAN_LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const LEVEL_ORDER_INDEX = new Map<string, number>(PLAN_LEVEL_ORDER.map((level, index) => [level, index]));

const LEVEL_BADGE_CLASS =
  "inline-flex h-9 min-w-[64px] shrink-0 items-center justify-center rounded-full bg-teal-500 px-3 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_12px_24px_rgba(20,184,166,0.28)]";

function formatNumber(
  value: number | null | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
}

function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  const safe = Math.min(100, Math.max(0, normalized));
  return `${formatNumber(safe, { maximumFractionDigits: digits })}%`;
}

function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) {
    return "—";
  }
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return "—";
  }
  const formatter = new Intl.DateTimeFormat(
    "es-EC",
    withTime
      ? { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guayaquil" }
      : { dateStyle: "medium", timeZone: "America/Guayaquil" },
  );
  return formatter.format(parsed);
}

function buildHeatmapCells(
  entries: CoachPanelEngagementHeatmapEntry[],
  days: number,
): CoachPanelEngagementHeatmapEntry[] {
  const map = new Map(entries.map((entry) => [entry.date, entry.minutes]));
  const result: CoachPanelEngagementHeatmapEntry[] = [];
  const today = new Date();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const iso = date.toISOString().slice(0, 10);
    result.push({ date: iso, minutes: map.get(iso) ?? 0 });
  }
  return result;
}

function heatmapColor(minutes: number, maxMinutes: number): string {
  if (maxMinutes <= 0 || minutes <= 0) {
    return "rgba(0, 191, 166, 0.08)";
  }
  const intensity = Math.min(1, minutes / maxMinutes);
  const alpha = 0.18 + intensity * 0.55;
  return `rgba(0, 191, 166, ${alpha.toFixed(2)})`;
}

function resolveLevelBadgeClasses(_levelCode: string | null | undefined): string {
  return LEVEL_BADGE_CLASS;
}

function formatHoursValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "0.0";
  }
  return value.toFixed(1);
}

function resolveLessonBubbleTitle(lesson: CoachPanelLessonJourneyEntry): string {
  if (lesson.isIntro) {
    return "Intro";
  }

  if (lesson.isExam) {
    return "Exam";
  }

  const preferred = lesson.displayLabel?.trim() ?? "";
  const fallback = lesson.lessonTitle?.trim() ?? "";
  const base = preferred.length ? preferred : fallback;

  if (!base.length) {
    const seq =
      typeof lesson.lessonLevelSeq === "number" && Number.isFinite(lesson.lessonLevelSeq)
        ? lesson.lessonLevelSeq
        : null;
    if (seq != null) {
      return String(seq);
    }
    return "—";
  }

  if (/^lección\s+/i.test(base)) {
    const stripped = base.replace(/^lección\s+/i, "").trim();
    if (!stripped.length) {
      return "—";
    }

    const numericMatch = stripped.match(/^\d+/);
    if (numericMatch) {
      return numericMatch[0];
    }
    return stripped;
  }

  return base;
}

function resolveLessonTooltipTitle(lesson: CoachPanelLessonJourneyEntry): string {
  const title = lesson.lessonTitle?.trim();
  if (title && title.length) {
    return title;
  }
  const display = lesson.displayLabel?.trim();
  if (display && display.length) {
    return display;
  }
  return resolveLessonBubbleTitle(lesson);
}

function resolveLessonNodeCircleClass(lesson: CoachPanelLessonJourneyEntry): string {
  const base =
    "relative flex items-center justify-center rounded-full font-semibold transition-colors duration-150";

  if (lesson.status === "current") {
    return `${base} h-14 w-14 border-2 border-[#10bfa9] bg-white text-[#0f9d8a] shadow-[0_0_0_5px_rgba(15,157,138,0.22)]`;
  }

  if (lesson.status === "completed") {
    return `${base} h-12 w-12 border border-[#0aa493] bg-[#10bfa9] text-white shadow-[0_10px_28px_rgba(15,157,138,0.28)]`;
  }

  if (lesson.isExam) {
    return `${base} h-12 w-12 border-2 border-dashed border-orange-400 bg-white text-[#f97316] shadow-sm`;
  }

  return `${base} h-12 w-12 border-2 border-orange-300 bg-white text-[#f97316] shadow-[0_8px_20px_rgba(249,115,22,0.18)]`;
}

function resolveLessonNodeLabelClass(lesson: CoachPanelLessonJourneyEntry): string {
  if (lesson.status === "current") {
    return "text-sm font-semibold";
  }
  return "text-xs font-semibold";
}

const SPEED_LABEL_TEXT: Record<"Fast" | "Normal" | "Slow", string> = {
  Fast: "Rápido",
  Normal: "Normal",
  Slow: "Lento",
};

const SPEED_LABEL_TONE: Record<"Fast" | "Normal" | "Slow", string> = {
  Fast: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Normal: "bg-slate-50 text-slate-700 border border-slate-200",
  Slow: "bg-rose-50 text-rose-700 border border-rose-200",
};

function resolveSpeedTone(
  label: string | null | undefined,
): string {
  if (!label) {
    return "bg-slate-50 text-slate-400 border border-slate-200";
  }
  const normalized = label as "Fast" | "Normal" | "Slow";
  return SPEED_LABEL_TONE[normalized] ?? "bg-slate-50 text-slate-400 border border-slate-200";
}

function translateSpeedLabel(label: string | null | undefined): string {
  if (!label) {
    return "Sin datos suficientes";
  }
  const normalized = label as "Fast" | "Normal" | "Slow";
  return SPEED_LABEL_TEXT[normalized] ?? "Sin datos";
}


export function CoachPanel({ data, errorMessage }: CoachPanelProps) {
  const recentActivity = Array.isArray(data?.recentActivity) ? data.recentActivity : [];

  const heatmapBase = Array.isArray(data?.engagement?.heatmap) ? data.engagement.heatmap : [];
  const heatmapSource = useMemo(() => {
    if (heatmapBase.length) {
      return heatmapBase;
    }
    if (!recentActivity.length) {
      return [];
    }
    const totals = new Map<string, number>();
    recentActivity.forEach((session) => {
      const checkIn = session.checkIn;
      if (!checkIn) {
        return;
      }
      const date = checkIn.slice(0, 10);
      if (!date) {
        return;
      }
      const minutes =
        session.sessionMinutes != null && Number.isFinite(session.sessionMinutes)
          ? Math.max(0, session.sessionMinutes)
          : 0;
      totals.set(date, (totals.get(date) ?? 0) + minutes);
    });
    return Array.from(totals.entries())
      .map(([date, minutes]) => ({
        date,
        minutes: Math.max(0, Math.trunc(minutes)),
      }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [heatmapBase, recentActivity]);

  const heatmapCells = useMemo(() => buildHeatmapCells(heatmapSource, HEATMAP_DAYS), [heatmapSource]);
  const heatmapMaxMinutes = useMemo(
    () => heatmapCells.reduce((max, entry) => (entry.minutes > max ? entry.minutes : max), 0),
    [heatmapCells],
  );
  const engagementStats = data?.engagement?.stats ?? {
    daysActive30d: null,
    totalMinutes30d: null,
    totalHours30d: null,
    avgSessionMinutes30d: null,
  };
  const lei30dPlan = data?.learnerSpeed?.lei30dPlan ?? null;

  if (errorMessage) {
    return (
      <div className="rounded-3xl border border-red-100 bg-red-50/80 p-8 text-red-700 shadow-sm">
        {errorMessage}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-brand-ink-muted/10 bg-white/90 p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-brand-deep">
          No hay información del panel del coach para este estudiante.
        </p>
        <p className="mt-2 text-sm text-brand-ink-muted">
          Aún no registramos actividad reciente. ¡Anima al estudiante a retomar sus sesiones!
        </p>
      </div>
    );
  }

  const { profileHeader, lessonJourney, paceForecast } = data;

  const journeyLessons = useMemo(() => {
    const lessons: CoachPanelLessonJourneyEntry[] = [];

    if (Array.isArray(lessonJourney?.lessons)) {
      lessons.push(...lessonJourney.lessons);
    } else if (Array.isArray(lessonJourney?.levels)) {
      lessonJourney.levels.forEach((level) => {
        if (Array.isArray(level.lessons)) {
          lessons.push(...level.lessons);
        }
      });
    }

    return lessons
      .map((lesson) => {
        const rawGlobalSeq =
          typeof lesson.lessonGlobalSeq === "number"
            ? lesson.lessonGlobalSeq
            : lesson.lessonGlobalSeq == null
            ? null
            : Number(lesson.lessonGlobalSeq);
        if (rawGlobalSeq == null || !Number.isFinite(rawGlobalSeq)) {
          return null;
        }

        const normalizedGlobalSeq = Math.trunc(rawGlobalSeq);
        const rawLevelSeq =
          lesson.lessonLevelSeq == null
            ? null
            : typeof lesson.lessonLevelSeq === "number"
            ? lesson.lessonLevelSeq
            : Number(lesson.lessonLevelSeq);
        const normalizedLevelSeq =
          rawLevelSeq != null && Number.isFinite(rawLevelSeq)
            ? Math.trunc(rawLevelSeq)
            : null;

        const normalizedLevelCode = lesson.levelCode?.trim().toUpperCase() || "OTROS";

        const rawLessonId =
          lesson.lessonId == null
            ? null
            : typeof lesson.lessonId === "number"
            ? lesson.lessonId
            : Number(lesson.lessonId);
        const normalizedLessonId =
          rawLessonId == null || !Number.isFinite(rawLessonId)
            ? null
            : Math.trunc(rawLessonId);

        const rawHours =
          typeof lesson.hoursInLesson === "number"
            ? lesson.hoursInLesson
            : Number(lesson.hoursInLesson);
        const normalizedHours =
          Number.isFinite(rawHours) && rawHours != null
            ? Number(Math.max(0, rawHours).toFixed(1))
            : 0;

        const rawDays =
          typeof lesson.daysInLesson === "number"
            ? lesson.daysInLesson
            : Number(lesson.daysInLesson);
        const normalizedDays =
          Number.isFinite(rawDays) && rawDays != null
            ? Math.max(0, Math.trunc(rawDays))
            : 0;

        const normalizedStatus: CoachPanelLessonJourneyEntry["status"] =
          lesson.status === "completed" || lesson.status === "current" || lesson.status === "upcoming"
            ? lesson.status
            : "upcoming";

        const normalizedTitle =
          typeof lesson.lessonTitle === "string" && lesson.lessonTitle.trim().length
            ? lesson.lessonTitle
            : null;
        const normalizedDisplayLabel =
          typeof lesson.displayLabel === "string" && lesson.displayLabel.trim().length
            ? lesson.displayLabel.trim()
            : normalizedTitle ?? "Lección";
        const normalizedIsIntro = Boolean(lesson.isIntro);
        const normalizedIsExam = Boolean(lesson.isExam);

        return {
          lessonId: normalizedLessonId,
          lessonGlobalSeq: normalizedGlobalSeq,
          lessonLevelSeq: normalizedLevelSeq,
          levelCode: normalizedLevelCode,
          lessonTitle: normalizedTitle,
          displayLabel: normalizedDisplayLabel,
          isIntro: normalizedIsIntro,
          isExam: normalizedIsExam,
          status: normalizedStatus,
          hoursInLesson: normalizedHours,
          daysInLesson: normalizedDays,
        } satisfies CoachPanelLessonJourneyEntry;
      })
      .filter((lesson): lesson is CoachPanelLessonJourneyEntry => lesson != null);
  }, [lessonJourney]);

  const journeyLevels = useMemo(() => {
    if (!journeyLessons.length) {
      return [] as CoachPanelLessonJourneyLevel[];
    }

    const grouped = new Map<string, CoachPanelLessonJourneyEntry[]>();
    journeyLessons.forEach((lesson) => {
      const bucket = grouped.get(lesson.levelCode);
      if (bucket) {
        bucket.push(lesson);
      } else {
        grouped.set(lesson.levelCode, [lesson]);
      }
    });

    return Array.from(grouped.entries()).map(([levelCode, lessons]) => {
      const normalizedOrder = LEVEL_ORDER_INDEX.get(levelCode) ?? Number.POSITIVE_INFINITY;
      const sortedLessons = lessons
        .slice()
        .sort((a, b) => {
          const aSeq =
            typeof a.lessonLevelSeq === "number" && Number.isFinite(a.lessonLevelSeq)
              ? a.lessonLevelSeq
              : a.lessonGlobalSeq;
          const bSeq =
            typeof b.lessonLevelSeq === "number" && Number.isFinite(b.lessonLevelSeq)
              ? b.lessonLevelSeq
              : b.lessonGlobalSeq;
          if (aSeq !== bSeq) {
            return aSeq - bSeq;
          }
          return a.lessonGlobalSeq - b.lessonGlobalSeq;
        });

      return {
        levelCode,
        order: normalizedOrder,
        lessons: sortedLessons,
      } satisfies CoachPanelLessonJourneyLevel;
    });
  }, [journeyLessons]);

  const sortedLevels = useMemo(() => {
    return journeyLevels
      .map((level) => ({
        ...level,
        order: Number.isFinite(level.order)
          ? level.order
          : LEVEL_ORDER_INDEX.get(level.levelCode) ?? Number.POSITIVE_INFINITY,
      }))
      .sort((a, b) => {
        if (a.order !== b.order) {
          return a.order - b.order;
        }
        if (a.lessons.length && b.lessons.length) {
          const aSeq =
            typeof a.lessons[0].lessonLevelSeq === "number" &&
            Number.isFinite(a.lessons[0].lessonLevelSeq)
              ? a.lessons[0].lessonLevelSeq
              : a.lessons[0].lessonGlobalSeq;
          const bSeq =
            typeof b.lessons[0].lessonLevelSeq === "number" &&
            Number.isFinite(b.lessons[0].lessonLevelSeq)
              ? b.lessons[0].lessonLevelSeq
              : b.lessons[0].lessonGlobalSeq;
          if (aSeq !== bSeq) {
            return aSeq - bSeq;
          }
          return a.lessons[0].lessonGlobalSeq - b.lessons[0].lessonGlobalSeq;
        }
        return a.levelCode.localeCompare(b.levelCode, "es", { sensitivity: "base" });
      });
  }, [journeyLevels]);

  const renderLessonNode = (lesson: CoachPanelLessonJourneyEntry) => {
    const displayTitle = resolveLessonBubbleTitle(lesson);
    const tooltipTitle = resolveLessonTooltipTitle(lesson);
    const hoursLabel = formatHoursValue(lesson.hoursInLesson);
    const safeDays =
      typeof lesson.daysInLesson === "number" && Number.isFinite(lesson.daysInLesson)
        ? Math.max(0, Math.trunc(lesson.daysInLesson))
        : 0;
    const tooltipLines = [
      `Nivel ${lesson.levelCode}`,
      tooltipTitle,
      `⌛ ${hoursLabel}h • 📅 ${safeDays}d`,
    ];
    const circleClass = resolveLessonNodeCircleClass(lesson);
    const labelClass = resolveLessonNodeLabelClass(lesson);
    const showAqui = lesson.status === "current";
    const showCheck = lesson.status === "completed";

    return (
      <div
        key={`journey-lesson-${lesson.lessonGlobalSeq}-${lesson.lessonId ?? "na"}`}
        className="relative flex min-w-[60px] max-w-[72px] flex-col items-center pb-7 text-center"
        title={tooltipLines.join("\n")}
      >
        <div className={`${circleClass} z-20`}>
          <span className={labelClass}>{displayTitle}</span>
          {showCheck ? (
            <span className="absolute -bottom-1.5 -right-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-[10px] shadow-sm">
              ✅
            </span>
          ) : null}
        </div>
        <div className="pointer-events-none absolute left-1/2 top-[74%] z-10 -translate-x-1/2 flex flex-col items-center gap-[2px] rounded-md bg-white/95 px-2 py-1 text-[9px] font-medium leading-tight text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80">
          {showAqui ? (
            <span className="text-[9px] font-semibold text-[#0f9d8a]">Aquí estás</span>
          ) : null}
          <span>⌛ {hoursLabel}h</span>
          <span>📅 {safeDays}d</span>
        </div>
      </div>
    );
  };

  const planLevelMin = lessonJourney?.plannedLevelMin ?? profileHeader.planLevelMin ?? null;
  const planLevelMax = lessonJourney?.plannedLevelMax ?? profileHeader.planLevelMax ?? null;
  const planStartLabel = planLevelMin ?? "—";
  const planEndLabel = planLevelMax ?? "—";
  const planProgressPercent = formatPercent(profileHeader.planProgressPct, 0);
  const completedLessonsLabel = formatNumber(profileHeader.completedLessonsInPlan);
  const totalLessonsLabel = formatNumber(profileHeader.totalLessonsInPlan);


  const paceForecastLabel = paceForecast.forecastMonthsToFinishPlan != null
    ? `${formatNumber(paceForecast.forecastMonthsToFinishPlan, { maximumFractionDigits: 1 })} meses`
    : "Sin pronóstico";

  const gaugePercent = paceForecast.forecastMonthsToFinishPlan != null && paceForecast.forecastMonthsToFinishPlan > 0
    ? Math.min(1, paceForecast.forecastMonthsToFinishPlan / 12) * 100
    : null;

  const gaugeBackground = gaugePercent == null
    ? "conic-gradient(#e2e8f0 0deg, #e2e8f0 360deg)"
    : `conic-gradient(#0b9e8f ${gaugePercent * 3.6}deg, #e2e8f0 ${gaugePercent * 3.6}deg 360deg)`;

  const learnerSpeedLabel = data.learnerSpeed.label;
  const learnerSpeedTone = resolveSpeedTone(learnerSpeedLabel);
  const learnerSpeedText = translateSpeedLabel(learnerSpeedLabel);

  const rankPosition = data.leiRank.position;
  const rankCohort = data.leiRank.cohortSize;
  const rankPercent = data.leiRank.topPercent;

  const rankPieces: string[] = [];
  if (rankPosition != null) {
    const base = formatNumber(rankPosition);
    if (rankCohort != null) {
      rankPieces.push(`Posición: ${base} de ${formatNumber(rankCohort)}`);
    } else {
      rankPieces.push(`Posición: ${base}`);
    }
  } else if (rankCohort != null) {
    rankPieces.push(`Cohorte: ${formatNumber(rankCohort)} estudiantes`);
  }

  if (rankPercent != null && Number.isFinite(rankPercent)) {
    const normalizedPercent = formatPercent(rankPercent, 0);
    rankPieces.push(`Top ${normalizedPercent} del centro`);
  }

  const rankBadgeText = rankPieces.length ? rankPieces.join(" • ") : "Sin ranking disponible";
  const rankBadgeTitle =
    "Calculado usando todos los estudiantes activos (≥120 min/últimos 30 días).";

  return (
    <div className="relative flex flex-col gap-10">
      <section className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">Panel del coach</span>
            <h3 className="mt-2 text-2xl font-bold text-brand-deep">Recorrido de lecciones</h3>
            <p className="mt-1 text-sm text-brand-ink-muted">
              Vista general del recorrido planificado y tu posición actual en el plan.
            </p>
          </div>
          <div className="flex flex-col gap-1 text-sm text-brand-ink-muted lg:items-end">
            <span className="font-semibold text-brand-deep">
              Plan: {planStartLabel} → {planEndLabel}
            </span>
            <span>
              Progreso del plan: {planProgressPercent} • {completedLessonsLabel}/{totalLessonsLabel} lecciones completadas
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {sortedLevels.length ? (
            sortedLevels.map((level, levelIndex) => {
              const levelWrapperClasses =
                levelIndex === 0
                  ? "flex flex-col gap-3"
                  : "flex flex-col gap-3 border-t border-slate-200/70 pt-4";

              const nodeAlignment =
                level.lessons.length <= 1 ? "justify-center" : "justify-between";

              return (
                <div key={`journey-level-${level.levelCode}`} className={levelWrapperClasses}>
                  <div className="flex items-start gap-4">
                    <span className={resolveLevelBadgeClasses(level.levelCode)}>
                      {level.levelCode === "OTROS" ? "Otros" : level.levelCode}
                    </span>
                    {level.lessons.length ? (
                      <div className="relative min-w-0 flex-1">
                        <div className="relative w-full px-4 pb-7 pt-1">
                          <div className="pointer-events-none absolute inset-x-4 top-1/2 h-[2px] -translate-y-1/2 bg-slate-200" />
                          <div className={`relative flex w-full items-start ${nodeAlignment} gap-2`}>
                            {level.lessons.map((lesson) => renderLessonNode(lesson))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[88px] min-w-0 flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/70 px-4 text-sm text-slate-500">
                        Sin lecciones registradas.
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-brand-ink-muted/10 bg-white/80 px-4 py-3 text-sm text-brand-ink-muted shadow-sm">
              Sin lecciones planificadas.
            </div>
          )}
        </div>

      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6 rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">Engagement 30 días</span>
            <h4 className="mt-2 text-xl font-bold text-brand-deep">Tiempo de práctica</h4>
            <p className="mt-1 text-sm text-brand-ink-muted">
              Muestra la frecuencia y duración de las sesiones recientes.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-4 text-center">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Días activos</p>
              <p className="mt-2 text-xl font-bold text-brand-deep">
                {formatNumber(engagementStats.daysActive30d)}
              </p>
            </div>
            <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-4 text-center">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Horas totales</p>
              <p className="mt-2 text-xl font-bold text-brand-deep">
                {formatNumber(
                  engagementStats.totalHours30d ??
                    (engagementStats.totalMinutes30d != null
                      ? engagementStats.totalMinutes30d / 60
                      : null),
                  { maximumFractionDigits: 1 },
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-4 text-center">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Promedio sesión</p>
              <p className="mt-2 text-xl font-bold text-brand-deep">
                {formatNumber(engagementStats.avgSessionMinutes30d, { maximumFractionDigits: 0 })} min
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-ink-muted">Mapa de calor</p>
            <div className="mt-3 grid grid-cols-10 gap-2">
              {heatmapCells.map((cell) => (
                <div
                  key={cell.date}
                  className="h-8 w-full rounded-xl border border-white/40 shadow-sm"
                  style={{ backgroundColor: heatmapColor(cell.minutes, heatmapMaxMinutes) }}
                  title={`${formatDate(cell.date)} · ${formatNumber(cell.minutes, { maximumFractionDigits: 0 })} min`}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-brand-ink-muted">
              Intensidad de minutos estudiados cada día durante los últimos 30 días.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-6 rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">Eficiencia 30 días</span>
            <h4 className="mt-2 text-xl font-bold text-brand-deep">Eficiencia de aprendizaje</h4>
            <p className="mt-1 text-sm text-brand-ink-muted">
              Mide la velocidad (LEI) y el ritmo comparado con el resto del centro.
            </p>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-5 text-center">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Lecciones por hora</p>
              <p className="mt-2 text-4xl font-black text-brand-deep">
                {formatNumber(lei30dPlan, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-px w-full bg-brand-ink-muted/10" />
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${learnerSpeedTone}`}
                >
                  Ritmo de aprendizaje: {learnerSpeedText}
                </div>
                <div
                  className="inline-flex items-center gap-2 rounded-full border border-brand-ink-muted/20 bg-white/80 px-4 py-1.5 text-sm font-semibold text-brand-deep"
                  title={rankBadgeTitle}
                >
                  {rankBadgeText}
                </div>
              </div>
              <p className="text-xs text-brand-ink-muted">
                Comparado con todos los estudiantes activos del centro en los últimos 30 días.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6 rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">Hábitos</span>
          <h4 className="mt-2 text-xl font-bold text-brand-deep">Horas de estudio (últimos 30 días)</h4>
          <p className="mt-1 text-sm text-brand-ink-muted">
            Indica a qué horas estudia más el estudiante para detectar consistencia y oportunidades.
          </p>
        </div>
        <div className="rounded-2xl border border-brand-ink-muted/10 bg-white/80 p-4">
          <StudyHoursHistogram data={data.studyHistogram.hourly} summary={data.studyHistogram.summary} />
        </div>
      </section>

      <section className="flex flex-col gap-6 rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">Pace & forecast</span>
          <h4 className="text-xl font-bold text-brand-deep">Pronóstico del plan</h4>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex items-center gap-4">
            <div
              className="flex h-32 w-32 items-center justify-center rounded-full border border-white/70 bg-white shadow-inner"
              style={{ background: gaugeBackground }}
            >
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white text-center shadow">
                <span className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Forecast</span>
                <span className="mt-1 text-xl font-bold text-brand-deep">{paceForecastLabel}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm text-brand-ink-muted">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-ink-muted/80">Lecciones restantes</p>
                <p className="text-lg font-semibold text-brand-deep">
                  {formatNumber(paceForecast.lessonsRemaining)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-ink-muted/80">Progreso del plan</p>
                <p className="text-lg font-semibold text-brand-deep">
                  {formatPercent(paceForecast.planProgressPct, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-ink-muted/80">Estado</p>
                <p className="text-lg font-semibold text-brand-deep">
                  {profileHeader.onPacePlan ? "En ritmo" : "Requiere atención"}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-5">
            <p className="text-sm text-brand-ink-muted">
              Mantener una velocidad de finalización menor o igual a seis meses asegura que el estudiante aproveche su plan.
              {paceForecast.forecastMonthsToFinishPlan != null
                ? ` Con el ritmo actual terminaría en aproximadamente ${paceForecastLabel}.`
                : ""}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
