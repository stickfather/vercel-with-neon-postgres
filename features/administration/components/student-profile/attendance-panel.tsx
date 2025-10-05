import type {
  LessonTimelineEntry,
  StudentAttendanceStats,
  StudentProgressStats,
} from "@/features/administration/data/student-profile";

const GUAYAQUIL_TIME_ZONE = "America/Guayaquil";
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);
  let formatter = dateFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("es-EC", {
      timeZone: GUAYAQUIL_TIME_ZONE,
      ...options,
    });
    dateFormatterCache.set(key, formatter);
  }
  return formatter;
}

function toGuayaquilDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const trimmed = value.trim();
  if (!trimmed.length) return null;

  let iso = trimmed.replace(" ", "T");
  if (!iso.includes("T")) {
    iso = `${iso}T00:00:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso)) {
    iso = `${iso}:00`;
  }
  if (!/[+-]\d{2}:?\d{2}|Z$/i.test(iso)) {
    iso = `${iso}-05:00`;
  }

  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateInGuayaquil(
  value: string | Date | null,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = toGuayaquilDate(value);
  if (!date) return "—";
  return getFormatter(options).format(date);
}

function formatNumber(value: number | null, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const normalizedDigits = Math.min(Math.max(digits, 0), 2);
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: normalizedDigits,
    maximumFractionDigits: normalizedDigits,
  }).format(value);
}

const LEVEL_BASE_VALUES: Record<string, number> = {
  a1: 1,
  a2: 2,
  b1: 3,
  b2: 4,
  c1: 5,
  c2: 6,
};

function extractProgressValue(
  lessonId: string | null,
  lessonLabel: string | null,
  index: number,
): number {
  const candidates = [lessonId, lessonLabel];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const raw = candidate.trim();
    if (!raw) continue;

    const levelMatch = raw.toLowerCase().match(/^([abc]\d)(?:[-\s]*(\d+))?/);
    if (levelMatch) {
      const base = LEVEL_BASE_VALUES[levelMatch[1] as keyof typeof LEVEL_BASE_VALUES];
      if (base != null) {
        const unit = levelMatch[2] ? Number(levelMatch[2]) : 0;
        if (Number.isFinite(unit)) {
          return base + unit / 100;
        }
        return base;
      }
    }

    const numericMatch = raw.match(/\d+(?:[.,]\d+)?/);
    if (numericMatch) {
      const value = Number(numericMatch[0].replace(",", "."));
      if (Number.isFinite(value)) {
        return value;
      }
    }
  }

  return index + 1;
}

function ProgressLineChart({ data }: { data: LessonTimelineEntry[] }) {
  if (!data.length) {
    return (
      <p className="text-sm text-brand-ink-muted">
        No hay registros de progreso en el rango seleccionado.
      </p>
    );
  }

  const sorted = [...data].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const coordinates = sorted.map((entry, index) => {
    const progress = extractProgressValue(entry.lessonId, entry.lessonLabel, index);
    return {
      ...entry,
      progress,
      index,
      dateLabel: formatDateInGuayaquil(entry.date, { day: "2-digit", month: "short" }),
      lessonSummary: entry.lessonLabel ?? entry.lessonId ?? "Sin lección",
    };
  });

  const progressValues = coordinates.map((point) => point.progress);
  const minProgress = Math.min(...progressValues, 0);
  const maxProgress = Math.max(...progressValues, 1);
  const range = Math.max(maxProgress - minProgress, 1);
  const padding = 40;
  const width = Math.max(coordinates.length * 80, 360);
  const height = 220;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const plottedPoints = coordinates.map((point) => {
    const x =
      (point.index / Math.max(coordinates.length - 1, 1)) * chartWidth + padding;
    const y =
      height - padding - ((point.progress - minProgress) / range) * chartHeight;
    return { ...point, x, y };
  });

  const linePoints = plottedPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const yTicks = Array.from({ length: 4 }).map((_, index) => {
    const value = minProgress + (range * index) / 3;
    const y = height - padding - ((value - minProgress) / range) * chartHeight;
    return { value, y };
  });

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full min-w-[360px]">
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#d4d4f5"
          strokeWidth={1}
          strokeDasharray="4 6"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#d4d4f5"
          strokeWidth={1}
          strokeDasharray="4 6"
        />
        {yTicks.map((tick, index) => (
          <g key={`tick-${index}`}>
            <line
              x1={padding}
              y1={tick.y}
              x2={width - padding}
              y2={tick.y}
              stroke="#edf2f7"
              strokeWidth={index === 0 ? 0 : 1}
              strokeDasharray="4 6"
            />
            <text
              x={padding - 8}
              y={tick.y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#94a3b8"
            >
              {formatNumber(tick.value, 2)}
            </text>
          </g>
        ))}
        <polyline
          fill="none"
          stroke="#00bfa6"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={linePoints}
        />
        {plottedPoints.map((point) => (
          <g key={`${point.date}-${point.index}`}>
            <circle cx={point.x} cy={point.y} r={4} fill="#00bfa6">
              <title>{`${point.dateLabel}: ${point.lessonSummary} · ${formatNumber(point.progress, 2)} pts`}</title>
            </circle>
          </g>
        ))}
        {plottedPoints.map((point) => (
          <text
            key={`label-${point.date}-${point.index}`}
            x={point.x}
            y={height - padding + 18}
            textAnchor="middle"
            fontSize="10"
            fill="#64748b"
          >
            {point.dateLabel}
          </text>
        ))}
      </svg>
    </div>
  );
}

type Props = {
  attendanceStats: StudentAttendanceStats;
  stats: StudentProgressStats;
  lessonTimeline: LessonTimelineEntry[];
  startDate: string;
  endDate: string;
  excludeSundays: boolean;
  errorMessage: string | null;
};

export function AttendancePanel({
  attendanceStats,
  stats,
  lessonTimeline,
  startDate,
  endDate,
  excludeSundays,
  errorMessage,
}: Props) {
  const summaryMetrics = [
    {
      key: "totalHours",
      label: "Horas totales",
      value: attendanceStats.totalHours,
      digits: 1,
    },
    {
      key: "avgSessionMinutes",
      label: "Minutos promedio por sesión",
      value: attendanceStats.averageSessionMinutes ?? stats.averageSessionLengthMinutes,
      digits: 1,
    },
    {
      key: "lessonChanges",
      label: "Lecciones avanzadas",
      value: attendanceStats.lessonChanges,
      digits: 0,
    },
    {
      key: "lessonsPerWeek",
      label: "Lecciones por semana",
      value: attendanceStats.lessonsPerWeek ?? stats.lessonsPerWeek,
      digits: 2,
    },
    {
      key: "averageProgressPerWeek",
      label: "Progreso promedio por semana",
      value: stats.averageProgressPerWeek,
      digits: 2,
    },
  ].map((metric) => ({
    ...metric,
    formatted: formatNumber(metric.value, metric.digits),
    tooltip:
      metric.value == null || !Number.isFinite(metric.value)
        ? "Sin dato"
        : formatNumber(metric.value, metric.digits),
  }));

  const dateRangeLabel = `${formatDateInGuayaquil(startDate, { day: "2-digit", month: "short", year: "numeric" })} al ${formatDateInGuayaquil(endDate, { day: "2-digit", month: "short", year: "numeric" })}`;

  return (
    <section className="flex flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <header className="flex flex-col gap-1 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-deep">Panel 5</span>
        <h2 className="text-2xl font-bold text-brand-deep">Asistencia y progreso</h2>
        <p className="text-sm text-brand-ink-muted">Resumen del periodo del {dateRangeLabel}.</p>
        {excludeSundays && (
          <p className="text-xs text-brand-ink-muted">
            Los promedios diarios excluyen domingos para evitar distorsiones en la comparación.
          </p>
        )}
        {errorMessage && (
          <p className="text-xs font-semibold text-red-600">{errorMessage}</p>
        )}
      </header>

      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryMetrics.map((metric) => (
          <div
            key={metric.key}
            className="flex h-full flex-col justify-between gap-3 rounded-[24px] border border-white/70 bg-white/95 p-5 text-left shadow-inner"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
              {metric.label}
            </span>
            <span className="text-3xl font-black tracking-tight text-brand-deep" title={metric.tooltip}>
              {metric.formatted}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-deep">
          Tiempo vs progreso
        </h3>
        <ProgressLineChart data={lessonTimeline} />
        <p className="text-xs text-brand-ink-muted">
          Cada punto representa la lección alcanzada en la fecha indicada.
        </p>
      </div>
    </section>
  );
}

export function AttendancePanelSkeleton() {
  return (
    <section className="flex animate-pulse flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-col gap-2">
        <span className="h-3 w-36 rounded-full bg-brand-deep-soft/60" />
        <span className="h-6 w-44 rounded-full bg-brand-deep-soft/80" />
        <span className="h-3 w-56 rounded-full bg-brand-deep-soft/50" />
        <span className="h-3 w-60 rounded-full bg-brand-deep-soft/40" />
      </div>
      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex h-full flex-col gap-3 rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-inner"
          >
            <span className="h-3 w-32 rounded-full bg-brand-deep-soft/40" />
            <span className="h-6 w-20 rounded-full bg-brand-deep-soft/30" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <span className="h-3 w-44 rounded-full bg-brand-deep-soft/40" />
        <span className="h-56 w-full rounded-3xl bg-brand-deep-soft/30" />
      </div>
    </section>
  );
}
