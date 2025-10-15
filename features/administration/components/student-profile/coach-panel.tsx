"use client";

import type { StudentCoachPanelSummary } from "@/features/administration/data/student-profile";

type CoachPanelProps = {
  data: StudentCoachPanelSummary | null;
  errorMessage?: string | null;
};

function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatInteger(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function formatHours(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return `${formatDecimal(value, digits)} h`;
}

function normalizePercentValue(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  const raw = Math.abs(value) <= 1 ? value * 100 : value;
  if (!Number.isFinite(raw)) {
    return null;
  }
  return Math.min(100, Math.max(0, raw));
}

function formatPercent(value: number | null | undefined, digits = 1): string {
  const normalized = normalizePercentValue(value);
  if (normalized == null) {
    return "—";
  }
  const fractionDigits = normalized >= 10 ? Math.min(digits, 1) : digits;
  return `${formatDecimal(normalized, fractionDigits)}%`;
}

function formatUpdatedAt(date: string | null | undefined): string {
  if (!date) {
    return "—";
  }
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) {
    return date;
  }
  return new Intl.DateTimeFormat("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function formatDateLabel(date: string): string {
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) {
    return date;
  }
  return new Intl.DateTimeFormat("es-EC", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

type StudyTrendChartProps = {
  entries: StudentCoachPanelSummary["dailyStudy"];
};

type LessonEffortPoint = {
  lessonNumber: number;
  hours: number | null;
  hasData: boolean;
  isCompleted: boolean;
};

function buildLessonEffortSeries(
  data: StudentCoachPanelSummary,
): LessonEffortPoint[] | null {
  const totalLessons =
    data.journeyTotalLessons ??
    data.lessonPlan?.lessonsTotal ??
    (data.lessonPlan?.levelSegments.length
      ? data.lessonPlan.levelSegments[data.lessonPlan.levelSegments.length - 1]?.endIndex ?? null
      : null);

  if (totalLessons == null || !Number.isFinite(totalLessons) || totalLessons <= 0) {
    return null;
  }

  const completedCandidate =
    data.journeyCompletedLessons ??
    data.lessonPlan?.lessonsCompleted ??
    (data.lessonPlan?.currentLessonIndex != null
      ? Math.max(data.lessonPlan.currentLessonIndex - 1, 0)
      : null);

  const completedLessons = Math.max(
    0,
    Math.min(
      Math.trunc(totalLessons),
      completedCandidate != null && Number.isFinite(completedCandidate)
        ? Math.trunc(completedCandidate)
        : 0,
    ),
  );

  const baseSeries: LessonEffortPoint[] = Array.from(
    { length: Math.trunc(totalLessons) },
    (_, index) => ({
      lessonNumber: index + 1,
      hours: null,
      hasData: false,
      isCompleted: index + 1 <= completedLessons,
    }),
  );

  if (completedLessons === 0) {
    return baseSeries;
  }

  const dailyEntries = data.dailyStudy
    .slice()
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .map((entry) => {
      const hours =
        entry.hours != null && Number.isFinite(entry.hours)
          ? entry.hours
          : entry.minutes != null && Number.isFinite(entry.minutes)
            ? entry.minutes / 60
            : 0;
      return { hours, date: entry.date };
    })
    .filter((entry) => entry.hours > 0);

  if (!dailyEntries.length) {
    return baseSeries;
  }

  const buckets = Array.from({ length: completedLessons }, () => 0);

  dailyEntries.forEach((entry, index) => {
    const fraction = (index + 0.5) / dailyEntries.length;
    const rawIndex = Math.floor(fraction * completedLessons);
    const bucketIndex = Math.min(completedLessons - 1, Math.max(0, rawIndex));
    buckets[bucketIndex] += entry.hours;
  });

  buckets.forEach((hours, index) => {
    if (!Number.isFinite(hours)) {
      return;
    }
    baseSeries[index].hours = hours;
    baseSeries[index].hasData = hours > 0;
  });

  return baseSeries;
}

function StudyTrendChart({ entries }: StudyTrendChartProps) {
  if (!entries.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-brand-ink-muted">
        <span className="text-base font-semibold text-brand-deep">Aún no hay sesiones recientes.</span>
        <span>¡Vamos a practicar!</span>
      </div>
    );
  }

  const points = entries
    .slice()
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .map((entry) => ({
      date: entry.date,
      minutes:
        entry.minutes != null && Number.isFinite(entry.minutes)
          ? entry.minutes
          : entry.hours * 60,
    }));

  const maxMinutes = points.reduce((max, point) => (point.minutes > max ? point.minutes : max), 0);
  const safeMax = maxMinutes > 0 ? maxMinutes : 60;

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden rounded-xl border border-brand-deep-soft/40 bg-white/80">
        <div className="absolute inset-0 flex items-end gap-[6px] px-3 pb-3 pt-6">
          {points.map((point) => {
            const height = Math.max(4, (point.minutes / safeMax) * 100);
            return (
              <div
                key={`${point.date}-${point.minutes}`}
                className="flex-1 rounded-t-xl bg-gradient-to-t from-brand-teal/40 via-brand-teal/70 to-brand-teal"
                style={{ height: `${height}%` }}
                title={`${formatDateLabel(point.date)} · ${formatInteger(point.minutes)} minutos`}
              />
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex justify-between text-[11px] uppercase tracking-wide text-brand-ink-muted">
        <span>{formatDateLabel(points[0].date)}</span>
        <span>{formatDateLabel(points[points.length - 1].date)}</span>
      </div>
      <p className="mt-3 text-xs text-brand-ink-muted">Cada punto representa el tiempo total estudiado ese día.</p>
    </div>
  );
}

export function CoachPanel({ data, errorMessage }: CoachPanelProps) {
  const updatedLabel = formatUpdatedAt(data?.latestActivityDate ?? null);

  if (!data) {
    return (
      <section className="flex h-full flex-col gap-6 rounded-[28px] border border-white/70 bg-white/92 px-6 py-6 text-brand-deep shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-2xl font-bold text-brand-deep">Panel del coach</h2>
            <p className="text-sm text-brand-ink-muted">Visión general de esfuerzo, constancia y progreso.</p>
            <span className="text-xs uppercase tracking-wide text-brand-ink-muted">
              Datos actualizados al: {updatedLabel}
            </span>
            {errorMessage ? (
              <p className="text-sm font-medium text-rose-600">{errorMessage}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-1 flex-col items-start justify-center gap-3 rounded-2xl border border-dashed border-brand-ink-muted/30 bg-white/70 px-6 py-10">
          <span className="text-lg font-semibold text-brand-deep">Sin actividad reciente</span>
          <p className="max-w-md text-sm text-brand-ink-muted">
            No encontramos registros recientes de esfuerzo o progreso en los últimos 30 días para este estudiante.
          </p>
        </div>
      </section>
    );
  }

  const journeyMinLevel = data.journeyMinLevel ?? data.lessonPlan?.plannedLevelMin ?? "—";
  const journeyMaxLevel = data.journeyMaxLevel ?? data.lessonPlan?.plannedLevelMax ?? "—";
  const journeyPercent = normalizePercentValue(data.journeyProgressPct);
  const journeyLessonsLabel =
    data.journeyCompletedLessons != null && data.journeyTotalLessons != null
      ? `${formatInteger(data.journeyCompletedLessons)} / ${formatInteger(data.journeyTotalLessons)} lecciones`
      : "Sin datos";

  const lessonEffortSeries = buildLessonEffortSeries(data);
  const lessonPlan = data.lessonPlan;
  const levelSegments = lessonPlan?.levelSegments ?? [];
  const totalLessonsInJourney =
    lessonEffortSeries?.length ??
    data.journeyTotalLessons ??
    lessonPlan?.lessonsTotal ??
    null;

  const completedLessonsRaw =
    data.journeyCompletedLessons ??
    lessonPlan?.lessonsCompleted ??
    (lessonPlan?.currentLessonIndex != null
      ? Math.max(lessonPlan.currentLessonIndex - 1, 0)
      : null);

  const completedLessonsCount =
    totalLessonsInJourney != null && Number.isFinite(totalLessonsInJourney)
      ? Math.max(
          0,
          Math.min(
            Math.trunc(totalLessonsInJourney),
            completedLessonsRaw != null && Number.isFinite(completedLessonsRaw)
              ? Math.trunc(completedLessonsRaw)
              : 0,
          ),
        )
      : completedLessonsRaw != null && Number.isFinite(completedLessonsRaw)
        ? Math.max(0, Math.trunc(completedLessonsRaw))
        : 0;

  const progressPercent =
    totalLessonsInJourney && totalLessonsInJourney > 0
      ? Math.min(100, Math.max(0, (completedLessonsCount / totalLessonsInJourney) * 100))
      : journeyPercent ?? 0;

  const currentPercent =
    totalLessonsInJourney &&
    lessonPlan?.currentLessonIndex != null &&
    Number.isFinite(lessonPlan.currentLessonIndex) &&
    totalLessonsInJourney > 0
      ? Math.min(100, Math.max(0, (lessonPlan.currentLessonIndex / totalLessonsInJourney) * 100))
      : progressPercent;

  const recordedHoursTotal =
    lessonEffortSeries?.reduce(
      (sum, point) => sum + (point.hasData && point.hours != null ? point.hours : 0),
      0,
    ) ?? 0;

  const lessonsWithRecordedHours =
    lessonEffortSeries?.filter((point) => point.hasData && point.hours != null).length ?? 0;

  const averageHoursPerLesson =
    lessonsWithRecordedHours > 0 ? recordedHoursTotal / lessonsWithRecordedHours : null;

  const maxRecordedHours =
    lessonEffortSeries && lessonEffortSeries.length
      ? lessonEffortSeries.reduce((max, point) => {
          if (!point.hasData || point.hours == null) {
            return max;
          }
          return point.hours > max ? point.hours : max;
        }, 0)
      : 0;

  const journeyPercentWidth = journeyPercent ?? progressPercent ?? 0;

  const journeyProgressLabel = formatPercent(data.journeyProgressPct);

  const lifetimeMetrics = [
    {
      key: "planned-level",
      label: "Nivel planificado",
      value: `${journeyMinLevel} → ${journeyMaxLevel}`,
      helper: "Inicio y meta de tu recorrido actual.",
    },
    {
      key: "progress",
      label: "Avance total",
      value: formatPercent(data.journeyProgressPct),
      helper: "Porcentaje del plan completado.",
    },
    {
      key: "lessons",
      label: "Lecciones completadas",
      value: journeyLessonsLabel,
      helper: "Lecciones terminadas del recorrido planificado.",
    },
    {
      key: "hours",
      label: "Horas acumuladas",
      value:
        data.totalHoursLifetime != null && Number.isFinite(data.totalHoursLifetime)
          ? `${formatDecimal(data.totalHoursLifetime, 1)} h`
          : "—",
      helper: "Total de horas dedicadas desde el inicio.",
    },
    {
      key: "days",
      label: "Días activos",
      value: formatInteger(data.totalActiveDaysLifetime),
      helper: "Días en los que asististe a sesiones.",
    },
    {
      key: "lei",
      label: "LEI global",
      value: formatDecimal(data.leiGlobalLifetime, 2),
      helper: "Lecciones por hora acumuladas.",
    },
  ];

  const ritmoMetrics = [
    {
      key: "lei-30d",
      label: "LEI (30d)",
      value: formatDecimal(data.lei30d, 2),
      helper: "Lecciones ganadas por hora este mes.",
    },
    {
      key: "lei-ratio",
      label: "Ratio (LEI/Objetivo)",
      value: data.leiRatio != null && Number.isFinite(data.leiRatio)
        ? `${formatInteger(data.leiRatio * 100)}%`
        : "—",
      helper: "Porcentaje del objetivo de eficiencia alcanzado.",
    },
    {
      key: "hours-30d",
      label: "Horas (30d)",
      value:
        data.hours30d != null && Number.isFinite(data.hours30d)
          ? `${formatDecimal(data.hours30d, data.hours30d >= 10 ? 0 : 1)} h`
          : "—",
      helper: "Total de horas estudiadas este mes.",
    },
    {
      key: "days-30d",
      label: "Días activos (30d)",
      value: formatInteger(data.daysActive30d),
      helper: "Días con actividad en los últimos 30 días.",
    },
  ];

  const forecastLabel =
    data.forecastMonthsToFinish != null && Number.isFinite(data.forecastMonthsToFinish)
      ? `${formatDecimal(data.forecastMonthsToFinish, data.forecastMonthsToFinish >= 10 ? 0 : 1)} meses`
      : "Sin dato";

  const riskBadges = [
    {
      key: "forecast",
      label: "Meses estimados",
      value: forecastLabel,
      tone: "border-sky-200 bg-sky-50 text-sky-700",
      title: "Tiempo estimado para alcanzar tu nivel objetivo máximo.",
    },
    {
      key: "on-pace",
      label: "Ritmo vs plan",
      value:
        data.onPace == null ? "Dato insuficiente" : data.onPace ? "En ritmo" : "Fuera de ritmo",
      tone:
        data.onPace == null
          ? "border-slate-200 bg-slate-50 text-slate-700"
          : data.onPace
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700",
      title: "Indica si tu progreso coincide con el plan establecido.",
    },
    {
      key: "stall",
      label: "Estancamiento",
      value: data.riskStall ? "En revisión" : "Sin alerta",
      tone: data.riskStall
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700",
      title: "Señala si hubo una pausa prolongada en el avance.",
    },
    {
      key: "inactive",
      label: "Inactividad 14d",
      value: data.riskInactive14d ? "Sí" : "No",
      tone: data.riskInactive14d
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700",
      title: "Informa si no hubo registro de estudio por 14 días o más.",
    },
    {
      key: "repeats",
      label: "Lecciones repetidas",
      value: formatInteger(data.repeatsAtLast),
      tone:
        data.repeatsAtLast != null && data.repeatsAtLast > 0
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-50 text-slate-700",
      title: "Número de lecciones repetidas en la última revisión.",
    },
  ];

  return (
    <section className="flex h-full flex-col gap-6 rounded-[28px] border border-white/70 bg-white/92 px-6 py-6 text-brand-deep shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-2xl font-bold text-brand-deep">Panel del coach</h2>
          <p className="text-sm text-brand-ink-muted">Visión general de esfuerzo, constancia y progreso.</p>
          <span className="text-xs uppercase tracking-wide text-brand-ink-muted">
            Datos actualizados al: {updatedLabel}
          </span>
          {errorMessage ? (
            <p className="text-sm font-medium text-rose-600">{errorMessage}</p>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-teal-soft/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal">
          <span>Nivel {data.levelCode ?? "—"}</span>
          <span className="text-brand-ink-muted">·</span>
          <span>Lección {formatInteger(data.lessonSeq)}</span>
        </span>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/95 px-5 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-deep">Desde el inicio</h3>
          <span className="text-sm text-brand-ink-muted">Resumen del recorrido completo</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lifetimeMetrics.map((metric) => (
            <article
              key={metric.key}
              className="flex flex-col gap-2 rounded-xl border border-brand-deep-soft/40 bg-white/80 p-4"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                {metric.label}
              </span>
              <span className="text-2xl font-bold text-brand-deep">{metric.value}</span>
              <span className="text-[11px] text-brand-ink-muted">{metric.helper}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/95 px-5 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-deep">Trayectoria completa</h3>
          <span className="text-sm text-brand-ink-muted">{journeyMinLevel} → {journeyMaxLevel}</span>
        </div>
        {lessonEffortSeries ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-brand-ink-muted">
              <span>{journeyMinLevel} · Inicio del plan</span>
              <span>{journeyMaxLevel} · Meta planificada</span>
            </div>
            <div className="px-3">
              <div className="relative h-36 overflow-hidden rounded-xl border border-brand-deep-soft/40 bg-white/85">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-deep-soft/20 via-white/20 to-white/60" aria-hidden />
                <div
                  className="absolute inset-y-0 left-0 bg-brand-teal-soft/30"
                  style={{ width: `${journeyPercentWidth}%` }}
                  aria-hidden
                />
                {levelSegments.map((segment) => (
                  <div
                    key={`${segment.levelCode ?? segment.levelLabel ?? "nivel"}-${segment.startIndex}`}
                    className="pointer-events-none absolute inset-y-0 border-r border-white/60"
                    style={{ left: `${segment.endPercent}%` }}
                    aria-hidden
                  />
                ))}
                <div className="absolute inset-x-0 bottom-0 top-0 flex items-end gap-[1px] pb-4 pt-6">
                  {lessonEffortSeries.map((point) => {
                    const safeMax = maxRecordedHours > 0 ? maxRecordedHours : 1;
                    const baseHeight = point.hasData
                      ? Math.max(10, ((point.hours ?? 0) / safeMax) * 100)
                      : point.isCompleted
                        ? 8
                        : 4;
                    const barClass = point.hasData
                      ? "bg-gradient-to-t from-brand-teal/40 via-brand-teal/70 to-brand-teal"
                      : point.isCompleted
                        ? "bg-brand-deep-soft/70"
                        : "bg-brand-deep-soft/30";
                    const title = point.hasData
                      ? `Lección ${point.lessonNumber}: ${formatHours(
                          point.hours,
                          point.hours != null && point.hours >= 10 ? 0 : 1,
                        )} dedicadas`
                      : point.isCompleted
                        ? `Lección ${point.lessonNumber}: sin horas registradas recientemente`
                        : `Lección ${point.lessonNumber}: pendiente`;
                    return (
                      <div
                        key={`lesson-${point.lessonNumber}`}
                        className={`flex-1 rounded-t-full ${barClass}`}
                        style={{ height: `${baseHeight}%`, minWidth: "2px" }}
                        title={title}
                      />
                    );
                  })}
                </div>
                {totalLessonsInJourney ? (
                  <div
                    className="pointer-events-none absolute -top-2 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-brand-deep shadow"
                    style={{ left: `${currentPercent}%` }}
                    title={
                      lessonPlan?.currentLessonLabel ??
                      (lessonPlan?.currentLessonIndex != null
                        ? `Lección ${formatInteger(lessonPlan.currentLessonIndex)}`
                        : "Lección actual")
                    }
                  />
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-brand-ink-muted">
              <span className="font-semibold text-brand-deep">{journeyLessonsLabel}</span>
              <span>{journeyProgressLabel} completado</span>
              <span>
                Horas registradas: {formatHours(recordedHoursTotal, recordedHoursTotal >= 10 ? 0 : 1)}
                {" · "}
                {averageHoursPerLesson != null
                  ? `≈ ${formatHours(
                      averageHoursPerLesson,
                      averageHoursPerLesson >= 10 ? 0 : 1,
                    )} por lección`
                  : "Sin registro por lección"}
              </span>
            </div>
            <p className="text-xs text-brand-ink-muted">
              Horas aproximadas dedicadas por lección completada según los minutos registrados en este recorrido. El nivel
              inicial comienza en la primera lección planificada y concluye en la última lección del nivel objetivo.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="relative h-4 overflow-hidden rounded-full bg-brand-deep-soft/30">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-brand-teal-soft/80"
                style={{ width: `${journeyPercentWidth}%` }}
                aria-hidden
              />
            </div>
            <div className="flex justify-between text-xs text-brand-ink-muted">
              <span>{journeyMinLevel}</span>
              <span>{journeyMaxLevel}</span>
            </div>
            <p className="text-xs text-brand-ink-muted">
              No contamos con datos de estudio suficientes para graficar por lección, pero aquí se muestra tu avance total
              dentro del plan.
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/95 px-5 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-deep">Ritmo actual</h3>
          <span className="text-sm text-brand-ink-muted">Indicadores de los últimos 30 días</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ritmoMetrics.map((metric) => (
            <article
              key={metric.key}
              className="flex flex-col gap-2 rounded-xl border border-brand-deep-soft/40 bg-white/80 p-4"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                {metric.label}
              </span>
              <span className="text-2xl font-bold text-brand-deep">{metric.value}</span>
              <span className="text-[11px] text-brand-ink-muted">{metric.helper}</span>
            </article>
          ))}
        </div>
        <p className="text-xs text-brand-ink-muted">Basado en tu actividad de los últimos 30 días.</p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/95 px-5 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-deep">Pronóstico y riesgos</h3>
          <span className="text-sm text-brand-ink-muted">Alertas para ajustar el acompañamiento</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {riskBadges.map((badge) => (
            <span
              key={badge.key}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badge.tone}`}
              title={badge.title}
            >
              <span className="uppercase tracking-wide">{badge.label}</span>
              <span className="text-brand-deep">{badge.value}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/95 px-5 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-deep">Estudio diario</h3>
          <span className="text-sm text-brand-ink-muted">Últimos 30 días de práctica</span>
        </div>
        <StudyTrendChart entries={data.dailyStudy} />
      </section>
    </section>
  );
}

export function CoachPanelSkeleton() {
  return (
    <section className="flex h-full flex-col gap-6 rounded-[28px] border border-white/70 bg-white/92 px-6 py-6 shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="h-6 w-48 rounded-full bg-brand-deep-soft/60" />
          <span className="h-4 w-64 rounded-full bg-brand-deep-soft/40" />
        </div>
        <span className="h-8 w-40 rounded-full bg-brand-teal-soft/60" />
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className="h-32 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm"
        >
          <span className="block h-full w-full rounded-xl bg-brand-deep-soft/40" />
        </div>
      ))}
    </section>
  );
}
