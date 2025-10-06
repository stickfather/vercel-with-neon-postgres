import type { ReactNode } from "react";
import ErrorState from "../../ErrorState";
import {
  examsModuleAvailable,
  latestExamKpis,
  passTrend,
  type LatestExamKpis as LatestExamKpisRow,
  type PassTrendRow,
} from "../../data/exams.read";
import { formatPercentDisplay, isExamDataEmpty, normalizePercent } from "./helpers";

const decimalFormatter = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });
const integerFormatter = new Intl.NumberFormat("es-EC");
const monthFormatter = new Intl.DateTimeFormat("es-EC", { month: "short", year: "numeric" });
const tooltipFormatter = new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" });

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-brand-ink/20 bg-white/80 px-4 py-10 text-center text-sm text-brand-ink-muted">
      {message}
    </p>
  );
}

function ChartContainer({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
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

type ExamsPanelProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function ExamsPanel(_props: ExamsPanelProps) {
  try {
    const [available, trendRows, latest] = (await Promise.all([
      examsModuleAvailable(),
      passTrend(),
      latestExamKpis(),
    ])) as [boolean, PassTrendRow[], LatestExamKpisRow | null];

    if (!available) {
      return (
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-brand-deep">Exámenes &amp; preparación</h2>
            <p className="text-sm text-brand-ink-muted">Resultados de exámenes y tendencia de aprobación.</p>
          </header>
          <EmptyState message="Módulo de exámenes no habilitado" />
          <p className="text-center text-sm text-brand-ink-muted">
            Cuando se active, verás la tendencia de aprobación y KPIs de exámenes aquí.
          </p>
        </div>
      );
    }

    const sanitizedTrend = trendRows.filter((row) => row && row.month);
    const hasLatest = Boolean(latest);
    const showEmptyPanel = isExamDataEmpty(available, sanitizedTrend.length, hasLatest);

    if (showEmptyPanel) {
      return (
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-brand-deep">Exámenes &amp; preparación</h2>
            <p className="text-sm text-brand-ink-muted">Resultados de exámenes y tendencia de aprobación.</p>
          </header>
          <EmptyState message="Sin registros de exámenes." />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-brand-deep">Exámenes &amp; preparación</h2>
          <p className="text-sm text-brand-ink-muted">Resultados de exámenes y tendencia de aprobación.</p>
        </header>

        {hasLatest ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard title="Tasa de aprobación" value={formatPercentDisplay(latest?.pass_rate_pct)} />
            <KpiCard
              title="Nota promedio"
              value={
                latest?.avg_score !== null && latest?.avg_score !== undefined
                  ? decimalFormatter.format(latest.avg_score)
                  : "--"
              }
            />
            <KpiCard
              title="Muestras"
              value={
                latest?.sample_size !== null && latest?.sample_size !== undefined
                  ? integerFormatter.format(latest.sample_size)
                  : "--"
              }
            />
          </section>
        ) : null}

        <ChartContainer title="Tendencia de aprobación" description="Resultado mensual de la tasa de aprobación">
          {sanitizedTrend.length ? <PassTrendChart rows={sanitizedTrend} /> : <EmptyState message="Sin registros de exámenes." />}
        </ChartContainer>
      </div>
    );
  } catch (error) {
    console.error("Error al cargar exámenes y preparación", error);
    return <ErrorState retryHref="/panel-gerencial/exams" />;
  }
}

type KpiCardProps = {
  title: string;
  value: string;
};

function KpiCard({ title, value }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-3xl border border-brand-ink/10 bg-white/95 p-5 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-ink-muted">{title}</span>
      <span className="text-2xl font-bold text-brand-deep">{value}</span>
    </div>
  );
}

type PassTrendChartProps = {
  rows: PassTrendRow[];
};

function PassTrendChart({ rows }: PassTrendChartProps) {
  const parsed = rows
    .filter((row) => row.pass_rate !== null && row.pass_rate !== undefined)
    .map((row) => ({
      date: new Date(row.month),
      value: normalizePercent(row.pass_rate) ?? 0,
      original: row,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (!parsed.length) {
    return <EmptyState message="Sin registros de exámenes." />;
  }

  const width = 720;
  const height = 280;
  const paddingX = 48;
  const paddingY = 36;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const minDate = parsed[0].date.getTime();
  const maxDate = parsed[parsed.length - 1].date.getTime();
  const dateRange = Math.max(maxDate - minDate, 1);

  const maxValue = Math.max(...parsed.map((point) => point.value), 0.1);

  const points = parsed.map((point) => {
    const x =
      paddingX +
      (dateRange === 0
        ? chartWidth / 2
        : ((point.date.getTime() - minDate) / dateRange) * chartWidth);
    const y = paddingY + chartHeight - (point.value / maxValue) * chartHeight;
    return { ...point, x, y };
  });

  const path = points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    })
    .join(" ");

  const axisY = paddingY + chartHeight;

  return (
    <figure role="img" aria-label="Tasa de aprobación mensual" className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        <line x1={paddingX} y1={axisY} x2={width - paddingX} y2={axisY} stroke="rgba(15,23,42,0.2)" strokeWidth={1} />
        <path d={path} fill="none" stroke="#0f766e" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={`${point.original.month}-${index}`}>
            <circle cx={point.x} cy={point.y} r={5} fill="#0f766e" />
            <title>{`${tooltipFormatter.format(point.date)}\n${formatPercentDisplay(point.original.pass_rate)}`}</title>
          </g>
        ))}
        {points.map((point, index) => (
          <text
            key={`label-${point.original.month}-${index}`}
            x={point.x}
            y={axisY + 16}
            textAnchor="middle"
            className="fill-brand-ink-muted text-[10px]"
          >
            {monthFormatter.format(point.date)}
          </text>
        ))}
      </svg>
      <figcaption className="text-xs text-brand-ink-muted">Porcentaje mensual de estudiantes que aprobaron exámenes.</figcaption>
    </figure>
  );
}
