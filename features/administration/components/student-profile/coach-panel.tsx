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

const LEVEL_BADGE_STYLES: Record<string, { badgeBg: string; badgeText: string }> = {
  A1: { badgeBg: "bg-[#e6fbf7]", badgeText: "text-brand-teal" },
  A2: { badgeBg: "bg-[#fff2df]", badgeText: "text-[#c25e00]" },
  B1: { badgeBg: "bg-[#e7f0ff]", badgeText: "text-[#1d4ed8]" },
  B2: { badgeBg: "bg-[#f3e8ff]", badgeText: "text-[#7c3aed]" },
  C1: { badgeBg: "bg-[#ffe8f2]", badgeText: "text-[#be185d]" },
  C2: { badgeBg: "bg-[#fef3c7]", badgeText: "text-[#b45309]" },
};

const DEFAULT_LEVEL_BADGE_STYLE = { badgeBg: "bg-[#eef2ff]", badgeText: "text-brand-deep" };

const LESSON_STATUS_STYLES: Record<
  CoachPanelLessonJourneyEntry["status"],
  { container: string; accent: string }
> = {
  completed: {
    container: "border border-emerald-200/70 bg-emerald-50/80 text-emerald-700 shadow-sm shadow-emerald-100/60",
    accent: "text-emerald-600",
  },
  current: {
    container:
      "border-2 border-fuchsia-400/80 bg-white text-brand-deep shadow-[0_20px_35px_rgba(192,132,252,0.28)]",
    accent: "text-fuchsia-500",
  },
  upcoming: {
    container: "border border-sky-200/80 bg-sky-50/70 text-sky-700 shadow-sm shadow-sky-100/70",
    accent: "text-sky-600",
  },
};

function cx(...classes: Array<string | null | undefined | false>): string {
  return classes.filter(Boolean).join(" ");
}

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

function resolveLevelBadgeClasses(levelCode: string | null | undefined): string {
  const normalized = levelCode ? levelCode.trim().toUpperCase() : "";
  const style = LEVEL_BADGE_STYLES[normalized] ?? DEFAULT_LEVEL_BADGE_STYLE;
  return `${style.badgeBg} ${style.badgeText}`;
}

function formatHoursValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "0.0";
  }
  return value.toFixed(1);
}

function resolveLessonStatusStyle(status: CoachPanelLessonJourneyEntry["status"]) {
  return LESSON_STATUS_STYLES[status] ?? LESSON_STATUS_STYLES.upcoming;
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

        return {
          lessonId: normalizedLessonId,
          lessonGlobalSeq: normalizedGlobalSeq,
          lessonLevelSeq: normalizedLevelSeq,
          levelCode: normalizedLevelCode,
          lessonTitle: normalizedTitle,
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

  const renderLessonChip = (
    lesson: CoachPanelLessonJourneyEntry,
    options: { isFinalInLevel?: boolean } = {},
  ) => {
    const style = resolveLessonStatusStyle(lesson.status);
    const isFinal = Boolean(options.isFinalInLevel);
    const fallbackLabel = isFinal
      ? "Examen"
      : `Lección ${formatNumber(
          typeof lesson.lessonLevelSeq === "number" && Number.isFinite(lesson.lessonLevelSeq)
            ? lesson.lessonLevelSeq
            : lesson.lessonGlobalSeq,
          { maximumFractionDigits: 0 },
        )}`;
    const displayTitle = lesson.lessonTitle?.trim().length ? lesson.lessonTitle : fallbackLabel;
    const hoursLabel = `${formatHoursValue(lesson.hoursInLesson)}h`;
    const daysLabel = `${formatNumber(lesson.daysInLesson, { maximumFractionDigits: 0 })} días`;
    const tooltipLines = [
      `Nivel ${lesson.levelCode}`,
      displayTitle ?? "Lección",
      `${hoursLabel} • ${daysLabel}`,
    ];

    return (
      <div
        key={`journey-lesson-${lesson.lessonGlobalSeq}-${lesson.lessonId ?? "na"}`}
        className={cx(
          "flex min-w-[148px] flex-col gap-1.5 rounded-2xl border px-4 py-3 text-left transition",
          style.container,
        )}
        title={tooltipLines.join("\n")}
      >
        <div className="flex items-start gap-2">
          {lesson.status === "completed" ? (
            <span aria-hidden="true" className="mt-[2px] text-lg leading-none">
              ✅
            </span>
          ) : null}
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold leading-tight text-current">
              {displayTitle ?? "Lección"}
            </span>
            <span className={cx("text-xs font-semibold", style.accent)}>
              ⏳ {hoursLabel} • 📅 {daysLabel}
            </span>
            {lesson.status === "current" ? (
              <span className="text-xs font-semibold text-fuchsia-600">Aquí estás</span>
            ) : null}
          </div>
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
            sortedLevels.map((level) => (
              <div key={`journey-level-${level.levelCode}`} className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                  <span
                    className={cx(
                      "inline-flex w-fit min-w-[64px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em]",
                      resolveLevelBadgeClasses(level.levelCode),
                    )}
                  >
                    {level.levelCode === "OTROS" ? "Otros" : level.levelCode}
                  </span>
                  {level.lessons.length ? (
                    <div className="flex flex-1 items-stretch gap-3 overflow-x-auto pb-1 pr-1 md:pb-0">
                      {level.lessons.map((lesson, lessonIndex) =>
                        renderLessonChip(lesson, { isFinalInLevel: lessonIndex === level.lessons.length - 1 }),
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-brand-ink-muted/10 bg-white/80 px-4 py-3 text-sm text-brand-ink-muted shadow-sm">
                      Sin lecciones registradas.
                    </div>
                  )}
                </div>
              </div>
            ))
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
