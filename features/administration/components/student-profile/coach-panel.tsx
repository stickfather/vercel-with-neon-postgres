"use client";

import { Fragment, useMemo } from "react";
import type { CSSProperties } from "react";

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

const LESSON_NODE_MIN_SIZE = 24;
const LESSON_NODE_MAX_SIZE = 38;
const LESSON_NODE_SIZE_VIEWPORT_FACTOR = 2.5;

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

function formatHoursValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "0";
  }
  const normalized = Math.max(0, value);
  const rounded = Number(normalized.toFixed(1));
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
}

function resolveLessonBubbleTitle(lesson: CoachPanelLessonJourneyEntry): string {
  if (lesson.isIntro) {
    return "Intro";
  }

  if (lesson.isExam) {
    return "Exam";
  }

  const levelSeq =
    typeof lesson.lessonLevelSeq === "number" && Number.isFinite(lesson.lessonLevelSeq)
      ? lesson.lessonLevelSeq
      : null;

  if (levelSeq != null) {
    return String(levelSeq);
  }

  const globalSeq =
    typeof lesson.lessonGlobalSeq === "number" && Number.isFinite(lesson.lessonGlobalSeq)
      ? lesson.lessonGlobalSeq
      : null;

  if (globalSeq != null) {
    return String(globalSeq);
  }

  const preferred = lesson.displayLabel?.trim() ?? "";
  const numericMatch = preferred.match(/\d+/);
  if (numericMatch) {
    return numericMatch[0];
  }

  return "—";
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

type LessonNodeAppearance = {
  fillColor: string;
  textColor: string;
  borderColor?: string;
  borderWidth?: number;
  glowShadow?: string;
  showCompletionCheck: boolean;
};

function resolveLessonNodeAppearance(lesson: CoachPanelLessonJourneyEntry): LessonNodeAppearance {
  if (lesson.status === "completed") {
    return {
      fillColor: "#28A745",
      textColor: "#FFFFFF",
      borderColor: "#1F7F34",
      borderWidth: 1.5,
      glowShadow: "0 4px 16px rgba(40,167,69,0.25)",
      showCompletionCheck: true,
    };
  }

  if (lesson.status === "current") {
    return {
      fillColor: "#3399FF",
      textColor: "#FFFFFF",
      borderColor: "#0F6BD9",
      borderWidth: 3,
      glowShadow: "0 0 0 6px rgba(51,153,255,0.28), 0 12px 24px rgba(28,126,219,0.22)",
      showCompletionCheck: false,
    };
  }

  if (lesson.isExam) {
    return {
      fillColor: "#2F8AE6",
      textColor: "#FFFFFF",
      borderColor: "#2F8AE6",
      borderWidth: 1.5,
      glowShadow: "0 8px 18px rgba(47,138,230,0.18)",
      showCompletionCheck: false,
    };
  }

  if (lesson.isIntro) {
    return {
      fillColor: "#2F8AE6",
      textColor: "#FFFFFF",
      borderColor: "#2F8AE6",
      borderWidth: 1.5,
      glowShadow: "0 6px 16px rgba(47,138,230,0.14)",
      showCompletionCheck: false,
    };
  }

  return {
    fillColor: "#D6E9FF",
    textColor: "#1C7EDB",
    borderColor: undefined,
    borderWidth: 0,
    showCompletionCheck: false,
  };
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

  const { profileHeader, lessonJourney } = data;

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
      `⏳ ${hoursLabel}h • 📅 ${safeDays}d`,
    ];
    const appearance = resolveLessonNodeAppearance(lesson);
    const nodeSizeValue = `clamp(${LESSON_NODE_MIN_SIZE}px, ${LESSON_NODE_SIZE_VIEWPORT_FACTOR}vw, ${LESSON_NODE_MAX_SIZE}px)`;
    const labelScale = lesson.isIntro || lesson.isExam ? 0.42 : 0.64;
    const labelFontSize = `calc(${nodeSizeValue} * ${labelScale})`;
    const metricsFontSize = `calc(${nodeSizeValue} * 0.24)`;
    const circleStyle: CSSProperties = {
      width: nodeSizeValue,
      height: nodeSizeValue,
      backgroundColor: appearance.fillColor,
      color: appearance.textColor,
      borderRadius: "9999px",
      border: appearance.borderWidth
        ? `${appearance.borderWidth}px solid ${appearance.borderColor ?? appearance.fillColor}`
        : appearance.borderColor
        ? `2px solid ${appearance.borderColor}`
        : "none",
      boxShadow: appearance.glowShadow,
      fontSize: labelFontSize,
      lineHeight: 1,
      fontFamily: '"Inter", "Roboto", "Helvetica Neue", sans-serif',
      letterSpacing: lesson.isIntro || lesson.isExam ? "0.02em" : "0",
    };

    const metricsStyle: CSSProperties = {
      fontSize: metricsFontSize,
      color: "#666666",
      lineHeight: 1.1,
      fontFamily: '"Inter", "Roboto", "Helvetica Neue", sans-serif',
    };

    return (
      <div
        className="relative flex flex-col items-center gap-1 text-center font-sans"
        title={tooltipLines.join("\n")}
      >
        <div className="relative flex items-center justify-center font-bold" style={circleStyle}>
          <span>{displayTitle}</span>
          {appearance.showCompletionCheck ? (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#28A745] text-xs font-semibold text-white shadow-sm">
              ✓
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1 text-xs" style={metricsStyle}>
          <span>⏳ {`${hoursLabel}h`}</span>
          <span>•</span>
          <span>📅 {`${safeDays}d`}</span>
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

  const sharedContainerClass = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

  return (
    <div className="relative flex flex-col gap-10">
      <section className={`${sharedContainerClass} space-y-6`}>
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

        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-brand-ink-muted">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-ink-muted/10 bg-white/70 px-3 py-1 shadow-sm">
            <span className="text-sm">⏳</span>
            <span>Horas en la lección</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-ink-muted/10 bg-white/70 px-3 py-1 shadow-sm">
            <span className="text-sm">📅</span>
            <span>Días en la lección</span>
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {sortedLevels.length > 0 &&
            sortedLevels.map((level, levelIndex) => {
              const levelWrapperClasses =
                levelIndex === 0
                  ? "flex flex-col gap-4"
                  : "flex flex-col gap-4 border-t border-slate-200/70 pt-4";

              const lessonCount = level.lessons.length;

              return (
                <div key={`journey-level-${level.levelCode}`} className={levelWrapperClasses}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Nivel {level.levelCode === "OTROS" ? "OT" : level.levelCode}
                      </h4>
                      <div className="h-px flex-1 bg-[#E0E0E0]" />
                    </div>
                    {lessonCount ? (
                      <div className="flex w-full items-center overflow-x-auto pb-0.5 md:pb-0">
                        <div className="flex w-full flex-nowrap items-center gap-1.5 md:gap-2">
                          {level.lessons.map((lesson, lessonIndex) => {
                            const key = `journey-lesson-${lesson.lessonGlobalSeq}-${lesson.lessonId ?? "na"}`;
                            const isLast = lessonIndex === lessonCount - 1;
                            return (
                              <Fragment key={key}>
                                {renderLessonNode(lesson)}
                                {!isLast ? (
                                  <div className="h-[2px] w-4 bg-[#E0E0E0] md:w-5 lg:w-6" />
                                ) : null}
                              </Fragment>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[132px] min-w-0 items-center justify-center rounded-3xl border border-dashed border-slate-200/80 bg-white/60 px-4 text-sm text-slate-500">
                        Sin lecciones registradas.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          {sortedLevels.length === 0 && (
            <div className="rounded-2xl border border-brand-ink-muted/10 bg-white/80 px-4 py-3 text-sm text-brand-ink-muted shadow-sm">
              Sin lecciones planificadas.
            </div>
          )}
        </div>

      </section>

      <section className={sharedContainerClass}>
        <div className="grid gap-6 lg:grid-cols-2">
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

    </div>
  );
}
