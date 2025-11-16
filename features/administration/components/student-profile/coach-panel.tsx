"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CSSProperties } from "react";

import type {
  CoachPanelLessonJourneyEntry,
  CoachPanelLessonJourneyLevel,
  StudentCoachPanelSummary,
} from "@/features/administration/data/student-profile";
import type {
  CoachPanelReportResponse,
  DailyMinutesPoint,
  HourlyMinutesBucket,
} from "@/src/features/reports/coach-panel/types";

const PLAN_LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const LEVEL_ORDER_INDEX = new Map<string, number>(PLAN_LEVEL_ORDER.map((level, index) => [level, index]));

const LESSON_NODE_MIN_SIZE = 24;
const LESSON_NODE_MAX_SIZE = 38;
const LESSON_NODE_SIZE_VIEWPORT_FACTOR = 2.5;

const CONSISTENCY_TONE = [
  { threshold: 80, className: "bg-emerald-50 text-emerald-700" },
  { threshold: 50, className: "bg-amber-50 text-amber-700" },
  { threshold: 0, className: "bg-rose-50 text-rose-700" },
];

const HABIT_TONE: Record<string, string> = {
  consistente: "bg-emerald-50 text-emerald-700 border-emerald-200",
  intermitente: "bg-amber-50 text-amber-700 border-amber-200",
  inconstante: "bg-rose-50 text-rose-700 border-rose-200",
};

type QuadrantLabel = "A" | "B" | "C" | "D";

const QUADRANT_KEYS: QuadrantLabel[] = ["A", "B", "C", "D"];

const DEFAULT_QUADRANT_STYLE = {
  badgeText: "Quadrant – N/A",
  badgeClass: "bg-slate-200",
  textClass: "text-slate-600",
  dotClass: "bg-slate-400",
  description: "Perfil sin descripción",
} as const;

const QUADRANT_STYLE: Record<
  QuadrantLabel,
  {
    badgeText: string;
    badgeClass: string;
    textClass: string;
    dotClass: string;
    description: string;
  }
> = {
  A: {
    badgeText: "A – Efficient & Active",
    badgeClass: "bg-emerald-600",
    textClass: "text-white",
    dotClass: "bg-emerald-500",
    description: "Eficiente y activo",
  },
  B: {
    badgeText: "B – Efficient / Low Pace",
    badgeClass: "bg-amber-300",
    textClass: "text-slate-900",
    dotClass: "bg-amber-400",
    description: "Eficiente con ritmo bajo",
  },
  C: {
    badgeText: "C – Inefficient / High Pace",
    badgeClass: "bg-orange-500",
    textClass: "text-white",
    dotClass: "bg-orange-500",
    description: "Necesita mayor eficiencia",
  },
  D: {
    badgeText: "D – Inefficient & Inactive",
    badgeClass: "bg-rose-600",
    textClass: "text-white",
    dotClass: "bg-rose-500",
    description: "Bajo ritmo y eficiencia",
  },
};

const QUADRANT_DOT_POSITION: Record<QuadrantLabel, { x: number; y: number }> = {
  A: { x: 0.75, y: 0.75 },
  B: { x: 0.25, y: 0.75 },
  C: { x: 0.75, y: 0.25 },
  D: { x: 0.25, y: 0.25 },
};

type CoachPanelProps = {
  studentId: number;
  data: StudentCoachPanelSummary | null;
};

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

function formatHoursValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "0";
  }
  const normalized = Math.max(0, value);
  const rounded = Number(normalized.toFixed(1));
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
}

