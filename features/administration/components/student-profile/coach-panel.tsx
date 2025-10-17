"use client";

import { useMemo, type ReactElement } from "react";

import type {
  CoachPanelEngagementHeatmapEntry,
  StudentCoachPanelSummary,
} from "@/features/administration/data/student-profile";

import { StudyHoursHistogram } from "./StudyHoursHistogram";

type CoachPanelProps = {
  data: StudentCoachPanelSummary | null;
  errorMessage?: string | null;
};

const HEATMAP_DAYS = 30;

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

  const journeyLessons = lessonJourney.lessons;
  const currentGlobalSeq = lessonJourney.currentPosition ?? null;

  const lessonElements: ReactElement[] = [];
  let lastLevel: string | null = null;
  journeyLessons.forEach((lesson, index) => {
    if (lesson.level && lesson.level !== lastLevel) {
      lastLevel = lesson.level;
      lessonElements.push(
        <div key={`level-${lesson.level}-${index}`} className="flex flex-col items-center gap-2 pr-4">
          <span className="rounded-full bg-brand-teal-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-brand-teal">
            {lesson.level}
          </span>
        </div>,
      );
    }

    const nextLessonLevel = journeyLessons[index + 1]?.level ?? null;
    const isExamBubble = Boolean(lesson.level) && lesson.level !== nextLessonLevel;
    const isCompleted = lesson.completed || (currentGlobalSeq != null && lesson.lessonGlobalSeq != null && lesson.lessonGlobalSeq < currentGlobalSeq);
    const isCurrent = currentGlobalSeq != null && lesson.lessonGlobalSeq === currentGlobalSeq;
    const bubbleLabel = isExamBubble ? "Exam" : lesson.seq ?? "?";
    const effort = lesson.effort;
    const showEffortBadges =
      effort != null &&
      (effort.isCompletedByPosition ?? true) &&
      effort.totalHours != null &&
      Number.isFinite(effort.totalHours) &&
      effort.totalHours > 0;

    const totalHoursDisplay =
      showEffortBadges && effort?.totalHours != null
        ? effort.totalHours.toFixed(1)
        : null;
    const calendarDaysDisplay =
      showEffortBadges &&
      effort?.calendarDaysBetween != null &&
      Number.isFinite(effort.calendarDaysBetween)
        ? formatNumber(effort.calendarDaysBetween, { maximumFractionDigits: 0 })
        : null;

    const tooltipLines: string[] = [];
    tooltipLines.push(
      `Nivel ${lesson.level ?? "—"} · Lección ${
        lesson.seq != null ? formatNumber(lesson.seq, { maximumFractionDigits: 0 }) : "—"
      }`,
    );

    if (effort) {
      tooltipLines.push(
        `Horas de estudio: ${
          effort.totalHours != null && Number.isFinite(effort.totalHours)
            ? effort.totalHours.toFixed(2)
            : "—"
        } h`,
      );
      tooltipLines.push(
        `Días entre inicio y fin: ${
          effort.calendarDaysBetween != null && Number.isFinite(effort.calendarDaysBetween)
            ? formatNumber(effort.calendarDaysBetween, { maximumFractionDigits: 0 })
            : "—"
        } d`,
      );
      tooltipLines.push(
        `Sesiones: ${
          effort.sessionsCount != null && Number.isFinite(effort.sessionsCount)
            ? formatNumber(effort.sessionsCount, { maximumFractionDigits: 0 })
            : "—"
        } · Días activos: ${
          effort.activeDaysForLesson != null && Number.isFinite(effort.activeDaysForLesson)
            ? formatNumber(effort.activeDaysForLesson, { maximumFractionDigits: 0 })
            : "—"
        }`,
      );
      tooltipLines.push(
        `Primera actividad: ${formatDate(effort.startedOn ?? null)} · Última actividad: ${formatDate(
          effort.finishedOn ?? null,
        )}`,
      );
    } else {
      tooltipLines.push("Sin actividad registrada para esta lección.");
    }

    const lessonTooltip = tooltipLines.join("\n");

    lessonElements.push(
      <div
        key={`lesson-${lesson.lessonGlobalSeq ?? index}`}
        className="flex flex-col items-center gap-3 pb-12 text-center"
      >
        <div
          className={cx(
            "relative flex items-center justify-center rounded-full border-2 font-semibold",
            isExamBubble ? "h-16 w-16 text-base" : "h-14 w-14 text-sm",
            isCurrent
              ? "border-brand-teal bg-white text-brand-deep shadow-[0_0_0_4px_rgba(255,255,255,0.7)]"
              : isCompleted
                ? "border-brand-teal bg-brand-teal text-white shadow-[0_14px_30px_rgba(2,132,199,0.28)]"
                : "border-brand-teal/50 bg-white text-brand-deep",
            effort?.isCompletedByPosition
              ? "ring-2 ring-emerald-300 ring-offset-2 ring-offset-white"
              : null,
          )}
          title={lessonTooltip}
        >
          {isCurrent ? (
            <span className="absolute inset-0 -m-[6px] rounded-full border-2 border-brand-teal/50 animate-pulse" aria-hidden="true" />
          ) : null}
          <span className={isExamBubble ? "uppercase tracking-wide" : undefined}>{bubbleLabel}</span>
          <div className="pointer-events-none absolute -bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
            {showEffortBadges ? (
              <>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-brand-deep shadow-sm ring-1 ring-brand-teal/10">
                  <span aria-hidden="true">⌛</span>
                  {totalHoursDisplay}h
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-brand-deep shadow-sm ring-1 ring-brand-teal/10">
                  <span aria-hidden="true">📅</span>
                  {calendarDaysDisplay ?? "—"}d
                </span>
              </>
            ) : (
              <span className="inline-flex items-center rounded-full border border-dashed border-brand-ink-muted/40 px-3 py-1 text-[11px] font-medium text-brand-ink-muted/50">
                —
              </span>
            )}
          </div>
        </div>
      </div>,
    );
  });

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
        <div className="overflow-x-auto pb-2">
          <div className="flex items-center gap-3">
            {lessonElements.length ? lessonElements : (
              <div className="rounded-2xl border border-brand-ink-muted/10 bg-white/80 px-6 py-4 text-sm text-brand-ink-muted shadow-sm">
                No hay lecciones planificadas.
              </div>
            )}
          </div>
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
