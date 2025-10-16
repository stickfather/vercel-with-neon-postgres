"use client";

import { useMemo, type ReactElement } from "react";

import type {
  CoachPanelEngagementHeatmapEntry,
  StudentCoachPanelSummary,
} from "@/features/administration/data/student-profile";

import { DonutDaypart } from "./DonutDaypart";
import { LearnerSpeedChip } from "./LearnerSpeedChip";

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
  const lei30dPlan = useMemo(() => {
    const rawValue = data?.engagement?.lei?.lei30dPlan;
    if (rawValue != null && Number.isFinite(rawValue)) {
      return rawValue;
    }
    if (!recentActivity.length) {
      return null;
    }
    const totalMinutes = recentActivity.reduce((sum, session) => {
      if (session.sessionMinutes != null && Number.isFinite(session.sessionMinutes)) {
        return sum + Math.max(0, session.sessionMinutes);
      }
      return sum;
    }, 0);
    if (totalMinutes <= 0) {
      return null;
    }
    let minSeq: number | null = null;
    let maxSeq: number | null = null;
    recentActivity.forEach((session) => {
      if (session.lessonGlobalSeq == null || !Number.isFinite(session.lessonGlobalSeq)) {
        return;
      }
      const normalized = Math.trunc(session.lessonGlobalSeq);
      if (minSeq == null || normalized < minSeq) {
        minSeq = normalized;
      }
      if (maxSeq == null || normalized > maxSeq) {
        maxSeq = normalized;
      }
    });
    if (minSeq == null || maxSeq == null || maxSeq <= minSeq) {
      return 0;
    }
    const hours = totalMinutes / 60;
    if (hours <= 0) {
      return null;
    }
    return (maxSeq - minSeq) / hours;
  }, [data?.engagement?.lei?.lei30dPlan, recentActivity]);

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

  const daypartData = Array.isArray(data.engagement.daypart30d)
    ? data.engagement.daypart30d
    : [];
  const learnerSpeed = data.learnerSpeed;

  const planLevelsLabel = [profileHeader.planLevelMin, profileHeader.planLevelMax]
    .filter(Boolean)
    .join(" – ");
  const resolvedPlanLevels = planLevelsLabel.length ? planLevelsLabel : "—";
  const currentLevelLabel = profileHeader.currentLevel ?? "—";
  const planProgressLabel = formatPercent(profileHeader.planProgressPct, 0);
  const lastSeenLabel = formatDate(profileHeader.lastSeenDate, true);

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

    lessonElements.push(
      <div
        key={`lesson-${lesson.lessonGlobalSeq ?? index}`}
        className={cx(
          "relative flex items-center justify-center rounded-full border-2 font-semibold",
          isExamBubble ? "h-16 w-16 text-base" : "h-14 w-14 text-sm",
          isCurrent
            ? "border-brand-teal bg-white text-brand-deep shadow-[0_0_0_4px_rgba(255,255,255,0.7)]"
            : isCompleted
              ? "border-brand-teal bg-brand-teal text-white shadow-[0_14px_30px_rgba(2,132,199,0.28)]"
              : "border-brand-teal/50 bg-white text-brand-deep",
        )}
        title={isExamBubble
          ? `Examen · ${lesson.level ?? ""}`.trim()
          : `Lección ${lesson.seq ?? ""} ${lesson.level ?? ""}`.trim()}
      >
        {isCurrent ? (
          <span className="absolute inset-0 -m-[6px] rounded-full border-2 border-brand-teal/50 animate-pulse" aria-hidden="true" />
        ) : null}
        <span className={isExamBubble ? "uppercase tracking-wide" : undefined}>{bubbleLabel}</span>
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

  return (
    <div className="relative flex flex-col gap-10">
      <section className="flex flex-col gap-6 rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">Perfil del plan</span>
            <h3 className="mt-2 text-2xl font-bold text-brand-deep">Indicadores principales</h3>
            <p className="text-sm text-brand-ink-muted">
              Seguimiento del avance del estudiante y contexto de velocidad de aprendizaje.
            </p>
          </div>
          <LearnerSpeedChip s={learnerSpeed} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Nivel actual</p>
            <p className="mt-2 text-xl font-bold text-brand-deep">{currentLevelLabel}</p>
          </div>
          <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Plan de niveles</p>
            <p className="mt-2 text-xl font-bold text-brand-deep">{resolvedPlanLevels}</p>
          </div>
          <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Progreso del plan</p>
            <p className="mt-2 text-xl font-bold text-brand-deep">{planProgressLabel}</p>
          </div>
          <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Última actividad</p>
            <p className="mt-2 text-xl font-bold text-brand-deep">{lastSeenLabel}</p>
          </div>
        </div>
      </section>

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
            <p className="text-xs uppercase tracking-[0.3em] text-brand-ink-muted">When they study (30 días)</p>
            <div className="mt-3 rounded-2xl border border-brand-ink-muted/10 bg-white/80 p-4">
              <DonutDaypart data={daypartData} />
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
          </div>
        </div>
        <div className="flex flex-col gap-6 rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">LEI Histórico</span>
            <h4 className="text-xl font-bold text-brand-deep">Eficiencia de aprendizaje</h4>
          </div>
          <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-5 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Lecciones por hora</p>
            <p className="mt-2 text-4xl font-black text-brand-deep">
              {formatNumber(lei30dPlan, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-5 text-sm text-brand-ink-muted">
            El LEI sintetiza cuántas lecciones avanza el estudiante por hora de práctica registrada.
          </div>
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