function resolveLessonBubbleTitle(lesson: CoachPanelLessonJourneyEntry): string {
  const rawTitle = lesson.lessonTitle?.trim();
  const normalizedTitle = rawTitle ? rawTitle.toLowerCase() : "";

  if (normalizedTitle.includes("intro")) {
    return "Intro";
  }

  if (normalizedTitle.includes("preparación para el examen")) {
    return "Exam";
  }

  if (lesson.isIntro) {
    return "Intro";
  }

  if (lesson.isExam) {
    return "Exam";
  }

  const titleMatch = rawTitle?.match(/(\d+)(?!.*\d)/);
  if (titleMatch) {
    return titleMatch[1] ?? titleMatch[0];
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
  const numericMatch = preferred.match(/(\d+)(?!.*\d)/);
  if (numericMatch) {
    return numericMatch[1] ?? numericMatch[0];
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

function renderLessonNode(lesson: CoachPanelLessonJourneyEntry) {
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
  const baseLabelScale = lesson.isIntro || lesson.isExam ? 0.34 : 0.52;
  const labelScale = lesson.status === "completed" ? baseLabelScale * 0.92 : baseLabelScale;
  const labelFontSize = `calc(${nodeSizeValue} * ${labelScale})`;
  const metricsFontSize = `calc(${nodeSizeValue} * 0.28)`;
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
    color: "#1F2933",
    lineHeight: 1.1,
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", sans-serif',
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: "9999px",
    padding: "1px 5px",
    boxShadow: "0 6px 14px rgba(15,23,42,0.12)",
    border: "1px solid rgba(148,163,184,0.28)",
    backdropFilter: "blur(4px)",
  };

  const shouldShowMetrics = lesson.status === "completed" || lesson.status === "current";

  return (
    <div className="relative flex flex-col items-center text-center font-sans" title={tooltipLines.join("\n")}>
      <div className="relative flex items-center justify-center font-bold" style={circleStyle}>
        <span>{displayTitle}</span>
        {appearance.showCompletionCheck ? (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#BBF7D0] text-xs font-semibold text-[#166534] shadow-sm">
            ✓
          </span>
        ) : null}
      </div>
      {shouldShowMetrics ? (
        <div className="pointer-events-none -mt-1.5 flex items-center justify-center -space-x-1" style={{ transform: "translateY(-2px)" }}>
          <div style={{ ...metricsStyle, fontSize: metricsFontSize }}>📅 {`${safeDays}d`}</div>
          <div style={{ ...metricsStyle, fontSize: metricsFontSize }}>⏳ {`${hoursLabel}h`}</div>
        </div>
      ) : null}
    </div>
  );
}

function formatMinutesToHours(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) {
    return "—";
  }
  const hours = minutes / 60;
  return `${formatNumber(hours, { maximumFractionDigits: 1 })} h`;
}

function buildHeatmapSeries(points: DailyMinutesPoint[]): DailyMinutesPoint[] {
  const map = new Map<string, number>();
  points.forEach((point) => {
    if (point.date) {
      map.set(point.date.slice(0, 10), Math.max(0, point.minutes));
    }
  });

  const today = new Date();
  const series: DailyMinutesPoint[] = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const iso = date.toISOString().slice(0, 10);
    series.push({ date: iso, minutes: map.get(iso) ?? 0 });
  }
  return series;
}

function heatmapColor(minutes: number, maxMinutes: number): string {
  if (maxMinutes <= 0 || minutes <= 0) {
    return "rgba(226,232,240,0.65)";
  }
  const intensity = Math.min(1, minutes / maxMinutes);
  const alpha = 0.25 + intensity * 0.6;
  return `rgba(56,189,248,${alpha.toFixed(2)})`;
}

function sparklinePoints(values: number[] | undefined): string {
  if (!values?.length) {
    return "";
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");
}

function habitTone(label: string | null | undefined): string {
  if (!label) return "bg-slate-50 text-slate-600 border-slate-200";
  const normalized = label.toLowerCase();
  return HABIT_TONE[normalized as keyof typeof HABIT_TONE] ?? "bg-slate-50 text-slate-600 border-slate-200";
}

function normalizeQuadrantLabel(label: string | undefined): QuadrantLabel | undefined {
  if (!label) return undefined;
  const candidate = label.toUpperCase() as QuadrantLabel;
  return QUADRANT_KEYS.includes(candidate) ? candidate : undefined;
}

function quadrantDescription(label: string | undefined): string | null {
  if (!label) return null;
  const normalized = normalizeQuadrantLabel(label);
  if (!normalized) return DEFAULT_QUADRANT_STYLE.description;
  return QUADRANT_STYLE[normalized].description;
}

function QuadrantBadge({ quadrantLabel }: { quadrantLabel: string | undefined }) {
  const normalized = normalizeQuadrantLabel(quadrantLabel);
  const config = normalized ? QUADRANT_STYLE[normalized] : DEFAULT_QUADRANT_STYLE;

  return (
    <span
      className={`inline-flex h-7 items-center rounded-full px-4 text-[13px] font-semibold ${config.badgeClass} ${config.textClass}`}
    >
      {config.badgeText}
    </span>
  );
}

function QuadrantMetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-[110px] flex-col rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
      <span className="text-base font-semibold text-slate-900">{value}</span>
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
}

