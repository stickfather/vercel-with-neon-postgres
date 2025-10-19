"use client";

import { type ReactNode, useMemo, useState } from "react";

import type {
  LearnDashboardData,
  LearnFastLearnerRow,
  LearnFastestCompletionRow,
  LearnLessonsHeatmapRow,
  LearnLevelMoveMatrixRow,
  LearnLevelupsWeeklyRow,
  LearnLeiDistributionRow,
  LearnOutcomesWeeklyRow,
  LearnSlowLearnerRow,
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

const DEFAULT_TREND_WINDOW = 13;

type LearningDashboardProps = {
  data: LearnDashboardData;
};

export function LearningDashboard({ data }: LearningDashboardProps) {
  const trendWindow = DEFAULT_TREND_WINDOW;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-6 rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-lg shadow-slate-200/40">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Panel de gestión</span>
            <h1 className="text-3xl font-black text-slate-900 sm:text-[40px]">Aprendizaje (Learning)</h1>
            <p className="text-sm leading-relaxed text-slate-600">
              Indicadores clave del avance académico, resultados semanales y focos de fricción en las lecciones. Datos de los
              últimos tres meses para todos los niveles.
            </p>
          </div>
          <ExportButton
            slowest={data.slowest}
            fastest={data.fastest}
            fastestCompletions={data.fastestCompletions}
          />
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1">Ventana: 13 semanas</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">Niveles: A1–C1</span>
        </div>
      </header>

      <section className="flex flex-col gap-8">
        <KpiTiles
          header={data.header}
          onpaceSplit={data.onpaceSplit}
          outcomesWeekly={data.outcomesWeekly}
        />

        <LeiDistributionCard overall={data.leiOverall} byLevel={data.leiByLevel} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <LevelUpsWeeklyCard data={data.levelupsWeekly} trendWindow={trendWindow} />
          <LevelMoveMatrixCard data={data.levelMoveMatrix} />
        </div>

        <LessonsHeatmapCard rows={data.lessonsHeatmap} />

        <LearnerTablesCard
          slowest={data.slowest}
          fastest={data.fastest}
          fastestCompletions={data.fastestCompletions}
        />
      </section>
    </div>
  );
}

type ExportButtonProps = {
  slowest: LearnSlowLearnerRow[];
  fastest: LearnFastLearnerRow[];
  fastestCompletions: LearnFastestCompletionRow[];
};

