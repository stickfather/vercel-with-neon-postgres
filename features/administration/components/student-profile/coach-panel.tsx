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

function formatHours(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return `${formatDecimal(value, 1)} h`;
}

function formatWeeklyDays(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return `${formatDecimal(value, 1)} días`;
}

function formatLastSession(days: number | null | undefined): string {
  if (days == null || !Number.isFinite(days)) {
    return "Última visita: —";
  }
  if (days <= 0) {
    return "Última visita: hoy";
  }
  if (days === 1) {
    return "Última visita: hace 1 día";
  }
  return `Última visita: hace ${formatInteger(days)} días`;
}

function formatLastSessionSummary(days: number | null | undefined): string {
  if (days == null || !Number.isFinite(days)) {
    return "Última sesión: sin registro";
  }
  if (days <= 0) {
    return "Última sesión: hoy";
  }
  if (days === 1) {
    return "Última sesión: hace 1 día";
  }
  return `Última sesión: hace ${formatInteger(days)} días`;
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

function formatForecast(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "Pronóstico no disponible";
  }
  const digits = value >= 10 ? 0 : 1;
  return `Pronóstico: ${formatDecimal(value, digits)} meses`;
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

function formatMinutesLabel(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return `${formatInteger(value)} min`;
}

function formatHoursPerWeek(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours)) {
    return "—";
  }
  const weekly = hours / 4.345;
  const digits = weekly >= 10 ? 0 : 1;
  return `${formatDecimal(weekly, digits)} h`;
}

function getOnPaceStatus(data: StudentCoachPanelSummary) {
  const forecast = data.forecastMonthsToFinish;
  const hasForecast = forecast != null && Number.isFinite(forecast);
  const forecastLabel = hasForecast
    ? `${formatDecimal(forecast, forecast >= 10 ? 0 : 1)} meses`
    : "Sin dato";

  if (data.onPace === true) {
    return {
      icon: "✅",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      title: "En ritmo",
      message: "Pronóstico saludable",
      forecastLabel,
    } as const;
  }
  if (data.onPace === false) {
    return {
      icon: "❌",
      tone: "border-rose-200 bg-rose-50 text-rose-700",
      title: "Fuera de ritmo",
      message: "Requiere refuerzo",
      forecastLabel,
    } as const;
  }
  return {
    icon: "ℹ️",
    tone: "border-slate-200 bg-slate-50 text-slate-600",
    title: "Dato insuficiente",
    message: "Aún sin pronóstico",
    forecastLabel,
  } as const;
}

function getLeiTrendIndicator(delta: number | null | undefined) {
  if (delta == null || !Number.isFinite(delta)) {
    return { icon: "→", tone: "text-brand-ink-muted", label: "Sin cambio" } as const;
  }
  if (delta > 0) {
    return {
      icon: "▲",
      tone: "text-emerald-600",
      label: `Subió ${formatDecimal(delta, Math.abs(delta) >= 10 ? 0 : 2)}`,
    } as const;
  }
  if (delta < 0) {
    return {
      icon: "▼",
      tone: "text-rose-600",
      label: `Bajó ${formatDecimal(Math.abs(delta), Math.abs(delta) >= 10 ? 0 : 2)}`,
    } as const;
  }
  return { icon: "→", tone: "text-brand-ink-muted", label: "Sin cambio" } as const;
}

function getRatioMeta(ratio: number | null | undefined) {
  if (ratio == null || !Number.isFinite(ratio)) {
    return {
      percent: 0,
      label: "Sin datos",
      tone: "text-brand-ink-muted",
      bar: "bg-slate-200",
    } as const;
  }
  const percent = Math.max(0, ratio * 100);
  if (ratio >= 1) {
    return {
      percent,
      label: "Meta cumplida",
      tone: "text-emerald-600",
      bar: "bg-emerald-500",
    } as const;
  }
  return {
    percent,
    label: "Por debajo del objetivo",
    tone: "text-amber-600",
    bar: "bg-amber-400",
  } as const;
}

function toIsoDate(value: string): string | null {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString().slice(0, 10);
}

function getLevelColor(levelCode: string | null | undefined): string {
  const normalized = levelCode?.toUpperCase() ?? "";
  if (normalized.startsWith("A1")) {
    return "bg-emerald-400";
  }
  if (normalized.startsWith("A2")) {
    return "bg-sky-400";
  }
  if (normalized.startsWith("B1")) {
    return "bg-amber-400";
  }
  if (normalized.startsWith("B2")) {
    return "bg-orange-500";
  }
  return "bg-brand-teal-soft/40";
}

