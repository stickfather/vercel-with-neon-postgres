import type { ReactNode } from "react";
import ErrorState from "../../ErrorState";
import { FullPanelSkeleton } from "../../Skeleton";
import { getProgressData } from "../../data/progress.read";

const numberFormatter = new Intl.NumberFormat("es-EC");
const percentFormatter = new Intl.NumberFormat("es-EC", {
  style: "percent",
  maximumFractionDigits: 1,
});
const decimalFormatter = new Intl.NumberFormat("es-EC", {
  maximumFractionDigits: 1,
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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function EmptyState() {
  return (
    <p className="rounded-2xl border border-dashed border-brand-ink/20 bg-white/80 px-4 py-10 text-center text-sm text-brand-ink-muted">
      Sin datos disponibles.
    </p>
  );
}

type ProgressProps = {
  selectedLevel?: string | null;
};

export default async function ProgressPanel({ selectedLevel }: ProgressProps) {
  try {
    const data = await getProgressData();

    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-brand-deep">Progreso &amp; aprendizaje</h2>
          <p className="text-sm text-brand-ink-muted">Trayectoria de LEI, pronósticos y finalizaciones.</p>
        </header>

        <HistogramSection
          distribution={data.leiDistribution}
          quartiles={data.leiQuartiles}
        />
        <HeatmapSection
          rows={data.stallHeatmap}
          selectedLevel={selectedLevel}
        />
        <ForecastSection
          rows={data.forecastByLevel}
          selectedLevel={selectedLevel}
        />
        <CompletionSection
          rows={data.levelCompletion}
          selectedLevel={selectedLevel}
        />
        <TtcTableSection
          rows={data.levelTtcMedian}
          selectedLevel={selectedLevel}
        />
      </div>
    );
  } catch (error) {
    console.error("Error al cargar progreso y aprendizaje", error);
    return <ErrorState retryHref="/panel-gerencial/progress" />;
  }
}

function HistogramSection({
  distribution,
  quartiles,
}: {
  distribution: Array<{ lei_30d: number | null }>;
  quartiles: Array<{ level_code: string; p25: number | null; p50: number | null; p75: number | null }>;
}) {
  const values = distribution.filter((row) => row.lei_30d !== null).map((row) => Number(row.lei_30d));
  if (!values.length) {
    return (
      <ChartContainer title="LEI (lecciones/hora)" description="Distribución de los últimos 30 días">
        <EmptyState />
      </ChartContainer>
    );
  }

  const binCount = 12;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const binSize = range / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => {
    const start = minValue + index * binSize;
    const end = index === binCount - 1 ? maxValue : start + binSize;
    return {
      start,
      end,
      count: 0,
    };
  });

  values.forEach((value) => {
    const index = Math.min(Math.floor((value - minValue) / binSize), binCount - 1);
    bins[index].count += 1;
  });

  const maxCount = Math.max(...bins.map((bin) => bin.count), 0);
  const quartilesAll = quartiles.find((row) => row.level_code === "ALL");

  return (
    <ChartContainer
      title="LEI (lecciones/hora)"
      description="Histograma con percentiles de referencia"
    >
      <div className="relative flex flex-col gap-4">
        <div className="relative h-64 w-full rounded-2xl border border-brand-ink/10 bg-slate-50 p-4">
          <div className="flex h-full items-end gap-2">
            {bins.map((bin, index) => {
              const heightPercent = maxCount === 0 ? 0 : (bin.count / maxCount) * 100;
              const labelStart = decimalFormatter.format(bin.start);
              const labelEnd = decimalFormatter.format(bin.end);
              return (
                <div key={index} className="flex-1">
                  <div
                    className="relative flex h-full items-end justify-center rounded-t-xl bg-brand-deep/15"
                    title={`Rango: ${labelStart} - ${labelEnd} | Conteo: ${bin.count}`}
                  >
                    <span
                      className="block w-full rounded-t-xl bg-brand-deep"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 text-center text-[10px] text-brand-ink-muted">
                    {labelStart}
                  </div>
                </div>
              );
            })}
          </div>
          {quartilesAll && maxValue !== minValue ? (
            ["p25", "p50", "p75"].map((key) => {
              const value = quartilesAll[key as "p25" | "p50" | "p75"];
              if (value === null || value === undefined) return null;
              const ratio = Math.min(
                Math.max((value - minValue) / (maxValue - minValue), 0),
                1,
              );
              return (
                <div
                  key={key}
                  className="absolute inset-y-4 w-[2px] bg-brand-orange/80"
                  style={{ left: `${ratio * 100}%` }}
                  title={`${key.toUpperCase()}: ${decimalFormatter.format(value)} LEI`}
                />
              );
            })
          ) : null}
        </div>
        <p className="text-xs text-brand-ink-muted">LEI = lecciones/hora (30 días)</p>
      </div>
    </ChartContainer>
  );
}