function QuadrantMatrix({ quadrantLabel }: { quadrantLabel: string | undefined }) {
  const normalized = normalizeQuadrantLabel(quadrantLabel);
  const dotPosition = normalized ? QUADRANT_DOT_POSITION[normalized] : { x: 0.5, y: 0.5 };
  const dotClass = normalized ? QUADRANT_STYLE[normalized].dotClass : DEFAULT_QUADRANT_STYLE.dotClass;

  const dotStyle: CSSProperties = {
    left: `calc(${dotPosition.x * 100}% - 5px)`,
    top: `calc(${(1 - dotPosition.y) * 100}% - 5px)`,
  };

  const cells = [
    { key: "B", title: "B", subtitle: "Efficient / Low Pace" },
    { key: "A", title: "A", subtitle: "Efficient & Active" },
    { key: "D", title: "D", subtitle: "Inefficient & Inactive" },
    { key: "C", title: "C", subtitle: "Inefficient / High Pace" },
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">LEI (Efficiency) ↑</span>
      <div className="relative w-full max-w-xs rounded-2xl border border-slate-200 bg-white px-3 py-3">
        <div className="grid h-40 w-full grid-cols-2 grid-rows-2 text-xs font-semibold text-slate-600">
          {cells.map((cell) => (
            <div key={cell.key} className="flex flex-col items-center justify-center gap-1 text-center">
              <span className="text-lg font-bold text-slate-700">{cell.title}</span>
              <span className="text-[10px] font-medium text-slate-400">{cell.subtitle}</span>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-full w-px bg-slate-200" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-slate-200" />
        </div>
        <span className={`pointer-events-none absolute h-2.5 w-2.5 rounded-full ${dotClass}`} style={dotStyle} />
      </div>
      <span className="text-[11px] uppercase tracking-wide text-slate-500">Velocity (Pace) →</span>
    </div>
  );
}

function useCoachPanelReport(studentId: number) {
  const [report, setReport] = useState<CoachPanelReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(studentId)) {
      setReport(null);
      setLoading(false);
      setError("ID inválido");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/reports/coach-panel?studentId=${studentId}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No se pudo cargar el reporte");
        }
        return response.json();
      })
      .then((payload: CoachPanelReportResponse) => {
        setReport(payload);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (fetchError.name === "AbortError") {
          return;
        }
        setReport(null);
        setLoading(false);
        setError(fetchError.message ?? "Error desconocido");
      });

    return () => controller.abort();
  }, [studentId]);

  return { report, loading, error } as const;
}

function buildHistogramBuckets(buckets: HourlyMinutesBucket[]): HourlyMinutesBucket[] {
  return buckets
    .slice()
    .sort((a, b) => a.hourLabel.localeCompare(b.hourLabel))
    .map((bucket) => ({
      hourLabel: bucket.hourLabel,
      minutes: Math.max(0, bucket.minutes),
    }));
}

function examAlerts(alerts: CoachPanelReportResponse["examPrepGap"]["alerts"]): ReactNode {
  if (!alerts?.length) return null;
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {alerts.map((alert, index) => (
        <li
          key={`${alert.label}-${index}`}
          className={`rounded-xl px-3 py-2 text-xs font-medium ${
            alert.severity === "danger"
              ? "bg-rose-50 text-rose-700"
              : alert.severity === "warning"
              ? "bg-amber-50 text-amber-700"
              : "bg-sky-50 text-sky-700"
          }`}
        >
          {alert.label}
        </li>
      ))}
    </ul>
  );
}

