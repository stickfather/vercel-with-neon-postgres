"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";

import type {
  CoachPanelEngagementHeatmapEntry,
  CoachPanelLessonJourneyEntry,
  CoachPanelLessonSessionEntry,
  CoachPanelLeiTrendEntry,
  StudentCoachPanelSummary,
} from "@/features/administration/data/student-profile";

type CoachPanelProps = {
  data: StudentCoachPanelSummary | null;
  errorMessage?: string | null;
};

type LessonSession = CoachPanelLessonSessionEntry;

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

function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) {
    return "—";
  }
  const hours = minutes / 60;
  if (hours >= 1.5) {
    return `${formatNumber(hours, { maximumFractionDigits: 1 })} h`;
  }
  return `${formatNumber(minutes, { maximumFractionDigits: 0 })} min`;
}

function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) {
    return "—";
  }
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return "—";
  }
  const formatter = new Intl.DateTimeFormat("es-EC", withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" },
  );
  return formatter.format(parsed);
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return "—";
  }
  const now = Date.now();
  const diffMs = now - parsed;
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) {
    return "Justo ahora";
  }
  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} min`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `Hace ${diffHours} h`;
  }
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `Hace ${diffDays} d`;
  }
  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 5) {
    return `Hace ${diffWeeks} sem`;
  }
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) {
    return `Hace ${diffMonths} mes${diffMonths === 1 ? "" : "es"}`;
  }
  const diffYears = Math.round(diffDays / 365);
  return `Hace ${diffYears} año${diffYears === 1 ? "" : "s"}`;
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

function Sparkline({ data }: { data: CoachPanelLeiTrendEntry[] }): ReactElement {
  if (!data.length) {
    return (
      <div className="flex h-24 w-full flex-col items-center justify-center rounded-2xl bg-white/70 text-sm text-brand-ink-muted">
        <span>No hay movimientos recientes.</span>
      </div>
    );
  }

  const width = 160;
  const height = 64;
  const maxValue = data.reduce((max, entry) => (entry.lessonsGained > max ? entry.lessonsGained : max), 0);
  const safeMax = maxValue > 0 ? maxValue : 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const padding = 6;

  const points = data.map((entry, index) => {
    const x = index * step;
    const y = height - padding - (entry.lessonsGained / safeMax) * (height - padding * 2);
    return `${x},${Math.max(padding, Math.min(height - padding, y))}`;
  });

  return (
    <svg
      className="h-24 w-full"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Tendencia de eficiencia"
    >
      <defs>
        <linearGradient id="lei-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0b9e8f" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0b9e8f" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke="#0b9e8f"
        strokeWidth="3"
        strokeLinecap="round"
        points={points.join(" ")}
      />
      <polyline
        fill="url(#lei-gradient)"
        stroke="none"
        points={`0,${height} ${points.join(" ")} ${width},${height}`}
      />
    </svg>
  );
}

function LessonDrawer({
  lesson,
  sessions,
  status,
  error,
  onClose,
}: {
  lesson: CoachPanelLessonJourneyEntry | null;
  sessions: LessonSession[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  onClose: () => void;
}): ReactElement | null {
  if (!lesson) {
    return null;
  }

  const lessonLabel = [lesson.level, lesson.seq != null ? `Lección ${lesson.seq}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-black/20 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar detalle de lección"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col gap-6 overflow-y-auto bg-white p-8 shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-teal">Detalle de lección</span>
            <h3 className="mt-2 text-2xl font-bold text-brand-deep">{lessonLabel || "Lección"}</h3>
            <p className="text-sm text-brand-ink-muted">
              Últimas tres sesiones registradas para esta lección.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white text-brand-ink-muted transition hover:-translate-y-[1px] hover:text-brand-deep"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {status === "loading" ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-brand-ink-muted">
              <span className="h-12 w-12 animate-spin rounded-full border-4 border-brand-teal/30 border-t-brand-teal" />
              <span className="text-sm">Cargando sesiones…</span>
            </div>
          ) : null}
          {status === "error" ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
              {error ?? "No se pudo cargar la información de la lección."}
            </div>
          ) : null}
          {status === "ready" && sessions.length === 0 ? (
            <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-deep-soft/40 p-4 text-sm text-brand-ink-muted">
              No hay sesiones registradas para esta lección.
            </div>
          ) : null}
          {status === "ready" && sessions.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {sessions.map((session) => (
                <li
                  key={session.attendanceId}
                  className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-4 shadow-sm"
                >
                  <p className="text-sm font-semibold text-brand-deep">
                    {formatDate(session.checkIn, true)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.25em] text-brand-ink-muted">
                    Duración
                  </p>
                  <p className="text-sm text-brand-ink-muted">{formatDuration(session.sessionMinutes)}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export function CoachPanel({ data, errorMessage }: CoachPanelProps) {
  const [drawerLesson, setDrawerLesson] = useState<CoachPanelLessonJourneyEntry | null>(null);
  const [drawerSessions, setDrawerSessions] = useState<LessonSession[]>([]);
  const [drawerStatus, setDrawerStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const studentId = data?.profileHeader.studentId ?? null;

  useEffect(() => {
    if (!drawerLesson) {
      setDrawerStatus("idle");
      setDrawerSessions([]);
      setDrawerError(null);
      return;
    }
    if (!studentId || drawerLesson.lessonId == null) {
      setDrawerStatus("error");
      setDrawerSessions([]);
      setDrawerError("No se pudo identificar la lección seleccionada.");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setDrawerStatus("loading");
    setDrawerError(null);

    fetch(
      `/api/students/${studentId}/sessions/by-lesson/${drawerLesson.lessonId}?limit=3`,
      { cache: "no-store", signal: controller.signal },
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Request failed");
        }
        return response.json();
      })
      .then((payload: { sessions?: LessonSession[] }) => {
        if (cancelled) {
          return;
        }
        setDrawerSessions(Array.isArray(payload.sessions) ? payload.sessions : []);
        setDrawerStatus("ready");
      })
      .catch((error) => {
        if (cancelled || error?.name === "AbortError") {
          return;
        }
        setDrawerStatus("error");
        setDrawerSessions([]);
        setDrawerError("No se pudo cargar el historial de la lección.");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [drawerLesson, studentId]);

  const heatmapCells = useMemo(
    () => buildHeatmapCells(data?.engagement.heatmap ?? [], HEATMAP_DAYS),
    [data?.engagement.heatmap],
  );
  const heatmapMaxMinutes = useMemo(
    () => heatmapCells.reduce((max, entry) => (entry.minutes > max ? entry.minutes : max), 0),
    [heatmapCells],
  );

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

  const { profileHeader, lessonJourney, engagement, paceForecast, recentActivity } = data;

  const planBadge = profileHeader.planLevelMin || profileHeader.planLevelMax
    ? `${profileHeader.planLevelMin ?? "?"} → ${profileHeader.planLevelMax ?? "?"}`
    : "Plan personalizado";

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

    const isCompleted = lesson.completed || (currentGlobalSeq != null && lesson.lessonGlobalSeq != null && lesson.lessonGlobalSeq < currentGlobalSeq);
    const isCurrent = currentGlobalSeq != null && lesson.lessonGlobalSeq === currentGlobalSeq;

    lessonElements.push(
      <button
        type="button"
        key={`lesson-${lesson.lessonGlobalSeq ?? index}`}
        onClick={() => setDrawerLesson(lesson)}
        className={cx(
          "relative flex h-14 w-14 items-center justify-center rounded-full border-2 text-sm font-semibold transition",
          isCurrent
            ? "border-brand-teal bg-white text-brand-deep shadow-[0_0_0_4px_rgba(255,255,255,0.7)]"
            : isCompleted
              ? "border-brand-teal bg-brand-teal text-white shadow-[0_14px_30px_rgba(2,132,199,0.28)]"
              : "border-brand-teal/50 bg-white text-brand-deep hover:-translate-y-[1px]",
        )}
        title={`Lección ${lesson.seq ?? ""} ${lesson.level ?? ""}`.trim()}
      >
        {isCurrent ? (
          <span className="absolute inset-0 -m-[6px] rounded-full border-2 border-brand-teal/50 animate-pulse" aria-hidden="true" />
        ) : null}
        <span>{lesson.seq ?? "?"}</span>
      </button>,
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
      <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-r from-[#fff7ec] via-white to-[#e0f6ef] p-8 shadow-[0_32px_96px_rgba(15,23,42,0.16)]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-white bg-brand-deep-soft shadow-[0_24px_48px_rgba(15,23,42,0.2)]">
              {profileHeader.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileHeader.profileImageUrl}
                  alt={profileHeader.fullName ?? "Foto del estudiante"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-brand-deep">
                  {(profileHeader.fullName ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-3xl font-black text-brand-deep sm:text-4xl">
                  {profileHeader.fullName ?? "Estudiante"}
                </h2>
                <p className="text-sm text-brand-ink-muted">ID {profileHeader.studentId}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center rounded-full bg-brand-teal-soft px-4 py-1 text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">
                  {planBadge}
                </span>
                <div className="flex flex-wrap gap-2">
                  {profileHeader.inactive14d ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-red-700">
                      Inactivo 14 d
                    </span>
                  ) : null}
                  {profileHeader.stall ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                      Stall
                    </span>
                  ) : null}
                  {profileHeader.onPacePlan ? (
                    <span
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700"
                      title="forecast ≤ 6 mo"
                    >
                      On pace
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div className="grid w-full gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
                Progreso del plan
              </p>
              <p className="mt-2 text-2xl font-bold text-brand-deep">{formatPercent(profileHeader.planProgressPct, 0)}</p>
              <p className="text-sm text-brand-ink-muted">
                Completadas {formatNumber(profileHeader.completedLessonsInPlan)} de {formatNumber(profileHeader.totalLessonsInPlan)} lecciones
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-brand-teal-soft">
                <div
                  className="h-full rounded-full bg-brand-teal"
                  style={{ width: `${Math.min(100, Math.max(0, profileHeader.planProgressPct ?? 0))}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
                Nivel actual
              </p>
              <p className="mt-2 text-2xl font-bold text-brand-deep">
                {profileHeader.currentLevel ?? "—"}
              </p>
              <p className="text-sm text-brand-ink-muted">
                {formatPercent(profileHeader.currentLevelProgressPct, 0)} completado
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
                Última actividad
              </p>
              <p className="mt-2 text-2xl font-bold text-brand-deep">
                {formatRelativeTime(profileHeader.lastSeenDate)}
              </p>
              <p className="text-sm text-brand-ink-muted">{formatDate(profileHeader.lastSeenDate, true)}</p>
            </div>
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
            Tap en cualquier lección para ver sus últimas sesiones.
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
                {formatNumber(engagement.stats.daysActive30d)}
              </p>
            </div>
            <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-4 text-center">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Horas totales</p>
              <p className="mt-2 text-xl font-bold text-brand-deep">
                {formatNumber(
                  engagement.stats.totalHours30d ??
                    (engagement.stats.totalMinutes30d != null
                      ? engagement.stats.totalMinutes30d / 60
                      : null),
                  { maximumFractionDigits: 1 },
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-4 text-center">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Promedio sesión</p>
              <p className="mt-2 text-xl font-bold text-brand-deep">
                {formatNumber(engagement.stats.avgSessionMinutes30d, { maximumFractionDigits: 0 })} min
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
          </div>
        </div>
        <div className="flex flex-col gap-6 rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">LEI 30 días</span>
            <h4 className="text-xl font-bold text-brand-deep">Eficiencia de aprendizaje</h4>
          </div>
          <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-5 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Lecciones por hora</p>
            <p className="mt-2 text-4xl font-black text-brand-deep">
              {formatNumber(engagement.lei.lei30dPlan, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-4">
            <Sparkline data={engagement.lei.trend} />
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

      <section className="flex flex-col gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">Actividad reciente</span>
          <h4 className="mt-2 text-xl font-bold text-brand-deep">Últimas sesiones</h4>
        </div>
        <div className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          {recentActivity.length === 0 ? (
            <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-6 text-center text-sm text-brand-ink-muted">
              Aún no registramos sesiones recientes.
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {recentActivity.map((entry) => {
                const lessonLabel = [entry.level, entry.seq != null ? `Lección ${entry.seq}` : null]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li
                    key={entry.attendanceId}
                    className="flex flex-col gap-2 rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-brand-deep">{formatDate(entry.checkIn, true)}</span>
                      <span className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">
                        {lessonLabel || "Lección"}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-brand-deep">
                      {formatDuration(entry.sessionMinutes)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <LessonDrawer
        lesson={drawerLesson}
        sessions={drawerSessions}
        status={drawerStatus}
        error={drawerError}
        onClose={() => setDrawerLesson(null)}
      />
    </div>
  );
}