function buildWeeklyActivityDots(entries: StudentCoachPanelSummary["dailyStudy"]) {
  if (!entries.length) {
    return [] as { date: string; label: string; active: boolean; minutes: number }[];
  }

  const formatter = new Intl.DateTimeFormat("es-EC", { weekday: "short" });
  const ordered = entries.slice().sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const lastEntry = ordered[ordered.length - 1];
  const lastIso = toIsoDate(lastEntry.date) ?? lastEntry.date;
  const baseDate = lastIso ? new Date(lastIso) : new Date();
  const byDate = new Map<string, StudentCoachPanelSummary["dailyStudy"][number]>();

  ordered.forEach((entry) => {
    const iso = toIsoDate(entry.date) ?? entry.date;
    if (!byDate.has(iso)) {
      byDate.set(iso, entry);
    }
  });

  const dots: { date: string; label: string; active: boolean; minutes: number }[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const current = new Date(baseDate);
    current.setDate(baseDate.getDate() - offset);
    const iso = current.toISOString().slice(0, 10);
    const entry = byDate.get(iso);
    const minutes = entry?.minutes ?? (entry?.hours != null ? entry.hours * 60 : 0);
    dots.push({
      date: iso,
      label: formatter.format(current),
      active: minutes >= 20,
      minutes,
    });
  }

  return dots;
}

function getForecastNarrative(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "Sin proyección disponible";
  }
  const digits = value >= 10 ? 0 : 1;
  return `${formatDecimal(value, digits)} meses`;
}

function getForecastScore(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) {
    return 0;
  }
  const clamped = Math.max(0, Math.min(18, value));
  return Math.round(((18 - clamped) / 18) * 100);
}

function buildQuickInterpretation(data: StudentCoachPanelSummary): string {
  const parts: string[] = [];
  if (data.onPace === true) {
    parts.push("Tu ritmo de aprendizaje se mantiene estable.");
  } else if (data.onPace === false) {
    parts.push("Necesitas reforzar el acompañamiento para mejorar el ritmo.");
  } else {
    parts.push("Estamos reuniendo más información sobre tu ritmo.");
  }

  if (data.hours30d != null && Number.isFinite(data.hours30d)) {
    parts.push(
      `Has estudiado ${formatDecimal(data.hours30d, data.hours30d >= 10 ? 0 : 1)} horas este mes`,
    );
  }

  if (data.avgSessionMinutes30d != null && Number.isFinite(data.avgSessionMinutes30d)) {
    parts.push(`con sesiones de ${formatInteger(data.avgSessionMinutes30d)} min en promedio.`);
  }

  if (data.levelCode) {
    const lessonLabel = formatLessonLabel(data.lessonPlan?.currentLessonLabel, data.lessonSeq);
    parts.push(`Estás en el nivel ${data.levelCode}, ${lessonLabel.toLowerCase()}.`);
  }

  if (data.forecastMonthsToFinish != null && Number.isFinite(data.forecastMonthsToFinish)) {
    const months = formatDecimal(
      data.forecastMonthsToFinish,
      data.forecastMonthsToFinish >= 10 ? 0 : 1,
    );
    parts.push(`Proyectas terminar en ${months} meses.`);
  }

  if (data.lessonsGained30d != null && Number.isFinite(data.lessonsGained30d)) {
    parts.push(
      `En los últimos 30 días sumaste ${formatInteger(data.lessonsGained30d)} lecciones nuevas.`,
    );
  }

  return parts.join(" ").trim();
}

function formatLessonLabel(label: string | null | undefined, fallbackSeq: number | null | undefined) {
  if (label && label.length > 0) {
    return label;
  }
  if (fallbackSeq == null || !Number.isFinite(fallbackSeq)) {
    return "Lección actual";
  }
  return `Lección ${formatInteger(fallbackSeq)}`;
}

function computeRiskBadge(data: StudentCoachPanelSummary) {
  if (data.riskAtRisk || data.riskStall) {
    return {
      label: "🔴 Riesgo alto",
      description: "Estancamiento o alerta automática. Prioriza intervención.",
      className: "text-rose-600",
      tone: "bg-rose-100",
    } as const;
  }
  if (data.riskInactive14d || data.onPace === false) {
    return {
      label: "🟠 Atención",
      description: "Inactividad moderada o ritmo por debajo de la meta.",
      className: "text-amber-600",
      tone: "bg-amber-100",
    } as const;
  }
  return {
    label: "✅ En ritmo",
    description: "Hábitos saludables, mantener seguimiento positivo.",
    className: "text-emerald-600",
    tone: "bg-emerald-100",
  } as const;
}

