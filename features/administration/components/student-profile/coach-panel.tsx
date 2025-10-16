"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";

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
type LessonJourneyItem = CoachPanelLessonJourneyEntry & { isExam?: boolean };

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
  lesson: LessonJourneyItem | null;
  sessions: LessonSession[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  onClose: () => void;
}): ReactElement | null {
  if (!lesson) {
    return null;
  }

  const lessonLabel = [
    lesson.level,
    lesson.isExam ? "Examen" : lesson.seq != null ? `Lección ${lesson.seq}` : null,
  ]
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
              {lesson.isExam
                ? "Últimas sesiones registradas antes del examen."
                : "Últimas tres sesiones registradas para esta lección."}
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
  const [drawerLesson, setDrawerLesson] = useState<LessonJourneyItem | null>(null);
  const [drawerSessions, setDrawerSessions] = useState<LessonSession[]>([]);
  const [drawerStatus, setDrawerStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const sessionsCacheRef = useRef(new Map<string, LessonSession[]>());

  const studentId = data?.profileHeader.studentId ?? null;
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

  useEffect(() => {
    if (!drawerLesson) {
      setDrawerStatus("idle");
      setDrawerSessions([]);
      setDrawerError(null);
      return;
    }
    if (!studentId) {
      setDrawerStatus("error");
      setDrawerSessions([]);
      setDrawerError("No se pudo identificar la lección seleccionada.");
      return;
    }

    const lessonId = drawerLesson.lessonId ?? null;
    const lessonGlobalSeq = drawerLesson.lessonGlobalSeq ?? null;

    if (lessonId == null && lessonGlobalSeq == null) {
      setDrawerStatus("error");
      setDrawerSessions([]);
      setDrawerError("La lección no cuenta con un identificador válido.");
      return;
    }

    const cacheKey = lessonId != null ? `lesson:${lessonId}` : `global:${lessonGlobalSeq}`;
    const cachedSessions = sessionsCacheRef.current.get(cacheKey);
    if (cachedSessions) {
      setDrawerSessions(cachedSessions);
      setDrawerStatus("ready");
      setDrawerError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setDrawerStatus("loading");
    setDrawerError(null);
    setDrawerSessions([]);

    const searchParams = new URLSearchParams();
    searchParams.set("limit", "3");
    if (lessonGlobalSeq != null) {
      searchParams.set("lessonGlobalSeq", String(lessonGlobalSeq));
    }
    if (drawerLesson.level) {
      searchParams.set("level", drawerLesson.level);
    }

    fetch(
      `/api/students/${studentId}/sessions/by-lesson/${lessonId ?? "global"}?${searchParams.toString()}`,
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
        const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
        sessionsCacheRef.current.set(cacheKey, sessions);
        setDrawerSessions(sessions);
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
  const leiTrendBase = Array.isArray(data?.engagement?.lei?.trend) ? data.engagement.lei.trend : [];
  const leiTrendSource = useMemo(() => {
    if (leiTrendBase.length) {
      return leiTrendBase;
    }
    if (!recentActivity.length) {
      return [];
    }
    const lessonsByDate = new Map<string, number>();
    recentActivity.forEach((session) => {
      const checkIn = session.checkIn;
      const globalSeq = session.lessonGlobalSeq;
      if (!checkIn || globalSeq == null || !Number.isFinite(globalSeq)) {
        return;
      }
      const date = checkIn.slice(0, 10);
      if (!date) {
        return;
      }
      const normalized = Math.trunc(globalSeq);
      const existing = lessonsByDate.get(date);
      lessonsByDate.set(date, existing == null ? normalized : Math.max(existing, normalized));
    });
    const sortedDates = Array.from(lessonsByDate.keys()).sort();
    let previousMax: number | null = null;
    return sortedDates.map((date) => {
      const dayMax = lessonsByDate.get(date) ?? 0;
      const normalizedDayMax = Number.isFinite(dayMax) ? dayMax : 0;
      const gained = previousMax == null ? 0 : Math.max(0, normalizedDayMax - previousMax);
      previousMax = previousMax == null ? normalizedDayMax : Math.max(previousMax, normalizedDayMax);
      return { date, lessonsGained: gained } satisfies CoachPanelLeiTrendEntry;
    });
  }, [leiTrendBase, recentActivity]);
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
      <button
        type="button"
        key={`lesson-${lesson.lessonGlobalSeq ?? index}`}
        onClick={() => setDrawerLesson({ ...lesson, isExam: isExamBubble })}
        className={cx(
          "relative flex items-center justify-center rounded-full border-2 font-semibold transition",
          isExamBubble ? "h-16 w-16 text-base" : "h-14 w-14 text-sm",
          isCurrent
            ? "border-brand-teal bg-white text-brand-deep shadow-[0_0_0_4px_rgba(255,255,255,0.7)]"
            : isCompleted
              ? "border-brand-teal bg-brand-teal text-white shadow-[0_14px_30px_rgba(2,132,199,0.28)]"
              : "border-brand-teal/50 bg-white text-brand-deep hover:-translate-y-[1px]",
        )}
        title={isExamBubble
          ? `Examen · ${lesson.level ?? ""}`.trim()
          : `Lección ${lesson.seq ?? ""} ${lesson.level ?? ""}`.trim()}
      >
        {isCurrent ? (
          <span className="absolute inset-0 -m-[6px] rounded-full border-2 border-brand-teal/50 animate-pulse" aria-hidden="true" />
        ) : null}
        <span className={isExamBubble ? "uppercase tracking-wide" : undefined}>{bubbleLabel}</span>
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
              {formatNumber(lei30dPlan, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory p-4">
            <Sparkline data={leiTrendSource} />
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