function ExportButton({ slowest, fastest, fastestCompletions }: ExportButtonProps) {
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
      className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500/90"
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
    <section className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
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
    <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500">
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

type LeiDistributionCardProps = {
  overall: LearnLeiDistributionRow | null;
  byLevel: LearnLeiDistributionRow[];
};

function LeiDistributionCard({ overall, byLevel }: LeiDistributionCardProps) {
  if (!overall && !byLevel.length) {
    return (
      <Card title="Salud LEI (30 días)" description="Mediana reciente y señal de alerta">
        <EmptyState />
      </Card>
    );
  }

  const dataRows = [overall, ...byLevel].filter(Boolean) as LearnLeiDistributionRow[];
  if (!dataRows.length) {
    return (
      <Card title="Salud LEI (30 días)" description="Mediana reciente y señal de alerta">
        <EmptyState />
      </Card>
    );
  }

  const overallMedian = overall?.p50 ?? null;
  const overallStatus = getLeiStatus(overallMedian);

  const levelSummaries = byLevel
    .map((row) => ({
      level: row.level ?? "—",
      median: row.p50 ?? null,
      sample: row.n,
      status: getLeiStatus(row.p50 ?? null),
    }))
    .sort((a, b) => (b.median ?? -Infinity) - (a.median ?? -Infinity));

  return (
    <Card title="Salud LEI (30 días)" description="Mediana reciente y señal de alerta por nivel">
      <div className="flex flex-col gap-6">
        <div
          className={`rounded-3xl border ${overallStatus.panelBorder} ${overallStatus.panelBg} p-6`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mediana general
                </span>
                <span className={`text-4xl font-black ${overallStatus.textClass}`}>
                  {overallMedian === null ? "—" : decimalFormatter.format(overallMedian)}
                </span>
                <span className="text-sm text-slate-600">LEI promedio últimos 30 días</span>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${overallStatus.badge}`}
              >
                {overallStatus.label}
              </span>
            </div>
            <p className="text-sm text-slate-600">{overallStatus.message}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Por nivel
            </span>
            <span className="text-[11px] uppercase text-slate-400">
              ≥75 bueno • 60–74 observar • &lt;60 riesgo
            </span>
          </div>
          {levelSummaries.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full border-collapse text-sm text-slate-700">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nivel</th>
                    <th className="px-4 py-3">Mediana LEI</th>
                    <th className="px-4 py-3">Estudiantes</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {levelSummaries.map((row) => (
                    <tr key={row.level} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-semibold text-slate-600">{row.level}</td>
                      <td className="px-4 py-3">{formatDecimal(row.median)}</td>
                      <td className="px-4 py-3">{formatInteger(row.sample)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${row.status.badge}`}
                        >
                          {row.status.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </Card>
  );
}

type LeiStatus = {
  label: string;
  badge: string;
  panelBg: string;
  panelBorder: string;
  textClass: string;
  message: string;
};

function getLeiStatus(value: number | null): LeiStatus {
  if (value === null) {
    return {
      label: "Sin datos",
      badge: "bg-slate-200 text-slate-600",
      panelBg: "bg-slate-50",
      panelBorder: "border-slate-200",
      textClass: "text-slate-500",
      message: "No hay mediciones recientes de LEI para este grupo.",
    };
  }

  if (value >= 75) {
    return {
      label: "Excelente",
      badge: "bg-emerald-100 text-emerald-700",
      panelBg: "bg-emerald-50",
      panelBorder: "border-emerald-200",
      textClass: "text-emerald-700",
      message: "La experiencia de aprendizaje es saludable y consistente.",
    };
  }

  if (value >= 60) {
    return {
      label: "En observación",
      badge: "bg-amber-100 text-amber-700",
      panelBg: "bg-amber-50",
      panelBorder: "border-amber-200",
      textClass: "text-amber-700",
      message: "Hay señales de fricción moderada, revisa planes de acción.",
    };
  }

  return {
    label: "En riesgo",
    badge: "bg-rose-100 text-rose-700",
    panelBg: "bg-rose-50",
    panelBorder: "border-rose-200",
    textClass: "text-rose-700",
    message: "El LEI es bajo: intervén con soporte adicional a los estudiantes.",
  };
}

type LevelUpsWeeklyCardProps = {
  data: LearnLevelupsWeeklyRow[];
  trendWindow: number;
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
          <ChartAxes />
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

function ChartAxes() {
  return (
    <g>
      <line x1={40} y1={20} x2={40} y2={360} stroke="#CBD5F5" strokeWidth={2} />
      <line x1={40} y1={360} x2={1000} y2={360} stroke="#CBD5F5" strokeWidth={2} />
    </g>
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
};

function LessonsHeatmapCard({ rows }: LessonsHeatmapCardProps) {
  const [query, setQuery] = useState("");

  const processed = rows.map((row) => {
    const students = Math.max(row.students ?? 0, 0);
    const averageMinutes = row.median_minutes_per_student ?? row.p75_minutes_per_student ?? 0;
    const totalMinutes = Math.max(Math.round(students * averageMinutes), 0);
    return {
      level: row.level,
      lesson: row.lesson_id,
      students,
      averageMinutes,
      totalMinutes,
    };
  });

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = processed.filter((row) => {
    if (!normalizedQuery) return true;
    return (
      row.lesson.toLowerCase().includes(normalizedQuery) ||
      row.level.toLowerCase().includes(normalizedQuery)
    );
  });

  const sorted = filtered.sort((a, b) => b.totalMinutes - a.totalMinutes);
  const topRows = sorted.slice(0, 30);

  const totalStudents = filtered.reduce((sum, row) => sum + row.students, 0);
  const totalMinutes = filtered.reduce((sum, row) => sum + row.totalMinutes, 0);

  return (
    <Card
      title="Atascos por Lección (últimos 60d)"
      description="Estudiantes atascados y minutos acumulados"
      actions={
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar nivel o lección"
          className="w-full max-w-xs rounded-full border border-slate-200 px-3 py-1.5 text-sm"
        />
      }
    >
      {filtered.length ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estudiantes afectados</span>
              <span className="block text-2xl font-black text-slate-900">{formatInteger(totalStudents)}</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Minutos acumulados</span>
              <span className="block text-2xl font-black text-slate-900">{formatInteger(totalMinutes)}</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full border-collapse text-sm text-slate-700">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Nivel</th>
                  <th className="px-4 py-2">Lección</th>
                  <th className="px-4 py-2">Estudiantes atascados</th>
                  <th className="px-4 py-2">Minutos totales</th>
                </tr>
              </thead>
              <tbody>
                {topRows.map((row) => (
                  <tr
                    key={`${row.level}-${row.lesson}`}
                    className="border-t border-slate-200 text-xs sm:text-sm"
                    title={`Promedio por estudiante: ${formatDecimal(row.averageMinutes)} min`}
                  >
                    <td className="px-4 py-2 font-semibold text-slate-600">{row.level}</td>
                    <td className="px-4 py-2">{row.lesson}</td>
                    <td className="px-4 py-2">{formatInteger(row.students)}</td>
                    <td className="px-4 py-2">{formatInteger(row.totalMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > topRows.length ? (
            <span className="text-xs text-slate-500">Mostrando las {topRows.length} lecciones con más minutos acumulados.</span>
          ) : null}
        </div>
      ) : (
        <EmptyState />
      )}
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
