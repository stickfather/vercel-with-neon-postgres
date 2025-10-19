"use client";

import { type ReactNode, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type {
  LearnDashboardData,
  LearnFastLearnerRow,
  LearnFastestCompletionRow,
  LearnLessonsHeatmapRow,
  LearnLevelMoveMatrixRow,
  LearnLevelupsWeeklyRow,
  LearnLeiDistributionRow,
  LearnOutcomesWeeklyRow,
  LearnProgressBandRow,
  LearnSlowLearnerRow,
  LearnCohortProgressRow,
} from "@/types/management.learning";

const percentFormatter = new Intl.NumberFormat("es-EC", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("es-EC");

const monthsFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const LEVEL_OPTIONS = ["A1", "A2", "B1", "B2", "C1"];

const TREND_WINDOWS = [13, 26, 52] as const;

type TrendWindow = (typeof TREND_WINDOWS)[number];

type LearningDashboardProps = {
  data: LearnDashboardData;
  initialLevels: string[];
  initialTrendWindow: TrendWindow;
};

export function LearningDashboard({ data, initialLevels, initialTrendWindow }: LearningDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedLevels, setSelectedLevels] = useState<string[]>(initialLevels);
  const [trendWindow, setTrendWindow] = useState<TrendWindow>(initialTrendWindow);

  useEffect(() => {
    setSelectedLevels(initialLevels);
  }, [initialLevels]);

  useEffect(() => {
    setTrendWindow(initialTrendWindow);
  }, [initialTrendWindow]);

  const normalizedAvailableLevels = useMemo(() => {
    return data.availableLevels.length ? data.availableLevels : LEVEL_OPTIONS;
  }, [data.availableLevels]);

  function updateUrl(levels: string[], windowValue: TrendWindow) {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    if (levels.length) {
      params.set("levels", levels.join(","));
    } else {
      params.delete("levels");
    }
    if (windowValue) {
      params.set("window", String(windowValue));
    }
    startTransition(() => {
      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      router.replace(href, { scroll: false });
    });
  }

  function toggleLevel(level: string) {
    setSelectedLevels((prev) => {
      const exists = prev.includes(level);
      const next = exists ? prev.filter((item) => item !== level) : [...prev, level];
      updateUrl(next, trendWindow);
      return next;
    });
  }

  function clearLevels() {
    setSelectedLevels(() => {
      updateUrl([], trendWindow);
      return [];
    });
  }

  function selectTrendWindow(windowValue: TrendWindow) {
    setTrendWindow(windowValue);
    updateUrl(selectedLevels, windowValue);
  }

  const filterChips = selectedLevels.filter((level) => level.length);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_18px_46px_rgba(15,23,42,0.12)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Panel de gestión</span>
            <h1 className="text-3xl font-black text-slate-900 sm:text-[40px]">Aprendizaje (Learning)</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Indicadores clave del avance académico, resultados semanales y focos de fricción en las lecciones.
            </p>
          </div>
          <FiltersBar
            availableLevels={normalizedAvailableLevels}
            selectedLevels={selectedLevels}
            onToggleLevel={toggleLevel}
            onClearLevels={clearLevels}
            trendWindow={trendWindow}
            onSelectTrendWindow={selectTrendWindow}
            isUpdating={isPending}
            slowest={data.slowest}
            fastest={data.fastest}
            fastestCompletions={data.fastestCompletions}
          />
        </div>
        {filterChips.length ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="font-semibold uppercase tracking-widest text-slate-500">Filtro:</span>
            {filterChips.map((level) => (
              <span
                key={level}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700"
              >
                Nivel {level}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <section className="flex flex-col gap-6">
        <KpiTiles
          header={data.header}
          onpaceSplit={data.onpaceSplit}
          outcomesWeekly={data.outcomesWeekly}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ProgressBandsCard data={data.progressBands} />
          <CohortCurveCard data={data.cohortProgress} />
        </div>

        <LeiDistributionCard overall={data.leiOverall} byLevel={data.leiByLevel} />

        <OutcomesWeeklyCard data={data.outcomesWeekly} trendWindow={trendWindow} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <LevelUpsWeeklyCard data={data.levelupsWeekly} trendWindow={trendWindow} />
          <LevelMoveMatrixCard data={data.levelMoveMatrix} />
        </div>

        <LessonsHeatmapCard rows={data.lessonsHeatmap} levels={selectedLevels.length ? selectedLevels : data.availableLevels} />

        <LearnerTablesCard
          slowest={data.slowest}
          fastest={data.fastest}
          fastestCompletions={data.fastestCompletions}
        />
      </section>
    </div>
  );
}

type FiltersBarProps = {
  availableLevels: string[];
  selectedLevels: string[];
  onToggleLevel: (level: string) => void;
  onClearLevels: () => void;
  trendWindow: TrendWindow;
  onSelectTrendWindow: (window: TrendWindow) => void;
  isUpdating: boolean;
  slowest: LearnSlowLearnerRow[];
  fastest: LearnFastLearnerRow[];
  fastestCompletions: LearnFastestCompletionRow[];
};

function FiltersBar({
  availableLevels,
  selectedLevels,
  onToggleLevel,
  onClearLevels,
  trendWindow,
  onSelectTrendWindow,
  isUpdating,
  slowest,
  fastest,
  fastestCompletions,
}: FiltersBarProps) {
  return (
    <div className="flex flex-col items-stretch gap-3 sm:w-[320px]">
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Niveles</span>
          {selectedLevels.length ? (
            <button
              type="button"
              onClick={onClearLevels}
              className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 transition hover:text-slate-700"
            >
              Limpiar
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {availableLevels.map((level) => {
            const isSelected = selectedLevels.includes(level);
            return (
              <button
                key={level}
                type="button"
                onClick={() => onToggleLevel(level)}
                className={`${
                  isSelected
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700"
                } inline-flex min-w-[48px] items-center justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase transition`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ventana de tendencia</span>
        <div className="flex flex-wrap gap-2">
          {TREND_WINDOWS.map((option) => {
            const isActive = option === trendWindow;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onSelectTrendWindow(option)}
                className={`${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700"
                } inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase transition`}
              >
                {option} semanas
              </button>
            );
          })}
        </div>
      </div>

      <ExportButton
        slowest={slowest}
        fastest={fastest}
        fastestCompletions={fastestCompletions}
        disabled={isUpdating}
      />
    </div>
  );
}

type ExportButtonProps = {
  slowest: LearnSlowLearnerRow[];
  fastest: LearnFastLearnerRow[];
  fastestCompletions: LearnFastestCompletionRow[];
  disabled?: boolean;
};

function ExportButton({ slowest, fastest, fastestCompletions, disabled }: ExportButtonProps) {
  function handleExport() {
    const lines: string[] = [];

    function pushSection<T extends Record<string, unknown>>(title: string, rows: T[], columns: string[]) {
      lines.push(title);
      lines.push(columns.join(","));
      rows.forEach((row) => {
        const values = columns.map((column) => {
          const value = row[column as keyof T];
          if (value === null || value === undefined) return "";
          const stringValue = String(value).replace(/"/g, '""');
          if (stringValue.includes(",")) {
            return `"${stringValue}"`;
          }
          return stringValue;
        });
        lines.push(values.join(","));
      });
      lines.push("");
    }

    pushSection("Mas Lentos (30d)", slowest, [
      "full_name",
      "level",
      "hours_30d",
      "progress_delta_30d",
      "min_per_pct",
      "lei_30d_plan",
      "on_pace_plan",
      "last_seen_date",
    ]);

    pushSection("Mas Rapidos (30d)", fastest, [
      "full_name",
      "level",
      "hours_30d",
      "progress_delta_30d",
      "pct_per_hour",
      "lei_30d_plan",
      "on_pace_plan",
      "last_seen_date",
    ]);

    pushSection("Terminaciones mas Rapidas (90d)", fastestCompletions, [
      "full_name",
      "final_level",
      "months_to_complete",
      "started_at",
      "completed_at",
      "lei_30d_plan",
    ]);

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aprendizaje_tablas_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500/90 disabled:cursor-not-allowed disabled:opacity-70"
    >
      Exportar tablas (CSV)
    </button>
  );
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const normalized = value > 1 ? value / 100 : value;
  return percentFormatter.format(normalized);
}

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return decimalFormatter.format(value);
}

function formatInteger(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return integerFormatter.format(value);
}

function formatMonths(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${monthsFormatter.format(value)} meses`;
}

type KpiTilesProps = {
  header: LearnDashboardData["header"];
  onpaceSplit: LearnDashboardData["onpaceSplit"];
  outcomesWeekly: LearnOutcomesWeeklyRow[];
};

function KpiTiles({ header, onpaceSplit, outcomesWeekly }: KpiTilesProps) {
  const lastEight = useMemo(() => outcomesWeekly.slice(-8), [outcomesWeekly]);
  const gradSpark = lastEight.map((row) => row.graduados);
  const exitSpark = lastEight.map((row) => row.retiros);

  if (!header) {
    return (
      <Card title="Indicadores clave" description="Resumen de progreso y resultados recientes">
        <EmptyState />
      </Card>
    );
  }

  const tiles = [
    {
      key: "pct_on_pace",
      label: "% En Ritmo",
      value: formatPercent(header.pct_on_pace),
      helper: header.pct_on_pace,
    },
    {
      key: "avg_progress_pct",
      label: "Progreso Promedio",
      value: formatPercent(header.avg_progress_pct),
    },
    {
      key: "median_lei_30d",
      label: "LEI Mediana (30d)",
      value: header.median_lei_30d === null ? "—" : decimalFormatter.format(header.median_lei_30d),
    },
    {
      key: "median_months_to_finish",
      label: "Meses a Terminar (mediana)",
      value: header.median_months_to_finish === null ? "—" : monthsFormatter.format(header.median_months_to_finish),
    },
    {
      key: "graduated_30d",
      label: "Graduados (30d)",
      value: header.graduated_30d === null ? "—" : integerFormatter.format(header.graduated_30d),
      spark: gradSpark,
      sparkColor: "#047857",
    },
    {
      key: "early_exit_30d",
      label: "Salidas Anticipadas (30d)",
      value: header.early_exit_30d === null ? "—" : integerFormatter.format(header.early_exit_30d),
      spark: exitSpark,
      sparkColor: "#B91C1C",
    },
  ];

  const hasAnyValue = tiles.some((tile) => tile.value !== "—");

  if (!hasAnyValue) {
    return (
      <Card title="Indicadores clave" description="Resumen de progreso y resultados recientes">
        <EmptyState />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:col-span-3 xl:grid-cols-6">
        {tiles.map((tile, index) => (
          <div
            key={tile.key}
            className="relative flex flex-col justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-5 shadow-[0_16px_32px_rgba(15,23,42,0.08)]"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{tile.label}</span>
            <div className="flex items-end justify-between gap-3">
              <span className="text-2xl font-black text-slate-900">{tile.value}</span>
              {tile.spark && tile.spark.length ? (
                <Sparkline values={tile.spark} color={tile.sparkColor ?? "#0EA5E9"} />
              ) : null}
            </div>
            {index === 0 && onpaceSplit ? (
              <div className="absolute -right-6 bottom-4 hidden h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg sm:flex">
                <OnpaceDonut data={onpaceSplit} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

type CardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
};

function Card({ title, description, children, actions }: CardProps) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>
        {actions}
      </header>
      <div>{children}</div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-sm text-slate-500">
      Sin datos
    </div>
  );
}

type SparklineProps = {
  values: number[];
  color?: string;
};

function Sparkline({ values, color = "#0EA5E9" }: SparklineProps) {
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" className="h-12 w-20" aria-hidden="true">
      <polyline points={`0,100 ${points} 100,100`} fill={`${color}20`} stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

type OnpaceDonutProps = {
  data: { on_pace: number; off_pace: number };
};

function OnpaceDonut({ data }: OnpaceDonutProps) {
  const total = data.on_pace + data.off_pace;
  const onRatio = total > 0 ? data.on_pace / total : 0;
  const offRatio = total > 0 ? data.off_pace / total : 0;
  const circumference = 2 * Math.PI * 42;
  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-20 w-20">
        <circle cx="50" cy="50" r="42" stroke="#E2E8F0" strokeWidth="12" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="#10B981"
          strokeWidth="12"
          strokeDasharray={`${circumference * onRatio} ${circumference}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="#F87171"
          strokeWidth="12"
          strokeDasharray={`${circumference * offRatio} ${circumference}`}
          strokeDashoffset={circumference * (0.25 - onRatio)}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center">
        <span className="text-[10px] font-semibold uppercase text-slate-500">En ritmo</span>
        <span className="text-lg font-black text-emerald-600">{percentFormatter.format(onRatio)}</span>
      </div>
    </div>
  );
}

type ProgressBandsCardProps = {
  data: LearnProgressBandRow[];
};

function ProgressBandsCard({ data }: ProgressBandsCardProps) {
  if (!data.length) {
    return (
      <Card title="Progreso del Plan por Nivel" description="Distribución de bandas de avance">
        <EmptyState />
      </Card>
    );
  }

  return (
    <Card title="Progreso del Plan por Nivel" description="Distribución porcentual por bandas de avance">
      <div className="flex flex-col gap-4">
        {data.map((row) => {
          const total = row.band_0_33 + row.band_34_66 + row.band_67_99 + row.band_100;
          return (
            <div key={row.level} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Nivel {row.level}</span>
                <span>{formatInteger(total)}</span>
              </div>
              <div className="flex overflow-hidden rounded-full border border-slate-200 text-[11px] text-white">
                <StackedSegment
                  label="0–33%"
                  value={row.band_0_33}
                  total={total}
                  color="bg-rose-500/90"
                />
                <StackedSegment
                  label="34–66%"
                  value={row.band_34_66}
                  total={total}
                  color="bg-amber-500/90"
                />
                <StackedSegment
                  label="67–99%"
                  value={row.band_67_99}
                  total={total}
                  color="bg-sky-500/90"
                />
                <StackedSegment
                  label="100%"
                  value={row.band_100}
                  total={total}
                  color="bg-emerald-500/90"
                />
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
          <LegendChip color="bg-rose-500" label="0–33%" />
          <LegendChip color="bg-amber-500" label="34–66%" />
          <LegendChip color="bg-sky-500" label="67–99%" />
          <LegendChip color="bg-emerald-500" label="100%" />
        </div>
      </div>
    </Card>
  );
}

type StackedSegmentProps = {
  label: string;
  value: number;
  total: number;
  color: string;
};

function StackedSegment({ label, value, total, color }: StackedSegmentProps) {
  const ratio = total > 0 ? value / total : 0;
  const widthPercent = Math.max(ratio * 100, 0);
  if (widthPercent <= 0) {
    return null;
  }
  return (
    <div
      className={`${color} flex items-center justify-center px-2 py-2`}
      style={{ width: `${widthPercent}%` }}
      title={`${label}: ${formatInteger(value)} (${percentFormatter.format(ratio)})`}
    >
      <span>{percentFormatter.format(ratio)}</span>
    </div>
  );
}

type LegendChipProps = {
  color: string;
  label: string;
};

function LegendChip({ color, label }: LegendChipProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span>{label}</span>
    </span>
  );
}

type CohortCurveCardProps = {
  data: LearnCohortProgressRow[];
};

function CohortCurveCard({ data }: CohortCurveCardProps) {
  const [selectedCohorts, setSelectedCohorts] = useState<string[]>(() => {
    const unique = Array.from(new Set(data.map((row) => row.cohort_month)));
    return unique
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, 3);
  });

  useEffect(() => {
    const unique = Array.from(new Set(data.map((row) => row.cohort_month)));
    setSelectedCohorts((prev) => {
      if (prev.length) {
        return prev.filter((cohort) => unique.includes(cohort)).slice(0, 5);
      }
      return unique
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .slice(0, 3);
    });
  }, [data]);

  if (!data.length) {
    return (
      <Card title="Curva de Cohortes (Progreso Promedio)" description="Meses desde inicio vs avance">
        <EmptyState />
      </Card>
    );
  }

  const cohorts = Array.from(new Set(data.map((row) => row.cohort_month))).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  const maxMonth = Math.max(...data.map((row) => row.months_since_start), 12);

  const palette = ["#1D4ED8", "#047857", "#9333EA", "#F59E0B", "#DC2626"];

  function toggleCohort(value: string) {
    setSelectedCohorts((prev) => {
      const exists = prev.includes(value);
      if (exists) {
        return prev.filter((item) => item !== value);
      }
      if (prev.length >= 5) {
        const [, ...rest] = [...prev, value];
        return rest;
      }
      return [...prev, value];
    });
  }

  const selectedData = selectedCohorts.map((cohort) => ({
    cohort,
    rows: data.filter((row) => row.cohort_month === cohort),
  }));

  return (
    <Card title="Curva de Cohortes (Progreso Promedio)" description="Seguimiento de progreso acumulado">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {cohorts.map((cohort) => {
            const isSelected = selectedCohorts.includes(cohort);
            return (
              <button
                key={cohort}
                type="button"
                onClick={() => toggleCohort(cohort)}
                className={`${
                  isSelected
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                } inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase transition`}
              >
                {cohort}
              </button>
            );
          })}
        </div>
        <div className="relative h-72 w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <svg viewBox="0 0 1000 400" preserveAspectRatio="none" className="h-full w-full">
            <Axes />
            {selectedData.map((cohortData, index) => (
              <CohortLine
                key={cohortData.cohort}
                cohort={cohortData.cohort}
                rows={cohortData.rows}
                maxMonth={maxMonth}
                color={palette[index % palette.length]}
              />
            ))}
          </svg>
        </div>
      </div>
    </Card>
  );
}

type CohortLineProps = {
  cohort: string;
  rows: LearnCohortProgressRow[];
  maxMonth: number;
  color: string;
};

function CohortLine({ cohort, rows, maxMonth, color }: CohortLineProps) {
  const validRows = rows.filter((row) => row.avg_progress_pct !== null && row.avg_progress_pct !== undefined);
  if (!validRows.length) return null;
  const maxValue = Math.max(...validRows.map((row) => Number(row.avg_progress_pct ?? 0)), 100);
  const points = validRows
    .map((row) => {
      const x = (row.months_since_start / Math.max(maxMonth, 1)) * 1000;
      const value = Number(row.avg_progress_pct ?? 0);
      const y = 400 - Math.min(Math.max((value / Math.max(maxValue, 1)) * 400, 0), 400);
      return `${x},${y}`;
    })
    .join(" ");
  const tooltip = validRows
    .map(
      (row) =>
        `Cohorte: ${cohort} • Mes +${row.months_since_start} • Avg: ${formatPercent(row.avg_progress_pct ?? 0)}`,
    )
    .join("\n");
  return (
    <polyline
      points={points}
      fill="none"
      stroke={color}
      strokeWidth={6}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.85}
    >
      <title>{tooltip}</title>
    </polyline>
  );
}

function Axes() {
  return (
    <g>
      <line x1={40} y1={20} x2={40} y2={360} stroke="#CBD5F5" strokeWidth={2} />
      <line x1={40} y1={360} x2={980} y2={360} stroke="#CBD5F5" strokeWidth={2} />
    </g>
  );
}

type LeiDistributionCardProps = {
  overall: LearnLeiDistributionRow | null;
  byLevel: LearnLeiDistributionRow[];
};

function LeiDistributionCard({ overall, byLevel }: LeiDistributionCardProps) {
  if (!overall && !byLevel.length) {
    return (
      <Card title="Distribución LEI (30 días)" description="Percentiles y dispersión por nivel">
        <EmptyState />
      </Card>
    );
  }

  const rows = [overall, ...byLevel].filter(Boolean) as LearnLeiDistributionRow[];
  if (!rows.length) {
    return (
      <Card title="Distribución LEI (30 días)" description="Percentiles y dispersión por nivel">
        <EmptyState />
      </Card>
    );
  }

  const allValues = rows.flatMap((row) => [row.p10, row.p25, row.p50, row.p75, row.p90]).filter(
    (value): value is number => value !== null && value !== undefined,
  );
  const globalMin = Math.min(...allValues, 0);
  const globalMax = Math.max(...allValues, 1);

  const levelRows = byLevel
    .slice()
    .sort((a, b) => {
      const aMedian = a.p50 ?? -Infinity;
      const bMedian = b.p50 ?? -Infinity;
      return bMedian - aMedian;
    });

  return (
    <Card title="Distribución LEI (30 días)" description="Percentiles p10–p90 y tamaño de muestra">
      <div className="flex flex-col gap-6">
        {overall ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">General</span>
            <BoxPlotRow row={overall} minValue={globalMin} maxValue={globalMax} />
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Por nivel</span>
          <div className="flex flex-col gap-3">
            {levelRows.length ? (
              levelRows.map((row) => (
                <div key={row.level ?? "—"} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Nivel {row.level ?? "—"}
                  </span>
                  <BoxPlotRow row={row} minValue={globalMin} maxValue={globalMax} />
                </div>
              ))
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

type BoxPlotRowProps = {
  row: LearnLeiDistributionRow;
  minValue: number;
  maxValue: number;
};

function BoxPlotRow({ row, minValue, maxValue }: BoxPlotRowProps) {
  const range = maxValue - minValue || 1;
  const p10 = row.p10 ?? row.p25 ?? 0;
  const p25 = row.p25 ?? p10;
  const p50 = row.p50 ?? p25;
  const p75 = row.p75 ?? p50;
  const p90 = row.p90 ?? p75;
  return (
    <div className="relative flex h-24 flex-col justify-center">
      <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-slate-200" aria-hidden="true" />
      <div className="relative flex h-16 items-center">
        <span
          className="absolute top-0 text-[10px] font-semibold uppercase tracking-widest text-slate-400"
          style={{ left: `${((p10 - minValue) / range) * 100}%` }}
        >
          p10
        </span>
        <span
          className="absolute bottom-0 text-[10px] font-semibold uppercase tracking-widest text-slate-400"
          style={{ left: `${((p90 - minValue) / range) * 100}%` }}
        >
          p90
        </span>
        <div
          className="absolute h-[2px] w-0.5 bg-slate-400"
          style={{ left: `${((p10 - minValue) / range) * 100}%`, height: "100%" }}
        />
        <div
          className="absolute h-[2px] w-0.5 bg-slate-400"
          style={{ left: `${((p90 - minValue) / range) * 100}%`, height: "100%" }}
        />
        <div
          className="absolute flex h-10 items-center justify-center rounded-lg bg-slate-900/80 text-xs font-semibold text-white"
          style={{
            left: `${((p25 - minValue) / range) * 100}%`,
            width: `${((p75 - p25) / range) * 100}%`,
          }}
          title={`p10 ${p10.toFixed(1)}, p25 ${p25.toFixed(1)}, p50 ${p50.toFixed(1)}, p75 ${p75.toFixed(1)}, p90 ${p90.toFixed(
            1,
          )} • n=${row.n}`}
        >
          <span>{decimalFormatter.format(p50)}</span>
        </div>
        <div
          className="absolute h-12 w-[3px] rounded bg-emerald-400"
          style={{ left: `${((p50 - minValue) / range) * 100}%` }}
        />
      </div>
      <span className="mt-2 text-xs text-slate-600">n = {formatInteger(row.n)}</span>
    </div>
  );
}

type OutcomesWeeklyCardProps = {
  data: LearnOutcomesWeeklyRow[];
  trendWindow: TrendWindow;
};

function OutcomesWeeklyCard({ data, trendWindow }: OutcomesWeeklyCardProps) {
  if (!data.length) {
    return (
      <Card title="Resultados Semanales" description="Graduados vs Salidas Anticipadas">
        <EmptyState />
      </Card>
    );
  }

  const trimmed = data.slice(-trendWindow);
  const maxValue = Math.max(
    ...trimmed.flatMap((row) => [row.graduados, row.retiros]),
    0,
  );

  return (
    <Card title="Resultados Semanales" description={`Últimas ${trendWindow} semanas`}>
      <div className="flex h-72 items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        {trimmed.map((row) => {
          const total = row.graduados + row.retiros;
          const graduadosHeight = maxValue ? (row.graduados / maxValue) * 100 : 0;
          const retirosHeight = maxValue ? (row.retiros / maxValue) * 100 : 0;
          return (
            <div key={row.wk} className="flex w-full flex-col items-center gap-1">
              <div className="flex w-full flex-col gap-1">
                <div
                  className="rounded-t-lg bg-emerald-500"
                  style={{ height: `${graduadosHeight}%` }}
                  title={`Semana ${row.wk} • Graduados ${formatInteger(row.graduados)} • Salidas ${formatInteger(row.retiros)}`}
                />
                <div
                  className="rounded-b-lg bg-rose-500"
                  style={{ height: `${retirosHeight}%` }}
                  title={`Semana ${row.wk} • Graduados ${formatInteger(row.graduados)} • Salidas ${formatInteger(row.retiros)}`}
                />
              </div>
              <span className="text-[10px] text-slate-500">{row.wk}</span>
              <span className="text-[10px] font-semibold text-slate-500">{formatInteger(total)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

type LevelUpsWeeklyCardProps = {
  data: LearnLevelupsWeeklyRow[];
  trendWindow: TrendWindow;
};

function LevelUpsWeeklyCard({ data, trendWindow }: LevelUpsWeeklyCardProps) {
  if (!data.length) {
    return (
      <Card title="Ascensos por Semana" description="Eventos de Level Up">
        <EmptyState />
      </Card>
    );
  }

  const trimmed = data.slice(-trendWindow);
  const maxValue = Math.max(...trimmed.map((row) => row.levelups), 0);

  const points = trimmed
    .map((row, index) => {
      const x = (index / Math.max(trimmed.length - 1, 1)) * 1000;
      const y = 360 - (maxValue ? (row.levelups / maxValue) * 320 : 0);
      return `${x + 20},${y + 20}`;
    })
    .join(" ");

  return (
    <Card title="Ascensos por Semana" description={`Últimas ${trendWindow} semanas`}>
      <div className="relative h-72 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <svg viewBox="0 0 1040 400" className="h-full w-full">
          <Axes />
          <polyline
            points={points}
            fill="none"
            stroke="#2563EB"
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </Card>
  );
}

type LevelMoveMatrixCardProps = {
  data: LearnLevelMoveMatrixRow[];
};

function LevelMoveMatrixCard({ data }: LevelMoveMatrixCardProps) {
  if (!data.length) {
    return (
      <Card title="Matriz de Cambios de Nivel" description="Movimiento entre niveles">
        <EmptyState />
      </Card>
    );
  }

  const levels = Array.from(
    new Set(data.flatMap((row) => [row.from_level, row.to_level])),
  ).sort();
  const matrix = levels.map((from) =>
    levels.map((to) => data.find((row) => row.from_level === from && row.to_level === to)?.n ?? 0),
  );
  const maxValue = Math.max(...matrix.flat(), 0);

  return (
    <Card title="Matriz de Cambios de Nivel" description="Origen vs destino de ascensos">
      <div className="overflow-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">
                Nivel
              </th>
              {levels.map((level) => (
                <th key={level} className="px-3 py-2 text-xs font-semibold uppercase text-slate-500">
                  {level}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map((from, rowIndex) => (
              <tr key={from} className="border-t border-slate-200">
                <th className="sticky left-0 bg-white px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">
                  {from}
                </th>
                {levels.map((to, colIndex) => {
                  const value = matrix[rowIndex][colIndex];
                  const intensity = maxValue ? value / maxValue : 0;
                  return (
                    <td
                      key={to}
                      className="px-3 py-2 text-center text-xs font-semibold text-slate-700"
                      style={{
                        backgroundColor: `rgba(37, 99, 235, ${0.1 + intensity * 0.6})`,
                      }}
                      title={`${from} → ${to}: ${formatInteger(value)}`}
                    >
                      {formatInteger(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

type LessonsHeatmapCardProps = {
  rows: LearnLessonsHeatmapRow[];
  levels: string[];
};

function LessonsHeatmapCard({ rows, levels }: LessonsHeatmapCardProps) {
  const [metric, setMetric] = useState<"p75" | "median">("p75");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setMetric("p75");
    setQuery("");
  }, [levels]);

  if (!rows.length) {
    return (
      <Card title="Atascos por Lección (últimos 60d)" description="Minutos por estudiante y % lento">
        <EmptyState />
      </Card>
    );
  }

  const filteredRows = rows.filter((row) => {
    if (levels.length && !levels.includes(row.level)) return false;
    if (query.trim().length && !row.lesson_id.toLowerCase().includes(query.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  if (!filteredRows.length) {
    return (
      <Card title="Atascos por Lección (últimos 60d)" description="Minutos por estudiante y % lento">
        <EmptyState />
      </Card>
    );
  }

  const grouped = filteredRows.reduce<Record<string, LearnLessonsHeatmapRow[]>>((acc, row) => {
    const key = row.level;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const allValues = filteredRows
    .map((row) => (metric === "p75" ? row.p75_minutes_per_student : row.median_minutes_per_student))
    .filter((value): value is number => value !== null && value !== undefined);
  const maxValue = Math.max(...allValues, 1);

  return (
    <Card
      title="Atascos por Lección (últimos 60d)"
      description="Minutos por estudiante (p75 o mediana) y % lento (>60m)"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar lección"
            className="rounded-full border border-slate-200 px-3 py-1 text-sm"
          />
          <div className="flex gap-2 rounded-full bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetric("p75")}
              className={`${metric === "p75" ? "bg-white shadow-sm" : "text-slate-500"} rounded-full px-3 py-1 transition`}
            >
              p75 min/estudiante
            </button>
            <button
              type="button"
              onClick={() => setMetric("median")}
              className={`${
                metric === "median" ? "bg-white shadow-sm" : "text-slate-500"
              } rounded-full px-3 py-1 transition`}
            >
              Mediana min/estudiante
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {Object.entries(grouped).map(([level, lessons]) => (
          <div key={level} className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Nivel {level}</span>
            <div className="grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2">
              {lessons.map((lesson) => {
                const value = metric === "p75" ? lesson.p75_minutes_per_student : lesson.median_minutes_per_student;
                const ratio = value ? value / maxValue : 0;
                return (
                  <div
                    key={lesson.lesson_id}
                    className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-3 text-center"
                    style={{
                      background: `linear-gradient(180deg, rgba(16,185,129,${0.15 + ratio * 0.5}) 0%, rgba(16,185,129,${
                        0.05 + ratio * 0.2
                      }) 100%)`,
                    }}
                    title={`Lección ${lesson.lesson_id} • ${metric === "p75" ? "p75" : "Mediana"}: ${formatDecimal(
                      value,
                    )} minutos • % lento (>60m): ${formatPercent(lesson.pct_slow_over_60 ?? 0)} • Estudiantes: ${formatInteger(
                      lesson.students,
                    )}`}
                  >
                    <span className="text-xs font-semibold text-slate-600">{lesson.lesson_id}</span>
                    <span className="text-lg font-bold text-slate-900">{formatDecimal(value)}</span>
                    <span className="text-[10px] uppercase text-slate-500">% lento: {formatPercent(lesson.pct_slow_over_60 ?? 0)}</span>
                    <span className="text-[10px] text-slate-500">{formatInteger(lesson.students)} estudiantes</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

type LearnerTablesCardProps = {
  slowest: LearnSlowLearnerRow[];
  fastest: LearnFastLearnerRow[];
  fastestCompletions: LearnFastestCompletionRow[];
};

function LearnerTablesCard({ slowest, fastest, fastestCompletions }: LearnerTablesCardProps) {
  const [activeTab, setActiveTab] = useState<"slow" | "fast" | "completion">("slow");

  return (
    <Card
      title="Listas destacadas"
      description="Estudiantes más lentos, más rápidos y terminaciones más rápidas"
      actions={
        <div className="flex gap-2 rounded-full bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("slow")}
            className={`${activeTab === "slow" ? "bg-white shadow-sm" : "text-slate-500"} rounded-full px-3 py-1 transition`}
          >
            Más Lentos (30d)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fast")}
            className={`${activeTab === "fast" ? "bg-white shadow-sm" : "text-slate-500"} rounded-full px-3 py-1 transition`}
          >
            Más Rápidos (30d)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completion")}
            className={`${
              activeTab === "completion" ? "bg-white shadow-sm" : "text-slate-500"
            } rounded-full px-3 py-1 transition`}
          >
            Terminaciones más Rápidas (90d)
          </button>
        </div>
      }
    >
      <div className="overflow-auto rounded-2xl border border-slate-200">
        {activeTab === "slow" ? (
          <LearnerTable
            rows={slowest}
            columns={[
              { key: "full_name", label: "Nombre" },
              { key: "level", label: "Nivel" },
              { key: "hours_30d", label: "Horas (30d)", format: formatDecimal },
              { key: "progress_delta_30d", label: "Progreso Δ (30d)", format: formatDecimal },
              { key: "min_per_pct", label: "Min/punto", format: formatDecimal },
              { key: "lei_30d_plan", label: "LEI 30d", format: formatDecimal },
              { key: "on_pace_plan", label: "En ritmo" },
              { key: "last_seen_date", label: "Última vez" },
            ]}
            emptyLabel="Sin datos"
          />
        ) : null}
        {activeTab === "fast" ? (
          <LearnerTable
            rows={fastest}
            columns={[
              { key: "full_name", label: "Nombre" },
              { key: "level", label: "Nivel" },
              { key: "hours_30d", label: "Horas (30d)", format: formatDecimal },
              { key: "progress_delta_30d", label: "Progreso Δ (30d)", format: formatDecimal },
              { key: "pct_per_hour", label: "% por hora", format: formatDecimal },
              { key: "lei_30d_plan", label: "LEI 30d", format: formatDecimal },
              { key: "on_pace_plan", label: "En ritmo" },
              { key: "last_seen_date", label: "Última vez" },
            ]}
            emptyLabel="Sin datos"
          />
        ) : null}
        {activeTab === "completion" ? (
          <LearnerTable
            rows={fastestCompletions}
            columns={[
              { key: "full_name", label: "Nombre" },
              { key: "final_level", label: "Nivel final" },
              { key: "months_to_complete", label: "Meses", format: formatMonths },
              { key: "started_at", label: "Inicio" },
              { key: "completed_at", label: "Final" },
              { key: "lei_30d_plan", label: "LEI 30d", format: formatDecimal },
            ]}
            emptyLabel="Sin datos"
          />
        ) : null}
      </div>
    </Card>
  );
}

type LearnerTableColumn<T> = {
  key: keyof T;
  label: string;
  format?: (value: any) => string;
};

type LearnerTableProps<T> = {
  rows: T[];
  columns: LearnerTableColumn<T>[];
  emptyLabel: string;
};

function LearnerTable<T extends Record<string, unknown>>({ rows, columns, emptyLabel }: LearnerTableProps<T>) {
  if (!rows.length) {
    return <div className="flex items-center justify-center px-4 py-12 text-sm text-slate-500">{emptyLabel}</div>;
  }

  return (
    <table className="min-w-full border-collapse">
      <thead className="sticky top-0 bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
        <tr>
          {columns.map((column) => (
            <th key={String(column.key)} className="px-4 py-3">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-t border-slate-200 text-sm text-slate-700">
            {columns.map((column) => {
              const rawValue = row[column.key];
              const value = column.format ? column.format(rawValue) : rawValue ?? "—";
              return (
                <td key={String(column.key)} className="px-4 py-3">
                  {value as ReactNode}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