export function CoachPanel({ studentId, data }: CoachPanelProps) {
  const { report, loading: reportLoading, error: reportError } = useCoachPanelReport(studentId);

  const recentJourney = data?.lessonJourney;
  const profileHeader = data?.profileHeader;

  const journeyLessons = useMemo(() => {
    if (!recentJourney?.lessons?.length) {
      return [] as CoachPanelLessonJourneyEntry[];
    }
    return recentJourney.lessons
      .map((lesson) => {
        const normalizedLessonId =
          typeof lesson.lessonId === "number" && Number.isFinite(lesson.lessonId)
            ? Math.trunc(lesson.lessonId)
            : null;
        const normalizedLevelSeq =
          typeof lesson.lessonLevelSeq === "number" && Number.isFinite(lesson.lessonLevelSeq)
            ? lesson.lessonLevelSeq
            : null;
        const normalizedGlobalSeq =
          typeof lesson.lessonGlobalSeq === "number" && Number.isFinite(lesson.lessonGlobalSeq)
            ? Math.trunc(lesson.lessonGlobalSeq)
            : normalizedLessonId ?? normalizedLevelSeq ?? 0;
        const normalizedLevelCode = lesson.levelCode ?? "OTROS";
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
  }, [recentJourney]);

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
            typeof a.lessons[0].lessonLevelSeq === "number" && Number.isFinite(a.lessons[0].lessonLevelSeq)
              ? a.lessons[0].lessonLevelSeq
              : a.lessons[0].lessonGlobalSeq;
          const bSeq =
            typeof b.lessons[0].lessonLevelSeq === "number" && Number.isFinite(b.lessons[0].lessonLevelSeq)
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

  const planLevelMin = recentJourney?.plannedLevelMin ?? profileHeader?.planLevelMin ?? null;
  const planLevelMax = recentJourney?.plannedLevelMax ?? profileHeader?.planLevelMax ?? null;
  const planStartLabel = planLevelMin ?? "—";
  const planEndLabel = planLevelMax ?? "—";
  const planProgressPercent = formatPercent(profileHeader?.planProgressPct, 0);
  const completedLessonsLabel = formatNumber(profileHeader?.completedLessonsInPlan);
  const totalLessonsLabel = formatNumber(profileHeader?.totalLessonsInPlan);

  const heatmapSeries = useMemo(() => buildHeatmapSeries(report?.consistency.dailyHeatmap ?? []), [report?.consistency.dailyHeatmap]);
  const heatmapMax = useMemo(() => heatmapSeries.reduce((max, point) => (point.minutes > max ? point.minutes : max), 0), [heatmapSeries]);
  const consistencyScore = report?.consistency.consistencyScore ?? null;
  const histogramBuckets = useMemo(() => buildHistogramBuckets(report?.hoursHistogram.byHour ?? []), [report?.hoursHistogram.byHour]);

  return (
    <div className="space-y-10">

      <section className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
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

              return (
                <div key={level.levelCode ?? `level-${levelIndex}`} className={levelWrapperClasses}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Nivel {level.levelCode === "OTROS" ? "OT" : level.levelCode}
                      </h4>
                      <div className="h-px flex-1 bg-[#E0E0E0]" />
                    </div>
                    {level.lessons.length ? (
                      <div className="flex w-full items-center pb-0.5 md:pb-0">
                        <div className="flex w-full flex-nowrap items-center gap-[1px] md:gap-[2px] lg:gap-[3px]">
                          {level.lessons.map((lesson, lessonIndex) => {
                            const key = `journey-lesson-${lesson.lessonGlobalSeq}-${lesson.lessonId ?? "na"}`;
                            const isLast = lessonIndex === level.lessons.length - 1;
                            return (
                              <Fragment key={key}>
                                {renderLessonNode(lesson)}
                                {!isLast ? (
                                  <div className="h-[2px] w-[4px] bg-[#E0E0E0] md:w-[6px] lg:w-[8px]" />
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

      <section className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] mb-14">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">Actividad 30d</span>
            <h4 className="text-xl font-bold text-brand-deep">Actividad de estudio reciente</h4>
            <p className="text-sm text-brand-ink-muted">
              Revisa los indicadores principales de constancia antes de ahondar en el resto del panel.
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory/80 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Días activos (30d)</p>
              <p className="mt-2 text-2xl font-bold text-brand-deep">
                {formatNumber(report?.studyVolume.diasActivos30d)}
              </p>
            </div>
            <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory/80 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Horas totales (30d)</p>
              <p className="mt-2 text-2xl font-bold text-brand-deep">
                {formatMinutesToHours(report?.studyVolume.minutosTotales30d ?? null)}
              </p>
            </div>
            <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory/80 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">Promedio por sesión</p>
              <p className="mt-2 text-2xl font-bold text-brand-deep">
                {report?.studyVolume.promedioMinutosPorSesion30d != null
                  ? `${formatNumber(report.studyVolume.promedioMinutosPorSesion30d)} min`
                  : "—"}
              </p>
            </div>
          </div>
          {reportLoading ? (
            <p className="mt-4 text-sm text-slate-500">Cargando indicadores…</p>
          ) : null}
          {reportError ? (
            <p className="mt-4 text-sm text-rose-600">{reportError}</p>
          ) : null}
          {report?.fallback ? (
            <p className="mt-4 text-xs text-amber-600">Datos en modo seguro: algunas vistas están recalculándose.</p>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">Mapa de color</span>
              <h4 className="text-xl font-bold text-brand-deep">Minutos por día (30d)</h4>
              <p className="text-sm text-brand-ink-muted">Intensidad de estudio durante el último mes.</p>
            </div>
            <div className="mt-4 grid grid-cols-10 gap-2">
              {heatmapSeries.map((cell) => (
                <div
                  key={cell.date}
                  className="h-8 w-full rounded-xl border border-white/40 shadow-sm"
                  style={{ backgroundColor: heatmapColor(cell.minutes, heatmapMax) }}
                  title={`${cell.date} · ${cell.minutes} min`}
                />
              ))}
            </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-brand-ink-muted">Consistency score</p>
                  <p className="text-2xl font-bold text-brand-deep">
                    {consistencyScore != null
                      ? `${Math.round(consistencyScore)} / 100`
                      : "—"}
                  </p>
                </div>
                {consistencyScore != null ? (
                  <span
                    className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold ${
                      CONSISTENCY_TONE.find((tone) => consistencyScore >= tone.threshold)?.className ??
                      "bg-slate-50 text-slate-600"
                    }`}
                  >
                    {consistencyScore >= 80
                      ? "Muy constante"
                      : consistencyScore >= 50
                      ? "Variable"
                      : "Irregular"}
                  </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">Hábitos</span>
              <h4 className="text-xl font-bold text-brand-deep">Estabilidad y confiabilidad</h4>
              <p className="text-sm text-brand-ink-muted">Seguimiento de LEI y patrón de estudio.</p>
            </div>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-ivory/70 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-brand-ink-muted">Estabilidad de eficiencia</p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <span className="text-3xl font-black text-brand-deep">
                    {report?.efficiencyStability.efficiencyStabilityScore != null
                      ? `${Math.round(report.efficiencyStability.efficiencyStabilityScore)} / 100`
                      : "—"}
                  </span>
                  {report?.efficiencyStability.stabilitySparkline?.length ? (
                    <svg viewBox="0 0 100 100" className="h-12 w-24 text-sky-500">
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        points={sparklinePoints(report.efficiencyStability.stabilitySparkline)}
                      />
                    </svg>
                  ) : (
                    <span className="text-sm text-slate-500">Sin tendencia</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${habitTone(report?.habitReliability.label ?? null)}`}>
                  Patrón: {report?.habitReliability.label ?? "No disponible"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">Horario</span>
              <h4 className="text-xl font-bold text-brand-deep">Histograma de horas (30d)</h4>
              <p className="text-sm text-brand-ink-muted">Identifica los momentos preferidos de estudio.</p>
            </div>
            <div className="mt-6 grid grid-cols-4 gap-3 text-center text-xs text-slate-500 sm:grid-cols-6">
              {histogramBuckets.map((bucket) => {
                const maxMinutes = Math.max(...histogramBuckets.map(b => b.minutes), 1);
                const heightPercent = (bucket.minutes / maxMinutes) * 100;
                return (
                  <div key={bucket.hourLabel} className="flex flex-col items-center gap-2">
                    <div className="relative h-24 w-full flex items-end justify-center">
                      <div
                        className="w-8 rounded-lg bg-brand-teal shadow-sm transition-all"
                        style={{ height: `${Math.max(heightPercent, 5)}%` }}
                      />
                    </div>
                    <span className="font-medium">{bucket.hourLabel}</span>
                    <span className="text-[10px] text-brand-ink-muted">{bucket.minutes} min</span>
                  </div>
                );
              })}
              {!histogramBuckets.length && <p className="col-span-full text-sm text-slate-500">Sin datos de horario.</p>}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.36em] text-brand-teal">Perfil 30d</span>
              <h4 className="text-xl font-bold text-brand-deep">LEI vs Velocidad</h4>
              <p className="text-sm text-brand-ink-muted">Ubicación del estudiante en el cuadrante de rendimiento.</p>
            </div>
            {report?.quadrantProfile ? (
              <div className="mt-8 space-y-8 pb-6">
                <QuadrantMatrix quadrantLabel={report.quadrantProfile.quadrantLabel} />
                <dl className="grid gap-6 text-sm text-brand-ink-muted sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.3em] text-brand-ink-muted/70">Lecciones/hora</dt>
                    <dd className="mt-1 text-2xl font-semibold text-brand-deep">
                      {report.quadrantProfile.lessonsPerHour != null
                        ? report.quadrantProfile.lessonsPerHour.toFixed(2)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.3em] text-brand-ink-muted/70">Lecciones/semana</dt>
                    <dd className="mt-1 text-2xl font-semibold text-brand-deep">
                      {report.quadrantProfile.lessonsPerWeek != null
                        ? report.quadrantProfile.lessonsPerWeek.toFixed(1)
                        : "—"}
                    </dd>
                  </div>
                </dl>
                <p className="text-sm text-brand-deep">
                  {report.quadrantProfile.description ??
                    quadrantDescription(report.quadrantProfile.quadrantLabel) ??
                    "Perfil sin descripción"}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Perfil de cuadrante no disponible.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
