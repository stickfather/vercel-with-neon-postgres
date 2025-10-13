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
  if (data.riskAtRisk) {
    return {
      label: "🔴 En riesgo",
      description: "Acción inmediata sugerida",
      className: "text-rose-600",
      tone: "bg-rose-100",
    } as const;
  }
  if (data.riskInactive14d || data.riskStall) {
    return {
      label: "🟡 Vigilar",
      description: "Revisa hábitos y seguimiento",
      className: "text-amber-600",
      tone: "bg-amber-100",
    } as const;
  }
  return {
    label: "🟢 Ok",
    description: "Sin alertas relevantes",
    className: "text-emerald-600",
    tone: "bg-emerald-100",
  } as const;
}

function getRatioColor(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) {
    return "bg-slate-200";
  }
  if (ratio >= 1) {
    return "bg-emerald-500";
  }
  if (ratio >= 0.8) {
    return "bg-amber-400";
  }
  return "bg-rose-500";
}

function getThermometerColor(data: StudentCoachPanelSummary): string {
  if (data.riskAtRisk) {
    return "bg-rose-500";
  }
  if (data.onPace === false || (data.forecastMonthsToFinish ?? 0) > 12) {
    return "bg-amber-400";
  }
  return "bg-emerald-500";
}

function clampPercent(value: number | null | undefined, fallback = 0) {
  if (value == null || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(100, Math.max(0, value));
}

export function CoachPanel({ data, errorMessage }: CoachPanelProps) {
  return (
    <section className="flex h-full flex-col gap-6 rounded-[28px] border border-white/70 bg-white/92 px-6 py-6 text-brand-deep shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-2xl font-bold text-brand-deep">Panel del coach</h2>
          <p className="text-sm text-brand-ink-muted">
            Esfuerzo, consistencia y progreso en un vistazo.
          </p>
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
            <article className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-brand-ink-muted">En ritmo</h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    data.onPace === true
                      ? "bg-emerald-100 text-emerald-700"
                      : data.onPace === false
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {data.onPace === true ? "✅ Sí" : data.onPace === false ? "⚠️ No" : "—"}
                </span>
              </div>
              <div className="text-xl font-semibold text-brand-deep">{formatForecast(data.forecastMonthsToFinish)}</div>
              <p className="text-xs text-brand-ink-muted">
                {data.onPace === true
                  ? "Pronóstico alineado con el plan actual."
                  : data.onPace === false
                    ? "Ritmo por debajo de lo esperado; considera intervenir."
                    : "Necesitamos más datos para proyectar la meta."}
              </p>
              <p className="text-xs text-brand-ink-muted">{formatLastSession(data.lastSessionDaysAgo)}</p>
            </article>

            <article className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-brand-ink-muted">LEI (lecciones/hora)</h3>
                <span className="rounded-full bg-brand-teal-soft/60 px-2.5 py-1 text-xs font-semibold text-brand-teal">
                  Meta {formatDecimal(data.targetLph, 2)}
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-brand-deep">{formatDecimal(data.lei30d, 2)}</span>
                <span
                  className={`text-sm font-semibold ${
                    data.leiTrendDelta == null
                      ? "text-brand-ink-muted"
                      : data.leiTrendDelta > 0
                        ? "text-emerald-600"
                        : data.leiTrendDelta < 0
                          ? "text-rose-600"
                          : "text-brand-ink-muted"
                  }`}
                  title="Comparado con los 30 días anteriores"
                >
                  {data.leiTrendDelta == null
                    ? "±0"
                    : `${data.leiTrendDelta > 0 ? "▲" : data.leiTrendDelta < 0 ? "▼" : "→"} ${formatDecimal(Math.abs(data.leiTrendDelta), 2)}`}
                </span>
              </div>
              <p className="text-xs text-brand-ink-muted">
                Velocidad de avance en lecciones. Una tendencia ↑ indica más progreso por hora dedicada.
              </p>
            </article>

            <article className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-brand-ink-muted">Ratio (LEI / objetivo)</h3>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-brand-deep">
                  {data.leiRatio == null || !Number.isFinite(data.leiRatio)
                    ? "—"
                    : `${formatInteger(data.leiRatio * 100)}%`}
                </span>
              </div>
              <div className="relative h-2 w-full rounded-full bg-brand-deep-soft/40">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all ${getRatioColor(data.leiRatio)}`}
                  style={{
                    width: `${clampPercent(
                      data.leiRatio == null || !Number.isFinite(data.leiRatio)
                        ? 0
                        : Math.min(data.leiRatio, 1.5) / 1.5 * 100,
                    0)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-brand-ink-muted">
                <span className="font-semibold">100% = meta cumplida.</span> Valores menores indican menor eficiencia por hora.
              </p>
            </article>

            <article className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-brand-ink-muted">Horas (30 días)</h3>
              <div className="text-3xl font-bold text-brand-deep">{formatHours(data.hours30d)}</div>
              <p className="text-xs text-brand-ink-muted">
                Promedio sesión: {formatInteger(data.avgSessionMinutes30d)} min
              </p>
              <p className="text-xs text-brand-ink-muted">
                Equivale a {formatDecimal(
                  data.hours30d != null && Number.isFinite(data.hours30d)
                    ? data.hours30d / 4.345
                    : null,
                  1,
                )} h por semana registradas.
              </p>
            </article>

            <article className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-brand-ink-muted">Días activos (prom. / sem)</h3>
              <div className="text-3xl font-bold text-brand-deep">{formatWeeklyDays(data.weeklyActiveDays)}</div>
              <p className="text-xs text-brand-ink-muted">
                {data.weeklyActiveDays != null && Number.isFinite(data.weeklyActiveDays)
                  ? data.weeklyActiveDays >= 5
                    ? "Rutina sólida: práctica casi diaria."
                    : data.weeklyActiveDays >= 3
                      ? "Actividad moderada, aún con margen para reforzar."
                      : "Pocos días activos; requiere acompañamiento."
                  : "Sin suficientes datos de consistencia."}
              </p>
            </article>
          </div>

          {/* Study trend & lesson progression */}
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/90 px-5 py-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-ink-muted">Tiempo de estudio (30 días)</h3>
                <span className="text-xs text-brand-ink-muted">Horas por día</span>
              </div>
              <div className="relative h-40 rounded-xl border border-brand-deep-soft/40 bg-white/80 p-4">
                {data.dailyStudy.length ? (
                  <StudyTrendChart entries={data.dailyStudy} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-brand-ink-muted">
                    Sin registros en este período.
                  </div>
                )}
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
              <dl className="grid gap-3 text-sm text-brand-deep">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-brand-ink-muted">Lecciones ganadas</dt>
                  <dd className="font-semibold">{formatInteger(data.lessonsGained30d)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-brand-ink-muted">Lecciones restantes</dt>
                  <dd className="font-semibold">{formatInteger(data.lessonsRemaining)}</dd>
                </div>
              </dl>
              <p className="text-xs text-brand-ink-muted">
                Responde si el aprendizaje avanza: cuántas lecciones se sumaron este mes y cuántas quedan para lograr el objetivo.
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-brand-ink-muted">
                  <span>Tiempo estimado hasta meta</span>
                  <span>{data.forecastMonthsToFinish == null ? "—" : `${formatDecimal(data.forecastMonthsToFinish, data.forecastMonthsToFinish >= 10 ? 0 : 1)} meses`}</span>
                </div>
                <div className="relative h-2 rounded-full bg-brand-deep-soft/30">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${getThermometerColor(data)}`}
                    style={{
                      width: `${clampPercent(
                        data.forecastMonthsToFinish == null || data.forecastMonthsToFinish <= 0
                          ? 0
                          : Math.min(data.forecastMonthsToFinish / 12, 1) * 100,
                        0,
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-brand-ink-muted">
                  Termómetro basado en el pronóstico actual. Verde indica ritmo saludable.
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
        </>
      )}
    </section>
  );
}

type StudyTrendChartProps = {
  entries: StudentCoachPanelSummary["dailyStudy"];
};

function StudyTrendChart({ entries }: StudyTrendChartProps) {
  const maxHours = entries.reduce((max, entry) => (entry.hours > max ? entry.hours : max), 0);
  const safeMax = maxHours > 0 ? maxHours : 1;
  const shortThreshold = 0.5;
  const shortZoneHeight = Math.min(100, (shortThreshold / safeMax) * 100);

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1">
        <div
          className="absolute inset-x-0 bottom-0 rounded-b-xl bg-rose-50"
          style={{ height: `${shortZoneHeight}%` }}
          aria-hidden
        />
        <div className="absolute inset-0 flex items-end gap-[3px] px-1 pb-1">
          {entries.map((entry) => {
            const height = Math.max(4, (entry.hours / safeMax) * 100);
            const isShort = entry.hours < shortThreshold;
            return (
              <div
                key={`${entry.date}-${entry.hours}`}
                className={`flex-1 rounded-t-full ${
                  isShort ? "bg-rose-300" : "bg-brand-teal/70"
                } transition-[height] duration-500`}
                style={{ height: `${height}%` }}
                title={`${formatDateLabel(entry.date)} · ${formatDecimal(entry.hours, 2)} h`}
              />
            );
          })}
        </div>
        <div className="absolute inset-0 rounded-xl border border-brand-deep-soft/50" aria-hidden />
      </div>
      <div className="mt-3 flex justify-between text-[11px] uppercase tracking-wide text-brand-ink-muted">
        <span>{entries.length ? formatDateLabel(entries[0].date) : "—"}</span>
        <span>{entries.length ? formatDateLabel(entries[entries.length - 1].date) : "—"}</span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-brand-ink-muted">
        La franja rosa resalta días con menos de 30 minutos. Busca barras continuas por encima de esa zona para confirmar hábito.
      </p>
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-brand-ink-muted">
        <span>{plan?.plannedLevelMin ?? "Nivel inicial"}</span>
        <span>{plan?.plannedLevelMax ?? "Nivel meta"}</span>
      </div>
      <div className="relative h-3 rounded-full bg-brand-deep-soft/30">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-teal/60"
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
            ? `${formatInteger(completedLessons)} de ${formatInteger(totalLessons)} lecciones`
            : "Sin datos completos"}
        </span>
      </div>
      <p className="text-xs text-brand-ink-muted">
        Muestra el lugar actual del estudiante en su plan A1→B2 y cuánto falta para completar la ruta pactada.
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
  }
  if (data.riskInactive14d) {
    riskFlags.push("Inactividad ≥14 días");
  }
  if (data.riskAtRisk) {
    riskFlags.push("Modelo marca riesgo alto");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex flex-col gap-1 rounded-xl ${badge.tone} px-3 py-3`}>
        <span className={`text-sm font-semibold ${badge.className}`}>{badge.label}</span>
        <span className="text-xs text-brand-ink-muted">{badge.description}</span>
      </div>
      <p className="text-xs text-brand-ink-muted">
        Resume el riesgo actual del estudiante combinando estancamientos, inactividad y alertas automáticas.
      </p>
      <div className="flex flex-col gap-2 text-sm text-brand-deep">
        <span className="font-semibold text-brand-deep">Duración promedio de sesión</span>
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
          <span>Objetivo</span>
          <span>{formatInteger(maxTarget)} min</span>
        </div>
      </div>
      <ul className="flex flex-col gap-2 text-xs text-brand-ink-muted">
        {riskFlags.length ? (
          riskFlags.map((flag) => <li key={flag}>• {flag}</li>)
        ) : (
          <li>Sin señales de riesgo adicionales.</li>
        )}
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

  const percent = totalLessons && completed != null && totalLessons > 0
    ? clampPercent((completed / totalLessons) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-brand-ink-muted">
        <span>{plan.plannedLevelMin ?? "Inicio"}</span>
        <span>{plan.plannedLevelMax ?? "Meta"}</span>
      </div>
      <div className="relative h-2 rounded-full bg-brand-deep-soft/30">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-teal"
          style={{ width: `${percent}%` }}
          aria-hidden
        />
        <div
          className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-brand-teal shadow"
          style={{ left: `${percent}%` }}
          title={plan.currentLessonLabel ?? `Lección ${formatInteger(plan.currentLessonIndex)}`}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-brand-deep">
        <span className="font-semibold text-brand-deep">{plan.currentLessonLabel ?? `Lección ${formatInteger(plan.currentLessonIndex)}`}</span>
        <span className="text-brand-ink-muted">
          {completed != null && totalLessons
            ? `${formatInteger(completed)} completadas · ${formatInteger(plan.lessonsRemaining ?? data.lessonsRemaining)} restantes`
            : "Sin datos completos"}
        </span>
      </div>
      <p className="text-xs text-brand-ink-muted">
        Línea de tiempo completa: verde = recorrido cubierto, marcador = lección actual dentro del nivel meta.
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