function clampPercent(value: number | null | undefined, fallback = 0) {
  if (value == null || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(100, Math.max(0, value));
}

const levelListFormatter = new Intl.ListFormat("es", {
  style: "short",
  type: "conjunction",
});

type LessonPlanSegment = NonNullable<
  StudentCoachPanelSummary["lessonPlan"]
>["levelSegments"][number];

function buildLevelNarrative({
  levelSegments,
  completedLessons,
  currentSegment,
  segmentPercent,
  globalPercent,
}: {
  levelSegments: LessonPlanSegment[];
  completedLessons: number | null | undefined;
  currentSegment: LessonPlanSegment | undefined;
  segmentPercent: number | null;
  globalPercent: number | null;
}): string | null {
  if (!levelSegments.length && globalPercent == null) {
    return null;
  }

  const completedLevelLabels = levelSegments
    .filter((segment) =>
      completedLessons != null ? completedLessons >= segment.endIndex : false,
    )
    .map((segment) => segment.levelLabel ?? segment.levelCode ?? null)
    .filter((label): label is string => Boolean(label));

  const narrativeParts: string[] = [];

  if (completedLevelLabels.length) {
    const formatted =
      completedLevelLabels.length === 1
        ? completedLevelLabels[0]
        : levelListFormatter.format(completedLevelLabels);
    narrativeParts.push(`Completó ${formatted}.`);
  }

  if (currentSegment) {
    const currentLabel = currentSegment.levelLabel ?? currentSegment.levelCode ?? "su nivel actual";
    if (segmentPercent != null) {
      narrativeParts.push(
        `Lleva ${formatDecimal(
          segmentPercent,
          segmentPercent >= 10 ? 0 : 1,
        )}% de ${currentLabel}.`,
      );
    } else {
      narrativeParts.push(`Actualmente cursa ${currentLabel}.`);
    }
  }

  const currentIndex = currentSegment ? levelSegments.indexOf(currentSegment) : -1;
  const nextSegment = currentIndex >= 0 ? levelSegments[currentIndex + 1] : null;
  if (nextSegment) {
    const nextLabel = nextSegment.levelLabel ?? nextSegment.levelCode ?? null;
    if (nextLabel) {
      if (segmentPercent != null && segmentPercent >= 75) {
        narrativeParts.push(`Entra pronto a ${nextLabel}.`);
      } else if (!currentSegment) {
        narrativeParts.push(`Próximo nivel objetivo: ${nextLabel}.`);
      }
    }
  }

  if (globalPercent != null) {
    narrativeParts.push(
      `Avance total ${formatDecimal(globalPercent, globalPercent >= 10 ? 0 : 1)}%.`,
    );
  }

  if (!narrativeParts.length) {
    return null;
  }

  return narrativeParts.join(" ");
}

export function CoachPanel({ data, errorMessage }: CoachPanelProps) {
  const updatedLabel = formatUpdatedAt(data?.latestActivityDate ?? null);
  const paceStatus = data ? getOnPaceStatus(data) : null;
  const ratioMeta = data ? getRatioMeta(data.leiRatio) : getRatioMeta(null);
  const weeklyDots = data ? buildWeeklyActivityDots(data.dailyStudy) : [];
  const quickInterpretation = data ? buildQuickInterpretation(data) : null;
  const forecastScore = data ? getForecastScore(data.forecastMonthsToFinish) : 0;
  const forecastNarrative = data ? getForecastNarrative(data.forecastMonthsToFinish) : "Sin proyección disponible";
  const leiTrend = data ? getLeiTrendIndicator(data.leiTrendDelta) : getLeiTrendIndicator(null);

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
        {data ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-teal-soft/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal">
            <span>Nivel {data.levelCode ?? "—"}</span>
            <span className="text-brand-ink-muted">·</span>
            <span>Lección {formatInteger(data.lessonSeq)}</span>
          </span>
        ) : null}
      </div>

      {!data ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-3 rounded-2xl border border-dashed border-brand-ink-muted/30 bg-white/70 px-6 py-10">
          <span className="text-lg font-semibold text-brand-deep">Sin actividad reciente</span>
          <p className="max-w-md text-sm text-brand-ink-muted">
            No encontramos registros recientes de esfuerzo o progreso en los últimos 30 días para este estudiante.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <article className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 py-4 shadow-sm">
              <div className={`flex items-start gap-3 rounded-xl border px-3 py-2 ${paceStatus?.tone ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
                <span className="text-2xl" aria-hidden>
                  {paceStatus?.icon ?? "ℹ️"}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wide">{paceStatus?.title ?? "Ritmo"}</span>
                  <span className="text-sm font-semibold">{paceStatus?.message ?? "Sin datos"}</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-brand-deep" title="Pronóstico de finalización">
                {data.forecastMonthsToFinish != null && Number.isFinite(data.forecastMonthsToFinish)
                  ? `${formatDecimal(data.forecastMonthsToFinish, data.forecastMonthsToFinish >= 10 ? 0 : 1)} meses`
                  : "Pronóstico no disponible"}
              </div>
              <p className="text-xs text-brand-ink-muted">{formatLastSession(data.lastSessionDaysAgo)}</p>
            </article>

            <article className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-brand-ink-muted">LEI (lecciones/hora)</h3>
                <span className="rounded-full bg-brand-teal-soft/60 px-2.5 py-1 text-xs font-semibold text-brand-teal" title="Meta institucional de lecciones por hora">
                  Meta {formatDecimal(data.targetLph, 2)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-brand-deep">{formatDecimal(data.lei30d, 2)}</span>
                <span className={`flex items-center gap-1 text-xs font-semibold ${leiTrend.tone}`} title="Comparado con el mes anterior">
                  <span>{leiTrend.icon}</span>
                  <span>{leiTrend.label}</span>
                </span>
              </div>
              <p className="text-xs text-brand-ink-muted">Velocidad de avance: más alto = mayor progreso por hora.</p>
            </article>

            <article className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-brand-ink-muted">Ratio (LEI / objetivo)</h3>
              <div className="flex items-baseline justify-between" title="Relación entre tu LEI y la meta">
                <span className="text-3xl font-bold text-brand-deep">
                  {data.leiRatio == null || !Number.isFinite(data.leiRatio)
                    ? "—"
                    : `${formatInteger(data.leiRatio * 100)}%`}
                </span>
                <span className={`text-xs font-semibold ${ratioMeta.tone}`}>{ratioMeta.label}</span>
              </div>
              <div className="relative h-2 w-full rounded-full bg-brand-deep-soft/30" title="Progreso hacia el objetivo">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${ratioMeta.bar}`}
                  style={{ width: `${clampPercent(Math.min(ratioMeta.percent, 150), 0)}%` }}
                />
              </div>
              <p className="text-xs text-brand-ink-muted">100% = meta cumplida. Mantén el indicador en verde.</p>
            </article>

            <article className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-brand-ink-muted">Horas (30 días)</h3>
              <div className="text-3xl font-bold text-brand-deep">{formatHours(data.hours30d)}</div>
              <p className="text-xs text-brand-ink-muted">
                ≈ {formatHoursPerWeek(data.hours30d)} por semana · Sesión promedio: {formatMinutesLabel(data.avgSessionMinutes30d)}
              </p>
            </article>

            <article className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-brand-ink-muted">Días activos</h3>
              <div className="flex items-center gap-2" title="Actividad de los últimos 7 días">
                {weeklyDots.length
                  ? weeklyDots.map((dot) => (
                      <span
                        key={dot.date}
                        className={`h-3 w-3 rounded-full ${dot.active ? "bg-brand-teal" : "bg-brand-deep-soft/50"}`}
                        title={`${dot.label}: ${formatInteger(dot.minutes)} minutos`}
                      />
                    ))
                  : <span className="text-xs text-brand-ink-muted">Sin datos</span>}
              </div>
              <p className="text-xs text-brand-ink-muted">
                Promedio semanal: {formatWeeklyDays(data.weeklyActiveDays)} · {data.daysActive30d != null ? `${formatInteger(data.daysActive30d)} días activos/30` : "Sin dato de días"}
              </p>
            </article>
          </div>

          {/* Study trend & lesson progression */}
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/90 px-5 py-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-ink-muted">Tiempo de estudio (30 días)</h3>
                <span className="text-xs text-brand-ink-muted">Minutos por día</span>
              </div>
              <div className="h-48">
                <StudyTrendChart entries={data.dailyStudy} />
              </div>
            </section>

            <section className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/90 px-5 py-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-ink-muted">Ruta de lecciones</h3>
              <LessonProgressCard data={data} />
            </section>
          </div>

          {/* Progress & risk */}
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <section className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/90 px-5 py-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-ink-muted">Progreso (30 días)</h3>
              <div className="grid gap-4 text-sm text-brand-deep">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-semibold">
                    <span aria-hidden>📈</span>
                    Lecciones ganadas
                  </span>
                  <span className="text-lg font-bold">{formatInteger(data.lessonsGained30d)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-semibold">
                    <span aria-hidden>⏳</span>
                    Lecciones restantes
                  </span>
                  <span className="text-lg font-bold">{formatInteger(data.lessonsRemaining)}</span>
                </div>
                <p className="text-xs text-brand-ink-muted">
                  Este balance muestra cuánto avanzaste este mes y lo que aún falta para completar el nivel.
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-brand-ink-muted">
                    <span>Termómetro de pronóstico</span>
                    <span>{forecastNarrative}</span>
                  </div>
                  <div className="relative h-3 overflow-hidden rounded-full bg-brand-deep-soft/30">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-400"
                      style={{ width: `${clampPercent(forecastScore, 0)}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-brand-ink-muted">
                  Basado en tu ritmo actual, completarás el nivel en {forecastNarrative}.
                </p>
              </div>
            </section>

            <section className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/90 px-5 py-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-ink-muted">Riesgos y hábitos</h3>
              <RiskCard data={data} />
            </section>
          </div>

          {/* Journey timeline */}
          <section className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/90 px-5 py-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-ink-muted">Trayectoria completa (A1 → B2)</h3>
            <JourneyTimeline data={data} />
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/90 px-5 py-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-ink-muted">Interpretación rápida</h3>
            <p className="text-sm leading-relaxed text-brand-deep">
              {quickInterpretation ?? "Reúne más datos recientes para generar una interpretación personalizada del progreso."}
            </p>
          </section>
        </>
      )}
    </section>
  );
}

type StudyTrendChartProps = {
  entries: StudentCoachPanelSummary["dailyStudy"];
};

function StudyTrendChart({ entries }: StudyTrendChartProps) {
  if (!entries.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-brand-ink-muted">
        <span className="text-base font-semibold text-brand-deep">Aún no hay sesiones recientes.</span>
        <span>¡Vamos a practicar!</span>
      </div>
    );
  }

  const points = entries.map((entry) => ({
    date: entry.date,
    minutes:
      entry.minutes != null && Number.isFinite(entry.minutes)
        ? entry.minutes
        : entry.hours * 60,
  }));

  const maxMinutes = points.reduce((max, point) => (point.minutes > max ? point.minutes : max), 0);
  const safeMax = maxMinutes > 0 ? maxMinutes : 60;
  const totalMinutes = points.reduce((sum, point) => sum + point.minutes, 0);
  const averageMinutes = totalMinutes / points.length;
  const activeDays = points.filter((point) => point.minutes > 0).length;
  const averageLine = Math.max(0, 100 - (averageMinutes / safeMax) * 100);

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
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-brand-ink-muted/50"
          style={{ top: `${averageLine}%` }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0" aria-hidden />
      </div>
      <div className="mt-3 flex justify-between text-[11px] uppercase tracking-wide text-brand-ink-muted">
        <span>{formatDateLabel(points[0].date)}</span>
        <span>{formatDateLabel(points[points.length - 1].date)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-brand-ink-muted">
        <span>
          <span className="font-semibold text-brand-deep">{formatInteger(totalMinutes)}</span>{" "}
          minutos totales
        </span>
        <span>
          <span className="font-semibold text-brand-deep">{formatInteger(averageMinutes)}</span>{" "}
          min/día promedio
        </span>
        <span>
          <span className="font-semibold text-brand-deep">{formatInteger(activeDays)}</span>{" "}
          días con práctica
        </span>
      </div>
    </div>
  );
}

type LessonProgressCardProps = {
  data: StudentCoachPanelSummary;
};

function LessonProgressCard({ data }: LessonProgressCardProps) {
  const plan = data.lessonPlan;
  const completedFromPlan = plan?.lessonsCompleted ?? null;
  const remainingForTotal = plan?.lessonsRemaining ?? data.lessonsRemaining ?? null;
  const levelSegments = plan?.levelSegments ?? [];
  const totalLessons =
    plan?.lessonsTotal ??
    (completedFromPlan != null && remainingForTotal != null
      ? completedFromPlan + remainingForTotal
      : null);

  const completedLessons =
    completedFromPlan ??
    (plan?.currentLessonIndex != null ? Math.max(plan.currentLessonIndex - 1, 0) : null);

  const progressPercent = totalLessons && completedLessons != null && totalLessons > 0
    ? clampPercent((completedLessons / totalLessons) * 100)
    : null;

  const currentPercent = totalLessons && plan?.currentLessonIndex != null && totalLessons > 0
    ? clampPercent((plan.currentLessonIndex / totalLessons) * 100)
    : progressPercent;

  const currentSegment = levelSegments.find((segment) => {
    if (currentPercent == null) return false;
    const start = segment.startPercent ?? 0;
    const end = segment.endPercent ?? 0;
    return currentPercent >= start && currentPercent <= end + 0.5;
  });

  const lessonsCompletedValue = completedLessons ?? 0;
  const segmentLessons = currentSegment
    ? currentSegment.endIndex - currentSegment.startIndex + 1
    : null;
  const completedWithinSegment =
    currentSegment && segmentLessons
      ? Math.min(
          Math.max(
            0,
            lessonsCompletedValue - (currentSegment.startIndex - 1),
          ),
          segmentLessons,
        )
      : null;
  const segmentPercent =
    currentSegment && segmentLessons && segmentLessons > 0 && completedWithinSegment != null
      ? clampPercent((completedWithinSegment / segmentLessons) * 100)
      : null;

  const globalPercentLabel =
    progressPercent != null ? `${formatDecimal(progressPercent, progressPercent >= 10 ? 0 : 1)}%` : null;
  const levelNarrative = buildLevelNarrative({
    levelSegments,
    completedLessons,
    currentSegment: currentSegment ?? undefined,
    segmentPercent,
    globalPercent: progressPercent,
  });

  const recentGained = data.lessonsGained30d ?? null;
  const totalToCompare =
    recentGained != null && data.lessonsRemaining != null
      ? recentGained + data.lessonsRemaining
      : null;
  const pacePercent =
    totalToCompare && totalToCompare > 0 && recentGained != null
      ? clampPercent((recentGained / totalToCompare) * 100)
      : null;
  const paceTooltip = `Lecciones restantes: ${formatInteger(data.lessonsRemaining)} — estimado: ${getForecastNarrative(data.forecastMonthsToFinish)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-brand-ink-muted">
        <span>{plan?.plannedLevelMin ?? "Nivel inicial"}</span>
        <span>{plan?.plannedLevelMax ?? "Nivel meta"}</span>
      </div>
      <div className="flex flex-col gap-2" title={paceTooltip}>
        <div className="flex items-center justify-between text-xs text-brand-ink-muted">
          <span>Progreso reciente</span>
          <span>{pacePercent != null ? `${formatDecimal(pacePercent, pacePercent >= 10 ? 0 : 1)}%` : "—"}</span>
        </div>
        <div className="relative h-2 rounded-full bg-brand-deep-soft/30">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-brand-teal-soft/80"
            style={{ width: `${pacePercent ?? 0}%` }}
            aria-hidden
          />
        </div>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-brand-deep-soft/20">
        {levelSegments.map((segment, index) => (
          <div
            key={`${segment.levelCode ?? "nivel"}-${segment.startIndex}`}
            className={`absolute inset-y-0 ${index % 2 === 0 ? "bg-brand-teal-soft/40" : "bg-brand-teal-soft/25"}`}
            style={{
              left: `${segment.startPercent}%`,
              width: `${Math.max(0, segment.endPercent - segment.startPercent)}%`,
            }}
            title={`Nivel ${segment.levelLabel ?? segment.levelCode ?? "sin nivel"}`}
            aria-hidden
          />
        ))}
        {levelSegments.slice(1).map((segment) => (
          <span
            key={`divider-${segment.startIndex}`}
            className="absolute inset-y-0 w-px bg-white/60"
            style={{ left: `${segment.startPercent}%` }}
            aria-hidden
          />
        ))}
        <div
          className="absolute inset-y-0 left-0 bg-brand-teal/50"
          style={{ width: `${progressPercent ?? 0}%` }}
          aria-hidden
        />
        <div
          className="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-brand-teal shadow"
          style={{ left: `${currentPercent ?? progressPercent ?? 0}%` }}
          title={formatLessonLabel(plan?.currentLessonLabel, data.lessonSeq)}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-brand-deep">
        <span className="font-semibold text-brand-deep">
          {formatLessonLabel(plan?.currentLessonLabel, data.lessonSeq)}
        </span>
        <span className="text-brand-ink-muted">
          {completedLessons != null && totalLessons
            ? `${formatInteger(completedLessons)} de ${formatInteger(totalLessons)} lecciones (${globalPercentLabel ?? "—"})`
            : "Sin datos completos"}
        </span>
      </div>
      {levelSegments.length ? (
        <div className="grid gap-2 text-xs text-brand-ink-muted sm:grid-cols-2">
          {levelSegments.map((segment) => {
            const lessonsInSegment = segment.endIndex - segment.startIndex + 1;
            const completedInSegment =
              completedLessons != null
                ? Math.max(
                    0,
                    Math.min(
                      lessonsInSegment,
                      completedLessons - (segment.startIndex - 1),
                    ),
                  )
                : null;
            const percentInSegment =
              completedInSegment != null && lessonsInSegment > 0
                ? clampPercent((completedInSegment / lessonsInSegment) * 100)
                : null;
            const isCurrent = currentSegment?.levelCode === segment.levelCode;
            return (
              <div
                key={`${segment.levelCode ?? "nivel"}-${segment.startIndex}-summary`}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  isCurrent
                    ? "border-brand-teal bg-brand-teal-soft/30 text-brand-deep"
                    : "border-brand-deep-soft/40 bg-white/60"
                }`}
              >
                <span className="font-semibold text-brand-deep">
                  {segment.levelLabel ?? segment.levelCode ?? "Nivel"}
                </span>
                <span>
                  {percentInSegment != null
                    ? `${formatDecimal(percentInSegment, percentInSegment >= 10 ? 0 : 1)}%`
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
      <p className="text-xs text-brand-ink-muted">
        {levelNarrative
          ? `${levelNarrative} Refleja la ruta pactada del plan.`
          : "Muestra el lugar actual del estudiante en su plan A1→B2 y cuánto falta para completar la ruta pactada."}
      </p>
    </div>
  );
}

type RiskCardProps = {
  data: StudentCoachPanelSummary;
};

function RiskCard({ data }: RiskCardProps) {
  const badge = computeRiskBadge(data);
  const { shortMinutes, optimalMinutes, longMinutes } = data.sessionDurationTargets;

  const fallbackLong = longMinutes ?? Math.max(optimalMinutes ?? 0, data.avgSessionMinutes30d ?? 0, 60);
  const rangeMax = Math.max(fallbackLong, 60);
  const minTarget = shortMinutes ?? Math.max(20, Math.min(rangeMax, (optimalMinutes ?? rangeMax / 2) - 10));
  const maxTarget = longMinutes ?? Math.min(rangeMax, (optimalMinutes ?? rangeMax / 2) + 10);
  const avg = data.avgSessionMinutes30d ?? 0;

  const minPercent = clampPercent((minTarget / rangeMax) * 100);
  const maxPercent = clampPercent((maxTarget / rangeMax) * 100);
  const avgPercent = clampPercent((avg / rangeMax) * 100);

  const riskFlags: string[] = [];
  if (data.riskStall) {
    const repeats = data.repeatsAtLast != null ? formatInteger(data.repeatsAtLast) : "sin datos";
    riskFlags.push(`Estancamiento detectado (repeticiones: ${repeats})`);
  } else {
    riskFlags.push("Sin estancamiento detectado");
  }
  if (data.riskInactive14d) {
    riskFlags.push("Inactividad ≥14 días");
  }
  if (data.riskAtRisk) {
    riskFlags.push("Modelo marca riesgo alto");
  }
  riskFlags.push(formatLastSessionSummary(data.lastSessionDaysAgo));

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex flex-col gap-1 rounded-xl border px-4 py-3 ${badge.tone}`}>
        <span className={`text-sm font-semibold ${badge.className}`}>{badge.label}</span>
        <span className="text-xs text-brand-ink-muted">{badge.description}</span>
      </div>
      <div className="rounded-2xl border border-brand-deep-soft/40 bg-white/70 p-4">
        <div className="flex items-center justify-between text-sm font-semibold text-brand-deep">
          <span>Duración promedio de sesión</span>
          <span>{formatMinutesLabel(avg)}</span>
        </div>
        <p className="text-xs text-brand-ink-muted">
          Meta: {formatMinutesLabel(optimalMinutes)} · Rango saludable {formatMinutesLabel(minTarget)} – {formatMinutesLabel(maxTarget)}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <div className="relative h-2 rounded-full bg-brand-deep-soft/30">
            <div
              className="absolute inset-y-0 rounded-full bg-brand-teal-soft/80"
              style={{ left: `${minPercent}%`, width: `${Math.max(0, maxPercent - minPercent)}%` }}
              aria-hidden
            />
            <div
              className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-brand-teal shadow"
              style={{ left: `${avgPercent}%` }}
              title={`Promedio: ${formatInteger(avg)} min`}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-brand-ink-muted">
            <span>{formatInteger(minTarget)} min</span>
            <span>Promedio</span>
            <span>{formatInteger(maxTarget)} min</span>
          </div>
        </div>
      </div>
      <ul className="flex flex-col gap-2 rounded-2xl border border-brand-deep-soft/40 bg-white/70 p-4 text-xs text-brand-ink-muted">
        {riskFlags.map((flag) => (
          <li key={flag}>• {flag}</li>
        ))}
      </ul>
    </div>
  );
}

type JourneyTimelineProps = {
  data: StudentCoachPanelSummary;
};

function JourneyTimeline({ data }: JourneyTimelineProps) {
  const plan = data.lessonPlan;

  if (!plan) {
    return <p className="text-sm text-brand-ink-muted">Sin plan de lecciones registrado.</p>;
  }

  const completedFromPlan = plan.lessonsCompleted ?? null;
  const remainingForTotal = plan.lessonsRemaining ?? data.lessonsRemaining ?? null;
  const totalLessons =
    plan.lessonsTotal ??
    (completedFromPlan != null && remainingForTotal != null
      ? completedFromPlan + remainingForTotal
      : null);
  const completed =
    completedFromPlan ??
    (plan.currentLessonIndex != null ? Math.max(plan.currentLessonIndex - 1, 0) : null);

  const levelSegments = plan.levelSegments ?? [];

  const percent = totalLessons && completed != null && totalLessons > 0
    ? clampPercent((completed / totalLessons) * 100)
    : 0;
  const currentPercent =
    totalLessons && plan.currentLessonIndex != null && totalLessons > 0
      ? clampPercent((plan.currentLessonIndex / totalLessons) * 100)
      : percent;

  const globalPercentLabel =
    totalLessons && completed != null
      ? `${formatDecimal(percent, percent >= 10 ? 0 : 1)}%`
      : null;

  const currentSegment = levelSegments.find((segment) => {
    if (currentPercent == null) return false;
    return currentPercent >= segment.startPercent && currentPercent <= segment.endPercent + 0.5;
  });

  const lessonsCompletedValue = completed ?? 0;
  const segmentLessons = currentSegment
    ? currentSegment.endIndex - currentSegment.startIndex + 1
    : null;
  const completedWithinSegment =
    currentSegment && segmentLessons
      ? Math.min(
          Math.max(
            0,
            lessonsCompletedValue - (currentSegment.startIndex - 1),
          ),
          segmentLessons,
        )
      : null;
  const segmentPercent =
    currentSegment && segmentLessons && segmentLessons > 0 && completedWithinSegment != null
      ? clampPercent((completedWithinSegment / segmentLessons) * 100)
      : null;

  const levelNarrative = buildLevelNarrative({
    levelSegments,
    completedLessons: completed,
    currentSegment: currentSegment ?? undefined,
    segmentPercent,
    globalPercent: percent,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between text-xs uppercase tracking-wide text-brand-ink-muted">
        <span>{plan.plannedLevelMin ?? "Inicio"}</span>
        <span className="rounded-full bg-brand-teal-soft/40 px-3 py-1 text-[11px] font-semibold text-brand-deep">
          {globalPercentLabel ?? "—"} completado
        </span>
        <span>{plan.plannedLevelMax ?? "Meta"}</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-brand-deep-soft/20">
        {levelSegments.map((segment) => (
          <div
            key={`${segment.levelCode ?? "nivel"}-${segment.startIndex}-timeline`}
            className={`absolute inset-y-0 ${getLevelColor(segment.levelCode ?? segment.levelLabel ?? null)}`}
            style={{
              left: `${segment.startPercent}%`,
              width: `${Math.max(0, segment.endPercent - segment.startPercent)}%`,
            }}
            title={segment.levelLabel ?? segment.levelCode ?? "Nivel"}
          />
        ))}
        <div
          className="absolute inset-y-0 bg-white/60"
          style={{ left: `${percent}%`, width: `${Math.max(0, 100 - percent)}%` }}
          aria-hidden
        />
        <div
          className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-brand-deep shadow"
          style={{ left: `${currentPercent}%` }}
          title={plan.currentLessonLabel ?? `Lección ${formatInteger(plan.currentLessonIndex)}`}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-brand-deep">
        <span className="font-semibold text-brand-deep">
          {plan.currentLessonLabel ?? `Lección ${formatInteger(plan.currentLessonIndex)}`}
        </span>
        <span className="text-brand-ink-muted">
          {completed != null && totalLessons
            ? `${formatInteger(completed)} completadas · ${formatInteger(plan.lessonsRemaining ?? data.lessonsRemaining)} restantes (${globalPercentLabel ?? "—"})`
            : "Sin datos completos"}
        </span>
      </div>
      <p className="text-xs text-brand-ink-muted">
        {levelNarrative
          ? `${levelNarrative} El punto indica la lección actual dentro del recorrido A1→B2.`
          : "Esta barra muestra el avance total por niveles; el punto marca la lección actual."}
      </p>
    </div>
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm"
          >
            <span className="h-4 w-32 rounded-full bg-brand-deep-soft/50" />
            <span className="h-8 w-24 rounded-full bg-brand-deep-soft/80" />
            <span className="h-3 w-36 rounded-full bg-brand-deep-soft/40" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className="h-48 rounded-2xl border border-white/80 bg-white/90"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className="flex h-40 flex-col gap-3 rounded-2xl border border-white/80 bg-white/90 px-5 py-5 shadow-sm"
          >
            <span className="h-4 w-36 rounded-full bg-brand-deep-soft/40" />
            <span className="h-3 w-full rounded-full bg-brand-deep-soft/30" />
            <span className="h-3 w-2/3 rounded-full bg-brand-deep-soft/20" />
            <span className="h-3 w-1/2 rounded-full bg-brand-deep-soft/20" />
          </div>
        ))}
      </div>
      <div className="h-32 rounded-2xl border border-white/80 bg-white/90" />
    </section>
  );
}
