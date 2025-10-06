import type { ReactNode } from "react";
import Link from "next/link";
import ErrorState from "../../ErrorState";
import {
  minutesByDay,
  dauWauTrend90d,
  shortSessionTrend90d,
  engagementSegments,
  engagementSegmentsByLevel,
  engagementSnapshot,
  type MinutesByDayRow,
  type DauWauRow,
  type ShortSessionRow,
  type SegmentRow,
  type SegmentByLevelRow,
  type EngagementSnapshot,
} from "../../data/engagement.read";
import DauWauTrendChart from "./EngagementCharts.client";

const numberFormatter = new Intl.NumberFormat("es-EC");
const percentFormatter = new Intl.NumberFormat("es-EC", {
  style: "percent",
  maximumFractionDigits: 1,
});
const decimalFormatter = new Intl.NumberFormat("es-EC", {
  maximumFractionDigits: 1,
});
const dateFormatter = new Intl.DateTimeFormat("es-EC", {
  month: "short",
  day: "numeric",
});
const fullDateFormatter = new Intl.DateTimeFormat("es-EC", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  const normalized = value > 1 ? value / 100 : value;
  return percentFormatter.format(normalized);
}

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return decimalFormatter.format(value);
}

function formatInteger(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return numberFormatter.format(value);
}

function buildLinePath(values: Array<{ x: number; y: number }>, height: number, padding: number) {
  if (!values.length) return "";
  return values
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${point.x.toFixed(2)},${(height - padding - point.y).toFixed(2)}`;
    })
    .join(" ");
}

function buildAreaPath(values: Array<{ x: number; y: number }>, width: number, height: number, padding: number) {
  if (!values.length) return "";
  const topPath = values
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${point.x.toFixed(2)},${(height - padding - point.y).toFixed(2)}`;
    })
    .join(" ");
  const first = values[0];
  const last = values[values.length - 1];
  return `${topPath} L${last.x.toFixed(2)},${(height - padding).toFixed(2)} L${first.x.toFixed(2)},${(height - padding).toFixed(2)} Z`;
}

function EmptyState() {
  return (
    <p className="rounded-2xl border border-dashed border-brand-ink/20 bg-white/80 px-4 py-10 text-center text-sm text-brand-ink-muted">
      Sin datos disponibles.
    </p>
  );
}

