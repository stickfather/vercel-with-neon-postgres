import type { ReactNode } from "react";
import Link from "next/link";
import ErrorState from "../../ErrorState";
import { getOverviewData } from "../../data/overview.read";

const numberFormatter = new Intl.NumberFormat("es-EC");
const compactFormatter = new Intl.NumberFormat("es-EC", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const percentFormatter = new Intl.NumberFormat("es-EC", {
  style: "percent",
  maximumFractionDigits: 1,
});
const dateFormatter = new Intl.DateTimeFormat("es-EC", {
  month: "short",
  day: "numeric",
});

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  const normalized = value > 1 ? value / 100 : value;
  return percentFormatter.format(normalized);
}

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return Number(value).toFixed(1);
}

function formatInteger(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return numberFormatter.format(value);
}

function formatCompact(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return compactFormatter.format(value);
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
        {description ? (
          <p className="text-sm text-brand-ink-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyState() {
  return (
    <p className="rounded-2xl border border-dashed border-brand-ink/20 bg-white/80 px-4 py-10 text-center text-sm text-brand-ink-muted">
      Sin datos disponibles.
    </p>
  );
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
  return `${topPath} L${last.x.toFixed(2)},${(height - padding).toFixed(2)} L${first.x.toFixed(2)},${(height - padding).toFixed(
    2,
  )} Z`;
}

export default async function OverviewPanel() {
  try {
    const data = await getOverviewData();

    const cards = data.cards;
    const onpaceTrend = data.onpaceTrend;
    const onpaceByLevel = data.onpaceByLevel;
    const minutesByDay = data.minutesByDay;

    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-brand-deep">Resumen general</h2>
          <p className="text-sm text-brand-ink-muted">Indicadores clave de ritmo y actividad.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards ? (
            [
              { label: "En ritmo (%)", value: formatPercent(cards.onpace_pct) },
              { label: "LEI mediana", value: formatDecimal(cards.median_lei) },
              { label: "Minutos (30 días)", value: formatCompact(cards.total_minutes_30d) },
              { label: "Inactivos ≥14d (%)", value: formatPercent(cards.pct_inactive_ge_14d) },
              { label: "Activos (30d)", value: formatInteger(cards.active_students_30d) },
              { label: "DAU", value: formatInteger(cards.dau) },
              { label: "WAU", value: formatInteger(cards.wau) },
              { label: "DAU÷WAU", value: formatPercent(cards.dau_over_wau) },
              { label: "Minutos diarios (prom.)", value: formatDecimal(cards.avg_daily_minutes) },
            ].map((card, index) => (
              <article
                key={`${card.label}-${index}`}
                className="flex flex-col gap-1 rounded-3xl border border-brand-ink/5 bg-white/95 p-5 shadow-sm"
              >
                <h4 className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">{card.label}</h4>
                <p className="text-2xl font-bold text-brand-deep">{card.value}</p>
              </article>
            ))
          ) : (
            <div className="sm:col-span-2 xl:col-span-4">
              <EmptyState />
            </div>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <ChartContainer title="Tendencia En ritmo (%)" description="Histórico diario de estudiantes en ritmo">
            {onpaceTrend.length ? (
              <TrendChart data={onpaceTrend} />
            ) : (
              <EmptyState />
            )}
          </ChartContainer>

          <ChartContainer
            title="En ritmo por nivel"
            description="Comparativo de porcentaje en ritmo según el nivel actual"
          >
            {onpaceByLevel.length ? (
              <OnpaceByLevelChart rows={onpaceByLevel} />
            ) : (
              <EmptyState />
            )}
          </ChartContainer>

          <div className="xl:col-span-2">
            <ChartContainer
              title="Minutos por día"
              description="Tiempo total registrado en los últimos 90 días"
            >
              {minutesByDay.length ? (
                <MinutesByDayChart rows={minutesByDay} />
              ) : (
                <EmptyState />
              )}
            </ChartContainer>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error al cargar el resumen general", error);
    return <ErrorState retryHref="/panel-gerencial/overview" />;
  }
}

type TrendChartProps = {
  data: Array<{
    snapshot_date: string;
    onpace_pct: number | null;
    median_lei?: number | null;
  }>;
};

function TrendChart({ data }: TrendChartProps) {
  const usable = data.filter((point) => point.onpace_pct !== null);
  if (!usable.length) {
    return <EmptyState />;
  }

  const values = usable.map((point) => Number(point.onpace_pct));
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const domainPadding = Math.max((maxValue - minValue) * 0.1, 5);
  const maxY = maxValue + domainPadding;
  const minY = Math.max(0, minValue - domainPadding);

  const width = 680;
  const height = 260;
  const paddingX = 32;
  const paddingY = 32;
  const span = usable.length > 1 ? usable.length - 1 : 1;

  const points = usable.map((point, index) => {
    const x = paddingX + (index / span) * (width - paddingX * 2);
    const ratio = maxY === minY ? 0.5 : (Number(point.onpace_pct) - minY) / (maxY - minY);
    const y = ratio * (height - paddingY * 2);
    return { x, y, point };
  });

  const path = buildLinePath(points, height, paddingY);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
        <defs>
          <linearGradient id="onpace-line" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <rect
          x={24}
          y={24}
          width={width - 48}
          height={height - 64}
          fill="#f5fbfb"
          rx={18}
          ry={18}
        />
        <path d={path} fill="none" stroke="url(#onpace-line)" strokeWidth={4} strokeLinecap="round" />
        {points.map((entry) => (
          <g key={entry.point.snapshot_date}>
            <circle
              cx={entry.x}
              cy={height - paddingY - entry.y}
              r={5}
              fill="#0f766e"
              opacity={0.9}
            >
              <title>
                {`${entry.point.snapshot_date}: ${formatPercent(entry.point.onpace_pct)}`}
                {typeof entry.point.median_lei === "number"
                  ? `\nLEI mediana: ${formatDecimal(entry.point.median_lei)}`
                  : ""}
              </title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-brand-ink-muted">
        <span>{dateFormatter.format(new Date(usable[0].snapshot_date))}</span>
        <span>{dateFormatter.format(new Date(usable[usable.length - 1].snapshot_date))}</span>
      </div>
    </div>
  );
}

type OnpaceByLevelChartProps = {
  rows: Array<{
    level_code: string;
    onpace_pct: number | null;
  }>;
};

function OnpaceByLevelChart({ rows }: OnpaceByLevelChartProps) {
  const filtered = rows.filter((row) => row.level_code);
  if (!filtered.length) return <EmptyState />;

  const values = filtered.map((row) => (row.onpace_pct ?? 0) as number);
  const maxValue = Math.max(...values, 0);

  return (
    <div className="flex items-end gap-4">
      {filtered.map((row) => {
        const percent = row.onpace_pct ?? 0;
        const heightPercent = maxValue === 0 ? 0 : (percent / maxValue) * 100;
        return (
          <Link
            key={row.level_code}
            href={`/panel-gerencial/progress?level=${encodeURIComponent(row.level_code)}`}
            className="group flex flex-1 flex-col items-center gap-2"
          >
            <div className="relative flex h-56 w-full items-end rounded-2xl bg-brand-teal-soft/30 p-3">
              <span
                className="block w-full rounded-xl bg-brand-teal transition group-hover:bg-brand-deep"
                style={{ height: `${Math.max(heightPercent, 4)}%` }}
              >
                <span className="sr-only">{formatPercent(percent)}</span>
              </span>
              <span className="absolute top-3 right-3 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-brand-deep shadow">
                {formatPercent(percent)}
              </span>
            </div>
            <span className="text-sm font-semibold text-brand-deep">{row.level_code}</span>
          </Link>
        );
      })}
    </div>
  );
}

type MinutesByDayChartProps = {
  rows: Array<{
    activity_date: string;
    total_minutes: number | null;
  }>;
};

function MinutesByDayChart({ rows }: MinutesByDayChartProps) {
  const usable = rows.filter((row) => row.total_minutes !== null);
  if (!usable.length) return <EmptyState />;

  const values = usable.map((row) => Number(row.total_minutes));
  const maxValue = Math.max(...values, 0);
  const width = 680;
  const height = 260;
  const paddingX = 32;
  const paddingY = 32;
  const span = usable.length > 1 ? usable.length - 1 : 1;

  const points = usable.map((row, index) => {
    const x = paddingX + (index / span) * (width - paddingX * 2);
    const ratio = maxValue === 0 ? 0 : Number(row.total_minutes) / maxValue;
    const y = ratio * (height - paddingY * 2);
    return { x, y, row };
  });

  const path = buildAreaPath(points, width, height, paddingY);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
        <defs>
          <linearGradient id="minutes-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect
          x={24}
          y={24}
          width={width - 48}
          height={height - 64}
          fill="#f1f5f9"
          rx={18}
          ry={18}
        />
        <path d={path} fill="url(#minutes-area)" stroke="#0ea5e9" strokeWidth={2} strokeLinejoin="round" />
        {points.map((entry) => (
          <circle
            key={entry.row.activity_date}
            cx={entry.x}
            cy={height - paddingY - entry.y}
            r={3}
            fill="#0ea5e9"
          >
            <title>{`${entry.row.activity_date}: ${formatInteger(entry.row.total_minutes)} minutos`}</title>
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
