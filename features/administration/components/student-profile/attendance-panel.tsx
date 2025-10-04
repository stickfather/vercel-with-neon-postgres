import type {
  CumulativeHoursEntry,
  LessonTimelineEntry,
  MinutesByDayEntry,
  StudentProgressStats,
} from "@/features/administration/data/student-profile";

type Props = {
  stats: StudentProgressStats;
  minutesByDay: MinutesByDayEntry[];
  cumulativeHours: CumulativeHoursEntry[];
  lessonTimeline: LessonTimelineEntry[];
  startDate: string;
  endDate: string;
};

function formatNumber(value: number | null, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits).replace(".0", ".0");
}

function MinutesChart({ data }: { data: MinutesByDayEntry[] }) {
  if (!data.length) {
    return (
      <p className="text-sm text-brand-ink-muted">No hay sesiones registradas en el rango seleccionado.</p>
    );
  }
  const maxMinutes = Math.max(...data.map((item) => item.minutes), 1);
  return (
    <div className="flex items-end gap-1 overflow-x-auto rounded-2xl bg-white/95 p-3">
      {data.map((item) => {
        const height = Math.max((item.minutes / maxMinutes) * 120, 4);
        return (
          <div key={item.date} className="flex flex-col items-center gap-1">
            <div
              className="w-8 rounded-t-full bg-brand-teal-soft"
              style={{ height }}
              title={`${item.minutes} minutos`}
            />
            <span className="text-[10px] font-medium uppercase tracking-wide text-brand-ink-muted">
              {new Date(item.date).toLocaleDateString("es-EC", { day: "2-digit" })}
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
      <p className="text-sm text-brand-ink-muted">No se generaron horas acumuladas en este periodo.</p>
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
          return <circle key={item.date} cx={x} cy={y} r={3} fill="#00bfa6" />;
        })}
      </svg>
    </div>
  );
}

function LessonTimeline({ data }: { data: LessonTimelineEntry[] }) {
  if (!data.length) {
    return (
      <p className="text-sm text-brand-ink-muted">Sin progresión registrada en el periodo.</p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {data.map((item) => (
        <li
          key={`${item.date}-${item.lesson ?? ""}`}
          className="flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-inner"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
            {new Date(item.date).toLocaleDateString("es-EC", {
              day: "2-digit",
              month: "short",
            })}
          </span>
          <span className="text-sm font-semibold text-brand-deep">
            {item.lesson ?? "Sin lección"}
          </span>
          {item.level && (
            <span className="rounded-full bg-brand-teal-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-teal">
              {item.level}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

export function AttendancePanel({
  stats,
  minutesByDay,
  cumulativeHours,
  lessonTimeline,
  startDate,
  endDate,
}: Props) {
  return (
    <section className="flex flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <header className="flex flex-col gap-1 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-deep">Panel 5</span>
        <h2 className="text-2xl font-bold text-brand-deep">Asistencia y progreso</h2>
        <p className="text-sm text-brand-ink-muted">
          Resumen del periodo del {new Date(startDate).toLocaleDateString("es-EC")}{" "}
          al {new Date(endDate).toLocaleDateString("es-EC")}.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-[24px] bg-white/95 p-5 shadow-inner">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
            Promedio de minutos por sesión
          </span>
          <span className="text-3xl font-black text-brand-deep">
            {formatNumber(stats.averageSessionLengthMinutes)}
          </span>
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-white/95 p-5 shadow-inner">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
            Días por semana
          </span>
          <span className="text-3xl font-black text-brand-deep">
            {formatNumber(stats.averageDaysPerWeek)}
          </span>
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-white/95 p-5 shadow-inner">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
            Progreso semanal promedio
          </span>
          <span className="text-3xl font-black text-brand-deep">
            {formatNumber(stats.averageProgressPerWeek)}
          </span>
        </div>
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
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-[24px] bg-white/95 p-5 shadow-inner">
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
    </section>
  );
}