function HeatmapSection({
  rows,
  selectedLevel,
}: {
  rows: Array<{
    level_code: string;
    lesson_seq: number;
    avg_repeats_per_student: number | null;
    total_visits: number | null;
    unique_students: number | null;
  }>;
  selectedLevel?: string | null;
}) {
  if (!rows.length) {
    return (
      <ChartContainer
        title="Estancamiento (nivel × lección)"
        description="Repeticiones promedio por estudiante"
      >
        <EmptyState />
      </ChartContainer>
    );
  }

  const levels = Array.from(new Set(rows.map((row) => row.level_code))).sort();
  const lessons = Array.from(new Set(rows.map((row) => row.lesson_seq))).sort((a, b) => a - b);
  const maxValue = Math.max(...rows.map((row) => row.avg_repeats_per_student ?? 0), 0);

  return (
    <ChartContainer
      title="Estancamiento (nivel × lección)"
      description="Color más intenso indica más repeticiones"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white/95 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                Nivel
              </th>
              {lessons.map((lesson) => (
                <th key={lesson} className="px-3 py-2 text-xs font-semibold text-brand-ink-muted">
                  {lesson}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map((level) => {
              const isSelected = selectedLevel && level === selectedLevel;
              return (
                <tr key={level} className={cx(isSelected && "bg-brand-teal-soft/40") }>
                  <th className="sticky left-0 z-10 bg-white/95 px-3 py-2 text-left text-sm font-semibold text-brand-deep">
                    {level}
                  </th>
                  {lessons.map((lesson) => {
                    const cell = rows.find(
                      (row) => row.level_code === level && row.lesson_seq === lesson,
                    );
                    const value = cell?.avg_repeats_per_student ?? 0;
                    const ratio = maxValue === 0 ? 0 : value / maxValue;
                    const background = `rgba(14, 165, 233, ${0.15 + ratio * 0.65})`;
                    return (
                      <td
                        key={lesson}
                        className="px-3 py-2 text-center text-xs font-medium text-brand-deep"
                        style={{ backgroundColor: background }}
                        title={`Nivel ${level}, Lección ${lesson}\nRepeticiones promedio: ${formatDecimal(
                          cell?.avg_repeats_per_student ?? 0,
                        )}\nVisitas: ${formatInteger(cell?.total_visits ?? 0)}\nEstudiantes: ${formatInteger(
                          cell?.unique_students ?? 0,
                        )}`}
                      >
                        {formatDecimal(cell?.avg_repeats_per_student)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartContainer>
  );
}

function ForecastSection({
  rows,
  selectedLevel,
}: {
  rows: Array<{
    level_code: string;
    n_students_with_forecast: number | null;
    p25_months: number | null;
    median_months: number | null;
    p75_months: number | null;
  }>;
  selectedLevel?: string | null;
}) {
  if (!rows.length) {
    return (
      <ChartContainer
        title="Pronóstico de meses por nivel"
        description="Distribución P25 - P75"
      >
        <EmptyState />
      </ChartContainer>
    );
  }

  const maxValue = Math.max(...rows.map((row) => row.p75_months ?? 0), 0);

  return (
    <ChartContainer
      title="Pronóstico de meses por nivel"
      description="Caja representa el rango intercuartílico"
    >
      <div className="flex flex-col gap-4">
        {rows.map((row) => {
          const rangeStart = row.p25_months ?? row.median_months ?? 0;
          const rangeEnd = row.p75_months ?? row.median_months ?? rangeStart;
          const rangeSize = Math.max(rangeEnd - rangeStart, 0.1);
          const left = maxValue === 0 ? 0 : (rangeStart / maxValue) * 100;
          const width = maxValue === 0 ? 0 : (rangeSize / maxValue) * 100;
          const medianPosition = row.median_months ?? rangeStart;
          const medianLeft = maxValue === 0 ? 0 : (medianPosition / maxValue) * 100;
          const isSelected = selectedLevel && row.level_code === selectedLevel;

          return (
            <div
              key={row.level_code}
              className={cx(
                "flex items-center gap-4 rounded-2xl border border-brand-ink/10 bg-white/90 p-4",
                isSelected && "border-brand-deep bg-brand-teal-soft/50",
              )}
            >
              <div className="w-16 text-sm font-semibold text-brand-deep">{row.level_code}</div>
              <div className="relative h-10 flex-1 rounded-full bg-slate-100">
                <div
                  className="absolute top-1/2 h-6 -translate-y-1/2 rounded-full bg-brand-teal/60"
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`p25: ${formatDecimal(row.p25_months)} meses | p75: ${formatDecimal(row.p75_months)} meses`}
                />
                <div
                  className="absolute top-1/2 h-8 w-[3px] -translate-y-1/2 bg-brand-deep"
                  style={{ left: `${medianLeft}%` }}
                  title={`Mediana: ${formatDecimal(row.median_months)} meses`}
                />
              </div>
              <div className="w-24 text-right text-xs text-brand-ink-muted">
                n = {formatInteger(row.n_students_with_forecast)}
              </div>
            </div>
          );
        })}
      </div>
    </ChartContainer>
  );
}

function CompletionSection({
  rows,
  selectedLevel,
}: {
  rows: Array<{
    level_code: string;
    completion_rate_90d_active_pct: number | null;
    completions_90d: number | null;
    students_active_90d: number | null;
  }>;
  selectedLevel?: string | null;
}) {
  if (!rows.length) {
    return (
      <ChartContainer
        title="Tasa de finalización (90 días)"
        description="Basado en estudiantes activos"
      >
        <EmptyState />
      </ChartContainer>
    );
  }

  const sorted = [...rows].sort((a, b) => a.level_code.localeCompare(b.level_code));
  const maxValue = Math.max(...sorted.map((row) => row.completion_rate_90d_active_pct ?? 0), 0);

  return (
    <ChartContainer
      title="Tasa de finalización (90 días)"
      description="Incluye denominador de estudiantes activos"
    >
      <div className="flex items-end gap-4">
        {sorted.map((row) => {
          const value = row.completion_rate_90d_active_pct ?? 0;
          const heightPercent = maxValue === 0 ? 0 : (value / maxValue) * 100;
          const isSelected = selectedLevel && row.level_code === selectedLevel;

          return (
            <div key={row.level_code} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={cx(
                  "relative flex h-56 w-full items-end rounded-2xl bg-brand-teal-soft/30 p-3",
                  isSelected && "ring-2 ring-brand-deep",
                )}
                title={`Nivel ${row.level_code}\nFinalizaciones: ${formatInteger(row.completions_90d)}\nEstudiantes activos: ${formatInteger(
                  row.students_active_90d,
                )}`}
              >
                <span
                  className="block w-full rounded-xl bg-brand-deep"
                  style={{ height: `${Math.max(heightPercent, 4)}%` }}
                >
                  <span className="sr-only">{formatPercent(value)}</span>
                </span>
                <span className="absolute top-3 right-3 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-brand-deep shadow">
                  {formatPercent(value)}
                </span>
              </div>
              <span className="text-sm font-semibold text-brand-deep">{row.level_code}</span>
            </div>
          );
        })}
      </div>
    </ChartContainer>
  );
}

function TtcTableSection({
  rows,
  selectedLevel,
}: {
  rows: Array<{
    level_code: string;
    n_completions: number | null;
    median_months: number | null;
    p25_months: number | null;
    p75_months: number | null;
  }>;
  selectedLevel?: string | null;
}) {
  if (!rows.length) {
    return (
      <ChartContainer
        title="Tiempo real a completar (mediana)"
        description="Estadísticas por nivel"
      >
        <EmptyState />
      </ChartContainer>
    );
  }

  const sorted = [...rows].sort((a, b) => a.level_code.localeCompare(b.level_code));

  return (
    <ChartContainer
      title="Tiempo real a completar (mediana)"
      description="En meses, últimos 90 días"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 rounded-3xl">
          <thead>
            <tr className="bg-brand-teal-soft/40">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                Nivel
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                n
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                p25 (meses)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                Mediana (meses)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                p75 (meses)
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const isSelected = selectedLevel && row.level_code === selectedLevel;
              return (
                <tr
                  key={row.level_code}
                  className={cx("border-b border-brand-ink/10", isSelected && "bg-brand-teal-soft/60")}
                >
                  <td className="px-4 py-3 text-sm font-semibold text-brand-deep">{row.level_code}</td>
                  <td className="px-4 py-3 text-sm text-brand-ink">{formatInteger(row.n_completions)}</td>
                  <td className="px-4 py-3 text-sm text-brand-ink">{formatDecimal(row.p25_months)}</td>
                  <td className="px-4 py-3 text-sm text-brand-ink">{formatDecimal(row.median_months)}</td>
                  <td className="px-4 py-3 text-sm text-brand-ink">{formatDecimal(row.p75_months)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartContainer>
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

export function ProgressSkeleton() {
  return <FullPanelSkeleton chartCount={5} />;
}
