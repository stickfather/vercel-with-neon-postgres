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

function extractSequenceValue(
  lessonId: string | null,
  lessonLabel: string | null,
  fallback: number,
): number {
  const candidates = [lessonLabel, lessonId];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const raw = candidate.trim();
    if (!raw.length) continue;

    const numericMatch = raw.match(/\d+(?:[.,]\d+)?/);
    if (numericMatch) {
      const parsed = Number(numericMatch[0].replace(",", "."));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
}

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(ms / dayMs, 0);
}

function ProgressLineChart({
  data,
  contractStart,
}: {
  data: LessonTimelineEntry[];
  contractStart: string | null | undefined;
}) {
  if (!data.length) {
    return (
      <p className="text-xs leading-tight text-brand-ink-muted">
        No hay registros de progreso en el rango seleccionado.
      </p>
    );
  }

  const withDates = data
    .map((entry) => ({
      ...entry,
      parsedDate: toGuayaquilDate(entry.date),
    }))
    .filter((entry) => entry.parsedDate);

  if (!withDates.length) {
    return (
      <p className="text-xs leading-tight text-brand-ink-muted">
        No hay registros de progreso en el rango seleccionado.
      </p>
    );
  }

  withDates.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  const today = new Date();
  const contractStartDate = contractStart ? toGuayaquilDate(contractStart) : null;
  const firstDate = withDates[0]?.parsedDate ?? today;
  const timelineStart = contractStartDate && contractStartDate < firstDate ? contractStartDate : firstDate;
  const timelineEnd = today;
  const totalDays = Math.max(daysBetween(timelineStart, timelineEnd), 1);

  let lastSequence = 0;
  const coordinates = withDates.map((entry, index) => {
    const baseSequence = extractSequenceValue(entry.lessonId, entry.lessonLabel, lastSequence || index + 1);
    const sequence = baseSequence <= lastSequence ? lastSequence + 1 : baseSequence;
    lastSequence = sequence;

    return {
      ...entry,
      sequence,
      dateLabel: formatDateInGuayaquil(entry.date, { day: "2-digit", month: "short" }),
    };
  });

  const sequences = coordinates.map((point) => point.sequence);
  const minSequence = Math.min(...sequences);
  const maxSequence = Math.max(...sequences);
  const range = Math.max(maxSequence - minSequence, 1);

  const paddingX = 40;
  const paddingY = 36;
  const width = 640;
  const height = 200;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const plottedPoints = coordinates.map((point) => {
    const date = point.parsedDate ?? timelineStart;
    const x =
      ((daysBetween(timelineStart, date) / totalDays) * chartWidth + paddingX) || paddingX;
    const y =
      height - paddingY - ((point.sequence - minSequence) / range) * chartHeight;
    return { ...point, x, y };
  });

  const linePoints = plottedPoints.map((point) => `${point.x},${point.y}`).join(" ");

  const yTicks = Array.from({ length: 4 }).map((_, index) => {
    const value = minSequence + (range * index) / 3;
    const y = height - paddingY - ((value - minSequence) / range) * chartHeight;
    return { value, y };
  });

  const xTicks = Array.from({ length: 4 }).map((_, index) => {
    const ratio = index / 3;
    const daysOffset = totalDays * ratio;
    const tickDate = new Date(timelineStart.getTime() + daysOffset * 24 * 60 * 60 * 1000);
    const x = paddingX + chartWidth * ratio;
    return {
      label: getFormatter({ day: "2-digit", month: "short" }).format(tickDate),
      x,
    };
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/80 px-3 py-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full">
        <defs>
          <linearGradient id="gridGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <rect
          x={paddingX}
          y={paddingY - 4}
          width={chartWidth}
          height={chartHeight + 8}
          fill="url(#gridGradient)"
          opacity={0.16}
        />
        {yTicks.map((tick, index) => (
          <g key={`y-${index}`}>
            <line
              x1={paddingX}
              y1={tick.y}
              x2={paddingX + chartWidth}
              y2={tick.y}
              stroke="#dbe5f1"
              strokeWidth={index === 0 ? 1.5 : 1}
              strokeDasharray={index === 0 ? undefined : "4 6"}
            />
            <text
              x={paddingX - 10}
              y={tick.y + 3}
              textAnchor="end"
              fontSize={10}
              fill="#64748b"
            >
              {formatNumber(tick.value, 0)}
            </text>
          </g>
        ))}
        {xTicks.map((tick, index) => (
          <g key={`x-${index}`}>
            <line
              x1={tick.x}
              y1={paddingY + chartHeight}
              x2={tick.x}
              y2={paddingY + chartHeight + 6}
              stroke="#cbd5e1"
              strokeWidth={1}
            />
            <text
              x={tick.x}
              y={paddingY + chartHeight + 18}
              textAnchor="middle"
              fontSize={10}
              fill="#64748b"
            >
              {tick.label}
            </text>
          </g>
        ))}
        <polyline
          fill="none"
          stroke="#00bfa6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={linePoints}
        />
        {plottedPoints.map((point, index) => (
          <g key={`${point.date ?? index}-point`}>
            <circle cx={point.x} cy={point.y} r={3.5} fill="#00bfa6">
              <title>{`${point.dateLabel}: ${point.lessonLabel ?? point.lessonId ?? "Sin lección"}`}</title>
            </circle>
          </g>
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
  contractStart?: string | null;
};

export function AttendancePanel({
  attendanceStats,
  stats,
  lessonTimeline,
  startDate,
  endDate,
  excludeSundays,
  errorMessage,
  contractStart,
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

  const dateRangeLabel = `${formatDateInGuayaquil(startDate, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} al ${formatDateInGuayaquil(endDate, { day: "2-digit", month: "short", year: "numeric" })}`;

  return (
    <section className="flex flex-col gap-5 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <header className="flex flex-col gap-1 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-deep">Panel 5</span>
        <h2 className="text-2xl font-bold text-brand-deep">Asistencia y progreso</h2>
        <p className="text-xs sm:text-[11px] leading-tight text-brand-ink-muted">
          Resumen del periodo del {dateRangeLabel}.
        </p>
        {excludeSundays && (
          <p className="text-[11px] text-brand-ink-muted">
            Los promedios diarios excluyen domingos para evitar distorsiones en la comparación.
          </p>
        )}
        {errorMessage && (
          <p className="text-xs font-semibold text-red-600">{errorMessage}</p>
        )}
      </header>

      <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryMetrics.map((metric) => (
          <div
            key={metric.key}
            className="flex h-full flex-col justify-between gap-2 rounded-[24px] border border-white/70 bg-white/95 p-4 text-left shadow-inner"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
              {metric.label}
            </span>
            <span className="text-xl font-black tracking-tight text-brand-deep" title={metric.tooltip}>
              {metric.formatted}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-deep">Tiempo vs progreso</h3>
        <ProgressLineChart data={lessonTimeline} contractStart={contractStart} />
        <p className="text-[11px] text-brand-ink-muted">
          Cada punto representa la lección alcanzada en la fecha indicada desde el inicio de contrato.
        </p>
      </div>
    </section>
  );
}

export function AttendancePanelSkeleton() {
  return (
    <section className="flex animate-pulse flex-col gap-5 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-col gap-2">
        <span className="h-3 w-36 rounded-full bg-brand-deep-soft/60" />
        <span className="h-6 w-44 rounded-full bg-brand-deep-soft/80" />
        <span className="h-3 w-56 rounded-full bg-brand-deep-soft/50" />
        <span className="h-3 w-60 rounded-full bg-brand-deep-soft/40" />
      </div>
      <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex h-full flex-col gap-2 rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-inner"
          >
            <span className="h-3 w-32 rounded-full bg-brand-deep-soft/40" />
            <span className="h-6 w-20 rounded-full bg-brand-deep-soft/30" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <span className="h-3 w-44 rounded-full bg-brand-deep-soft/40" />
        <span className="h-48 w-full rounded-3xl bg-brand-deep-soft/30" />
      </div>
    </section>
  );
}