function ChartContainer({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-brand-ink/5 bg-white/95 p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-brand-deep">{title}</h3>
        {description ? <p className="text-sm text-brand-ink-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default async function EngagementPanel() {
  try {
    const [minutes, dauWau, shortSessions, segments, segmentsByLevel, snapshot] =
      (await Promise.all([
        minutesByDay(),
        dauWauTrend90d(),
        shortSessionTrend90d(),
        engagementSegments(),
        engagementSegmentsByLevel(),
        engagementSnapshot(),
      ])) as [
        MinutesByDayRow[],
        DauWauRow[],
        ShortSessionRow[],
        SegmentRow[],
        SegmentByLevelRow[],
        EngagementSnapshot | null,
      ];

    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-brand-deep">Compromiso &amp; comportamiento</h2>
          <p className="text-sm text-brand-ink-muted">Actividad, consistencia y segmentos de alumnos.</p>
        </header>

        <ChartContainer
          title="Minutos por día"
          description="Actividad total registrada en los últimos 90 días"
        >
          {minutes.length ? <MinutesByDayArea rows={minutes} /> : <EmptyState />}
        </ChartContainer>

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartContainer
            title="DAU y WAU por día"
            description="Comparativa diaria de usuarios activos"
          >
            {dauWau.length ? <DauWauTrendChart data={dauWau} /> : <EmptyState />}
          </ChartContainer>

          <ChartContainer
            title="% Sesiones cortas (\u003c60m)"
            description="Frecuencia de sesiones menores a 60 minutos en los últimos 90 días"
          >
            {shortSessions.length ? <ShortSessionTrend rows={shortSessions} /> : <EmptyState />}
            <p className="text-xs text-brand-ink-muted">Sesión corta = duración menor a 60 minutos.</p>
          </ChartContainer>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartContainer
            title="Segmentos de compromiso"
            description="Distribución total por banda"
          >
            {segments.length ? <SegmentsSummary segments={segments} /> : <EmptyState />}
          </ChartContainer>

          <ChartContainer
            title="Segmentos por nivel"
            description="Composición de bandas por nivel actual"
          >
            {segmentsByLevel.length ? (
              <SegmentsByLevel segments={segmentsByLevel} />
            ) : (
              <EmptyState />
            )}
          </ChartContainer>
        </div>

        <ChartContainer
          title="Días activos por semana"
          description="Calculado desde días activos en 30 días / 4.345"
        >
          {snapshot ? <EngagementSnapshotChips snapshot={snapshot} /> : <EmptyState />}
        </ChartContainer>
      </div>
    );
  } catch (error) {
    console.error("Error al cargar compromiso y comportamiento", error);
    return <ErrorState retryHref="/panel-gerencial/engagement" />;
  }
}

function MinutesByDayArea({ rows }: { rows: MinutesByDayRow[] }) {
  const usable = rows.filter((row) => row.total_minutes !== null);
  if (!usable.length) return <EmptyState />;

  const values = usable.map((row) => Number(row.total_minutes));
  const maxValue = Math.max(...values, 0);
  const width = 720;
  const height = 280;
  const paddingX = 32;
  const paddingY = 36;
  const span = usable.length > 1 ? usable.length - 1 : 1;

  const points = usable.map((row, index) => {
    const x = paddingX + (index / span) * (width - paddingX * 2);
    const ratio = maxValue === 0 ? 0 : Number(row.total_minutes) / maxValue;
    const y = ratio * (height - paddingY * 2);
    return { x, y, row };
  });

  const rolling = usable.map((row, index) => {
    const start = Math.max(0, index - 6);
    const window = usable.slice(start, index + 1);
    const windowValues = window.map((entry) => Number(entry.total_minutes));
    const average = windowValues.length
      ? windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length
      : null;
    return average === null
      ? null
      : {
          x: paddingX + (index / span) * (width - paddingX * 2),
          y: (average / (maxValue || 1)) * (height - paddingY * 2),
          row,
          average,
        };
  });

  const areaPath = buildAreaPath(points, width, height, paddingY);
  const linePath = buildLinePath(
    rolling.filter((point): point is NonNullable<typeof point> => Boolean(point)),
    height,
    paddingY,
  );

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
        <defs>
          <linearGradient id="engagement-minutes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.1" />
          </linearGradient>
          <filter id="rolling-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0f766e" floodOpacity="0.25" />
          </filter>
        </defs>
        <rect
          x={24}
          y={28}
          width={width - 48}
          height={height - 64}
          fill="#f1f5f9"
          rx={20}
          ry={20}
        />
        <path d={areaPath} fill="url(#engagement-minutes)" stroke="#0284c7" strokeWidth={2} strokeLinejoin="round" />
        <path
          d={linePath}
          fill="none"
          stroke="#0f766e"
          strokeWidth={4}
          strokeLinecap="round"
          filter="url(#rolling-shadow)"
          opacity={0.85}
        />
        {points.map((entry, index) => (
          <circle
            key={entry.row.activity_date}
            cx={entry.x}
            cy={height - paddingY - entry.y}
            r={3.2}
            fill="#0284c7"
          >
            <title>
              {`${fullDateFormatter.format(new Date(entry.row.activity_date))}: ${formatInteger(entry.row.total_minutes)} minutos`}
              {rolling[index]
                ? `\nPromedio 7d: ${formatInteger(Math.round(rolling[index]!.average ?? 0))} minutos`
                : ""}
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-brand-ink-muted">
        <span>{dateFormatter.format(new Date(usable[0].activity_date))}</span>
        <span>{dateFormatter.format(new Date(usable[usable.length - 1].activity_date))}</span>
      </div>
    </div>
  );
}

function ShortSessionTrend({ rows }: { rows: ShortSessionRow[] }) {
  const usable = rows.filter((row) => row.short_rate_pct !== null);
  if (!usable.length) return <EmptyState />;

  const values = usable.map((row) => Number(row.short_rate_pct ?? 0));
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const width = 360;
  const height = 240;
  const paddingX = 32;
  const paddingY = 36;
  const span = usable.length > 1 ? usable.length - 1 : 1;

  const points = usable.map((row, index) => {
    const x = paddingX + (index / span) * (width - paddingX * 2);
    const range = maxValue - minValue || 1;
    const ratio = (Number(row.short_rate_pct ?? 0) - minValue) / range;
    const y = ratio * (height - paddingY * 2);
    return { x, y, row };
  });

  const linePath = buildLinePath(points, height, paddingY);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
        <rect
          x={24}
          y={28}
          width={width - 48}
          height={height - 64}
          fill="#f8fafc"
          rx={18}
          ry={18}
        />
        <path d={linePath} fill="none" stroke="#fb923c" strokeWidth={4} strokeLinecap="round" />
        {points.map((entry) => (
          <circle
            key={entry.row.activity_date}
            cx={entry.x}
            cy={height - paddingY - entry.y}
            r={4}
            fill="#f97316"
          >
            <title>
              {`${fullDateFormatter.format(new Date(entry.row.activity_date))}: ${formatPercent(entry.row.short_rate_pct)}`}
              {`\nSesiones cortas: ${formatInteger(entry.row.short_sessions)} / ${formatInteger(entry.row.total_sessions)}`}
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-brand-ink-muted">
        <span>{dateFormatter.format(new Date(usable[0].activity_date))}</span>
        <span>{dateFormatter.format(new Date(usable[usable.length - 1].activity_date))}</span>
      </div>
    </div>
  );
}

const SEGMENT_COLORS: Record<"green" | "amber" | "red", string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
};

function SegmentsSummary({ segments }: { segments: SegmentRow[] }) {
  const ordered = ["green", "amber", "red"].map(
    (band) => segments.find((segment) => segment.band === band) ?? { band, count: 0 },
  ) as Array<SegmentRow & { band: "green" | "amber" | "red" }>;

  const total = ordered.reduce((sum, segment) => sum + (segment.count ?? 0), 0);
  if (!total) return <EmptyState />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-16 overflow-hidden rounded-2xl border border-brand-ink/10">
        {ordered.map((segment) => {
          const count = segment.count ?? 0;
          const percentage = total === 0 ? 0 : (count / total) * 100;
          const isLink = segment.band === "amber" || segment.band === "red";
          const content = (
            <span
              className={`${SEGMENT_COLORS[segment.band]} flex h-full flex-1 items-center justify-center text-sm font-semibold text-white transition hover:opacity-90`}
              style={{ width: `${Math.max(percentage, 4)}%` }}
              title={`${segment.band.toUpperCase()}: ${formatInteger(count)} (${formatPercent(percentage / 100)})`}
            >
              {formatPercent(percentage / 100)}
            </span>
          );
          return isLink ? (
            <Link
              key={segment.band}
              href={`/panel-gerencial/risk?band=${segment.band}`}
              className="flex-1"
            >
              {content}
            </Link>
          ) : (
            <div key={segment.band} className="flex-1">
              {content}
            </div>
          );
        })}
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {ordered.map((segment) => (
          <div
            key={segment.band}
            className="flex items-center gap-3 rounded-2xl border border-brand-ink/10 bg-white/90 px-4 py-3"
          >
            <span className={`h-2 w-8 rounded-full ${SEGMENT_COLORS[segment.band]}`} aria-hidden="true" />
            <div className="flex flex-col">
              <dt className="text-xs font-semibold uppercase text-brand-ink-muted">
                {segment.band === "green" ? "Verde" : segment.band === "amber" ? "Ámbar" : "Rojo"}
              </dt>
              <dd className="text-sm font-medium text-brand-deep">
                {formatInteger(segment.count)} ({formatPercent((segment.count ?? 0) / (total || 1))})
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SegmentsByLevel({ segments }: { segments: SegmentByLevelRow[] }) {
  if (!segments.length) return <EmptyState />;
  const grouped = segments.reduce<Record<string, SegmentByLevelRow[]>>((acc, row) => {
    const level = row.level_code;
    if (!acc[level]) acc[level] = [];
    acc[level].push(row);
    return acc;
  }, {});

  const levels = Object.keys(grouped).sort();

  return (
    <div className="flex flex-col gap-3">
      {levels.map((level) => {
        const rows = grouped[level];
        const total = rows.reduce((sum, row) => sum + (row.count ?? 0), 0);
        return (
          <div key={level} className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm font-semibold text-brand-deep">
              <span>{level}</span>
              <span className="text-xs text-brand-ink-muted">{formatInteger(total)} alumnos</span>
            </div>
            <div className="flex overflow-hidden rounded-xl border border-brand-ink/10">
              {["green", "amber", "red"].map((band) => {
                const row = rows.find((entry) => entry.band === band);
                const count = row?.count ?? 0;
                const percentage = total === 0 ? 0 : (count / total) * 100;
                const isLink = band === "amber" || band === "red";
                const content = (
                  <span
                    className={`${SEGMENT_COLORS[band as "green" | "amber" | "red"]} flex h-10 items-center justify-center text-xs font-semibold text-white`}
                    style={{ width: `${Math.max(percentage, 4)}%` }}
                    title={`${level} · ${band.toUpperCase()}: ${formatInteger(count)} (${formatPercent(percentage / 100)})`}
                  >
                    {percentage >= 8 ? formatPercent(percentage / 100) : null}
                  </span>
                );
                const href = `/panel-gerencial/risk?band=${band}&level=${level}`;
                return isLink ? (
                  <Link key={band} href={href} className="flex-1">
                    {content}
                  </Link>
                ) : (
                  <div key={band} className="flex-1">
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EngagementSnapshotChips({ snapshot }: { snapshot: EngagementSnapshot }) {
  const chips = [
    { label: "Mediana", value: snapshot.median_active_days_per_week },
    { label: "P25", value: snapshot.p25_active_days_per_week },
    { label: "P75", value: snapshot.p75_active_days_per_week },
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {chips.map((chip) => (
        <div
          key={chip.label}
          className="flex min-w-[160px] flex-1 flex-col gap-1 rounded-2xl border border-brand-ink/10 bg-slate-50 px-4 py-3 text-brand-deep"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">{chip.label}</span>
          <span className="text-2xl font-bold">
            {chip.value === null || chip.value === undefined ? "--" : formatDecimal(chip.value)}
          </span>
          <span className="text-xs text-brand-ink-muted">días activos / semana</span>
        </div>
      ))}
    </div>
  );
}
