import type {
  CumulativeHoursEntry,
  LessonTimelineEntry,
  MinutesByDayEntry,
  StudentAttendanceStats,
  StudentProgressEvent,
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
  const normalizedDigits = Math.min(Math.max(digits, 1), 2);
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: normalizedDigits,
    maximumFractionDigits: normalizedDigits,
  }).format(value);
}

function MinutesChart({ data }: { data: MinutesByDayEntry[] }) {
  if (!data.length) {
    return (
      <p className="text-sm text-brand-ink-muted">
        No hay sesiones registradas en el rango seleccionado.
      </p>
    );
  }

  const maxMinutes = Math.max(...data.map((item) => item.minutes), 1);

  return (
    <div className="flex items-end gap-1 overflow-x-auto rounded-2xl bg-white/95 p-3">
      {data.map((item) => {
        const height = Math.max((item.minutes / maxMinutes) * 120, 4);
        const label = formatDateInGuayaquil(item.date, { day: "2-digit" });
        return (
          <div key={item.date} className="flex flex-col items-center gap-1">
            <div
              className="w-8 rounded-t-full bg-brand-teal-soft"
              style={{ height }}
              title={`${label}: ${item.minutes} minutos`}
            />
            <span className="text-[10px] font-medium uppercase tracking-wide text-brand-ink-muted">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CumulativeChart({ data }: { data: CumulativeHoursEntry[] }) {
  if (!data.length) {
    return (
      <p className="text-sm text-brand-ink-muted">
        No se generaron horas acumuladas en este periodo.
      </p>
    );
  }

  const maxHours = Math.max(...data.map((item) => item.hours), 1);
  const width = Math.max(data.length * 40, 240);
  const height = 160;
  const points = data
    .map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * (width - 40) + 20;
      const y = height - (item.hours / maxHours) * (height - 40) - 20;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full min-w-[240px]">
        <defs>
          <linearGradient id="hoursGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#00bfa6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#00bfa6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke="#00bfa6"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        <polygon
          points={`${points} ${width - 20},${height - 20} 20,${height - 20}`}
          fill="url(#hoursGradient)"
          opacity={0.7}
        />
        {data.map((item, index) => {
          const x = (index / Math.max(data.length - 1, 1)) * (width - 40) + 20;
          const y = height - (item.hours / maxHours) * (height - 40) - 20;
          const label = formatDateInGuayaquil(item.date, {
            day: "2-digit",
            month: "short",
          });
          return (
            <g key={item.date}>
              <circle cx={x} cy={y} r={3} fill="#00bfa6">
                <title>{`${label}: ${item.hours.toFixed(2)} horas`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LessonTimeline({ data }: { data: LessonTimelineEntry[] }) {
  if (!data.length) {
    return <p className="text-sm text-brand-ink-muted">Sin progresión registrada en el periodo.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {data.map((item, index) => {
        const key = `${item.date}-${item.lessonId ?? item.lessonLabel ?? index}`;
        const lessonLabel = item.lessonLabel ?? item.lessonId ?? "Sin lección";
        return (
          <li
            key={key}
            className="flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-inner"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
              {formatDateInGuayaquil(item.date, { day: "2-digit", month: "short" })}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-brand-deep">{lessonLabel}</span>
              {item.lessonId && item.lessonLabel && item.lessonId !== item.lessonLabel && (
                <span className="text-xs uppercase tracking-wide text-brand-ink-muted">
                  {item.lessonId}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ProgressEventsList({ data }: { data: StudentProgressEvent[] }) {
  if (!data.length) {
    return (
      <p className="text-sm text-brand-ink-muted">
        No hay eventos de progreso registrados para este estudiante en el rango seleccionado.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {data.map((event, index) => {
        const key = `${event.occurredAt}-${event.toLessonLabel ?? event.fromLessonLabel ?? index}`;
        const changeSummary = (() => {
          if (event.fromLessonLabel && event.toLessonLabel) {
            return `De ${event.fromLessonLabel} a ${event.toLessonLabel}`;
          }
          if (event.toLessonLabel) return event.toLessonLabel;
          if (event.fromLessonLabel) return event.fromLessonLabel;
          return "Actualización registrada";
        })();

        return (
          <li
            key={key}
            className="flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-inner"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
              {formatDateInGuayaquil(event.occurredAt, {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </span>
            <div className="flex flex-col">
              {event.description && (
                <span className="text-sm font-semibold text-brand-deep">{event.description}</span>
              )}
              <span className="text-xs text-brand-ink-muted">{changeSummary}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

type Props = {
  attendanceStats: StudentAttendanceStats;
  stats: StudentProgressStats;
  minutesByDay: MinutesByDayEntry[];
  cumulativeHours: CumulativeHoursEntry[];
  lessonTimeline: LessonTimelineEntry[];
  progressEvents: StudentProgressEvent[];
  startDate: string;
  endDate: string;
  excludeSundays: boolean;
  errorMessage: string | null;
};

export function AttendancePanel({
  attendanceStats,
  stats,
  minutesByDay,
  cumulativeHours,
  lessonTimeline,
  progressEvents,
  startDate,
  endDate,
  excludeSundays,
  errorMessage,
}: Props) {
  const summaryMetrics = [
    {
      key: "totalMinutes",
      label: "Minutos totales",
      value: attendanceStats.totalMinutes,
      digits: 1,
    },
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
      key: "avgSessionsPerDay",
      label: "Sesiones promedio por día",
      value: attendanceStats.averageSessionsPerDay,
      digits: 2,
    },
    {
      key: "avgMinutesPerDay",
      label: "Minutos promedio por día",
      value: attendanceStats.averageMinutesPerDay,
      digits: 1,
    },
    {
      key: "avgMinutesPerDayExclSun",
      label: "Minutos por día (sin domingos)",
      value: attendanceStats.averageMinutesPerDayExcludingSundays,
      digits: 1,
    },
    {
      key: "lessonChanges",
      label: "Cambios de lección",
      value: attendanceStats.lessonChanges,
      digits: 1,
    },
    {
      key: "lessonsPerWeek",
      label: "Lecciones por semana",
      value: attendanceStats.lessonsPerWeek ?? stats.lessonsPerWeek,
      digits: 2,
    },
    {
      key: "averageDaysPerWeek",
      label: "Días promedio por semana",
      value: stats.averageDaysPerWeek,
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
          <p className="text-xs font-semibold text-red-600">
            {errorMessage}
          </p>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryMetrics.map((metric) => (
          <div
            key={metric.key}
            className="flex flex-col gap-2 rounded-[24px] bg-white/95 p-5 shadow-inner"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
              {metric.label}
            </span>
            <span
              className="text-3xl font-black text-brand-deep"
              title={metric.tooltip}
            >
              {metric.formatted}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-deep">
            Minutos por día
          </h3>
          <MinutesChart data={minutesByDay} />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-deep">
            Horas acumuladas
          </h3>
          <CumulativeChart data={cumulativeHours} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-deep">
          Línea de lecciones
        </h3>
        <LessonTimeline data={lessonTimeline} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-deep">
          Eventos de progreso
        </h3>
        <ProgressEventsList data={progressEvents} />
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-[24px] bg-white/95 p-5 shadow-inner"
          >
            <span className="h-3 w-32 rounded-full bg-brand-deep-soft/40" />
            <span className="h-6 w-20 rounded-full bg-brand-deep-soft/30" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3">
            <span className="h-3 w-32 rounded-full bg-brand-deep-soft/40" />
            <span className="h-40 w-full rounded-3xl bg-brand-deep-soft/30" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <span className="h-3 w-40 rounded-full bg-brand-deep-soft/40" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className="h-10 w-full rounded-2xl bg-brand-deep-soft/30" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <span className="h-3 w-44 rounded-full bg-brand-deep-soft/40" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className="h-10 w-full rounded-2xl bg-brand-deep-soft/30" />
          ))}
        </div>
      </div>
    </section>
  );
}
