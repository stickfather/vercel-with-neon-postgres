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

type RenderedLesson = CoachPanelLessonJourneyEntry & {
  isCurrent: boolean;
  isCompletedVisual: boolean;
  minutesValue: number;
  daysValue: number;
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

  const lessonLevels = Array.isArray(lessonJourney?.levels)
    ? lessonJourney.levels
    : [];

  const lessonRows = useMemo(() => {
    const grouped = new Map<string, CoachPanelLessonJourneyLevel>();

    lessonLevels.forEach((level) => {
      const key = level.levelCode?.trim().toUpperCase() || "OTROS";
      grouped.set(key, {
        ...level,
        levelCode: key,
        lessons: level.lessons.map((lesson) => ({
          ...lesson,
          levelCode: lesson.levelCode?.trim().toUpperCase() || key,
        })),
      });
    });

    const decorateLessons = (
      level: CoachPanelLessonJourneyLevel,
    ): RenderedLesson[] => {
      const sorted = [...level.lessons].sort((a, b) => {
        const aSeq =
          a.lessonGlobalSeq != null && Number.isFinite(a.lessonGlobalSeq)
            ? a.lessonGlobalSeq
            : a.seqNumber != null && Number.isFinite(a.seqNumber)
              ? a.seqNumber
              : Number.POSITIVE_INFINITY;
        const bSeq =
          b.lessonGlobalSeq != null && Number.isFinite(b.lessonGlobalSeq)
            ? b.lessonGlobalSeq
            : b.seqNumber != null && Number.isFinite(b.seqNumber)
              ? b.seqNumber
              : Number.POSITIVE_INFINITY;
        if (aSeq === bSeq) return 0;
        return aSeq < bSeq ? -1 : 1;
      });

      const highestSeq = level.highestSeqWithActivity;

      let nextSeq: number | null = null;
      if (sorted.length) {
        if (highestSeq == null) {
          const firstWithSeq = sorted.find((lesson) =>
            lesson.seqNumber != null && Number.isFinite(lesson.seqNumber),
          );
          nextSeq = firstWithSeq?.seqNumber ?? null;
        } else {
          const candidate = sorted.find(
            (lesson) =>
              lesson.seqNumber != null &&
              Number.isFinite(lesson.seqNumber) &&
              Number(lesson.seqNumber) > highestSeq,
          );
          nextSeq = candidate?.seqNumber ?? null;
        }
      }

      return sorted.map((lesson, index) => {
        const seqValue =
          lesson.seqNumber != null && Number.isFinite(lesson.seqNumber)
            ? Number(lesson.seqNumber)
            : null;
        const isCompleted =
          highestSeq != null && seqValue != null ? seqValue <= highestSeq : false;
        const isCurrent =
          nextSeq != null
            ? seqValue != null && seqValue === nextSeq
            : highestSeq == null && index === 0;

        const rawMinutes =
          typeof lesson.minutesSpent === "number" ? lesson.minutesSpent : 0;
        const minutesValue = Number.isFinite(rawMinutes)
          ? Math.max(0, rawMinutes)
          : 0;

        const rawDays =
          typeof lesson.calendarDaysSpent === "number"
            ? lesson.calendarDaysSpent
            : 0;
        const daysValue = Number.isFinite(rawDays)
          ? Math.max(0, Math.trunc(rawDays))
          : 0;

        return {
          ...lesson,
          levelCode: lesson.levelCode ?? level.levelCode,
          isCurrent,
          isCompletedVisual: isCompleted,
          minutesValue,
          daysValue,
        } satisfies RenderedLesson;
      });
    };

    const rows: Array<{
      key: string;
      label: string;
      level: CoachPanelLessonJourneyLevel;
      lessons: RenderedLesson[];
    }> = [];

    PLAN_LEVEL_ORDER.forEach((levelCode) => {
      const level = grouped.get(levelCode);
      if (!level) {
        return;
      }
      rows.push({
        key: levelCode,
        label: levelCode,
        level,
        lessons: decorateLessons(level),
      });
      grouped.delete(levelCode);
    });

    const remaining = Array.from(grouped.entries()).sort(([a], [b]) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    );

    remaining.forEach(([key, level]) => {
      rows.push({
        key,
        label: key === "OTROS" ? "Otros" : key,
        level,
        lessons: decorateLessons(level),
      });
    });

    return rows;
  }, [lessonLevels]);

  const renderLessonBubble = (lesson: RenderedLesson) => {
    const isExamBubble = lesson.specialType === "exam";
    const isCurrent = lesson.isCurrent;
    const isCompleted = lesson.isCompletedVisual;

    const hoursValue = lesson.minutesValue / 60;
    const daysValue = lesson.daysValue;

    const hasEffort = lesson.hasActivity || lesson.minutesValue > 0 || daysValue > 0;

    const lessonTooltipLines: string[] = [
      `Nivel ${lesson.levelCode ?? "—"} · ${lesson.lessonTitle ?? "Lección"}`,
      `Tiempo dedicado: ${hoursValue.toFixed(1)} horas`,
      `Días activos: ${formatNumber(daysValue, { maximumFractionDigits: 0 })}`,
    ];

    const lessonTooltip = lessonTooltipLines.join("\n");

    const bubbleLabel =
      lesson.specialType === "intro"
        ? "Cuadernillo de introducción"
        : lesson.specialType === "exam"
          ? "Preparación para el examen"
          : lesson.lessonTitle ??
            (lesson.seqNumber != null
              ? `Lección ${formatNumber(lesson.seqNumber, { maximumFractionDigits: 0 })}`
              : "—");

    return (
      <div
        key={`lesson-${
          lesson.lessonGlobalSeq ?? `${lesson.levelCode ?? "nivel"}-${lesson.seqNumber ?? "?"}`
        }`}
        className="flex flex-col items-center gap-1 text-center"
        title={lessonTooltip}
      >
        <div
          className={cx(
            "relative flex h-12 w-12 items-center justify-center rounded-full border-2 px-1 text-[10px] font-semibold",
            isExamBubble ? "h-12 w-12 uppercase" : "",
            isCurrent
              ? "border-brand-teal bg-white text-brand-deep shadow-[0_0_0_4px_rgba(255,255,255,0.7)]"
              : isCompleted
                ? "border-brand-teal bg-brand-teal text-white shadow-[0_12px_24px_rgba(2,132,199,0.24)]"
                : "border-brand-teal/50 bg-white text-brand-deep",
          )}
        >
          {isCurrent ? (
            <span
              aria-hidden="true"
              className="absolute inset-0 -m-[6px] rounded-full border-2 border-brand-teal/50 animate-pulse"
            />
          ) : null}
          <span className="px-1 text-[10px] font-semibold leading-tight">
            {bubbleLabel}
          </span>
        </div>
        <span
          className={cx(
            "flex items-center gap-1 text-[10px]",
            hasEffort ? "text-brand-deep" : "text-brand-ink-muted/60",
          )}
        >
          <span aria-hidden="true">🕒</span>
          {hoursValue.toFixed(1)}h • {formatNumber(daysValue, { maximumFractionDigits: 0 })}d
        </span>
      </div>
    );
  };


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
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">Panel del coach</span>
            <h3 className="mt-2 text-2xl font-bold text-brand-deep">Recorrido de lecciones</h3>
          </div>
          <p className="text-sm text-brand-ink-muted">
            Vista general del recorrido planificado y el progreso alcanzado.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {lessonRows.map((row) => (
            <div key={`lesson-row-${row.key}`} className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <span className="inline-flex w-fit min-w-[60px] items-center justify-center rounded-full bg-brand-teal-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-teal">
                  {row.label}
                </span>
                {row.lessons.length ? (
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    {row.lessons.map((lesson) => renderLessonBubble(lesson))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-brand-ink-muted/10 bg-white/80 px-3 py-2 text-sm text-brand-ink-muted shadow-sm">
                    Sin lecciones registradas.
                  </div>
                )}
              </div>
            </div>
          ))}
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
