import type { LevelBands } from "@/types/reports.resumen";

const bandConfig = [
  {
    key: "band_0_33" as const,
    label: "0-33%",
    color: "#f87171",
  },
  {
    key: "band_34_66" as const,
    label: "34-66%",
    color: "#fbbf24",
  },
  {
    key: "band_67_99" as const,
    label: "67-99%",
    color: "#34d399",
  },
  {
    key: "band_100" as const,
    label: "100%",
    color: "#10b981",
  },
];

const integerFormatter = new Intl.NumberFormat("es-EC");
const percentFormatter = new Intl.NumberFormat("es-EC", {
  maximumFractionDigits: 0,
});

function formatPercent(part: number, total: number) {
  if (!total) return "0%";
  return `${percentFormatter.format((part / total) * 100)}%`;
}

function buildAxisTicks(maxValue: number): number[] {
  if (maxValue <= 0) {
    return [0, 1];
  }

  const desiredTicks = 4;
  const rawStep = Math.ceil(maxValue / desiredTicks);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const niceSteps = [1, 2, 5, 10];
  let step = niceSteps[niceSteps.length - 1] * magnitude;

  for (const candidate of niceSteps) {
    const candidateStep = candidate * magnitude;
    if (rawStep <= candidateStep) {
      step = candidateStep;
      break;
    }
  }

  const ticks: number[] = [];
  for (let value = 0; value < maxValue; value += step) {
    ticks.push(value);
  }
  if (!ticks.length || ticks[ticks.length - 1] !== maxValue) {
    ticks.push(maxValue);
  }
  return ticks;
}

type Props = {
  data: LevelBands[];
};

export function ProgressByLevelStacked({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200/80 bg-white/70 p-8 text-sm text-slate-500">
        Sin datos aún — se mostrarán aquí los niveles activos.
      </div>
    );
  }

  const chartData = data.map((row) => {
    const total = bandConfig.reduce((acc, band) => acc + (row[band.key] ?? 0), 0);
    return {
      ...row,
      total,
    };
  });

  const maxTotal = Math.max(...chartData.map((row) => row.total), 0);
  const normalizedMax = maxTotal > 0 ? maxTotal : 1;
  const axisTicks = buildAxisTicks(maxTotal);
  const legendBands = bandConfig.filter((band) =>
    chartData.some((row) => row[band.key] > 0),
  );
  const bandsForLegend = legendBands.length ? legendBands : bandConfig;

  return (
    <div className="flex h-full flex-col gap-6 rounded-2xl border border-slate-200/60 bg-white/95 p-6 shadow-sm">
      <header className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-slate-800">Progreso por nivel</h3>
        <p className="text-sm text-slate-500">Distribución de estudiantes por bandas de avance.</p>
      </header>

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex w-12 flex-col-reverse justify-between text-[11px] font-medium text-slate-500">
            {axisTicks.map((tick) => (
              <span key={`tick-${tick}`}>{integerFormatter.format(tick)}</span>
            ))}
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-0 flex flex-col-reverse justify-between">
              {axisTicks.map((tick, index) => (
                <div
                  key={`line-${tick}`}
                  className={`w-full ${index === 0 ? "h-[2px] bg-slate-300" : "h-px bg-slate-200/70"}`}
                />
              ))}
            </div>
            <div
              className="relative grid h-64 gap-4 px-2 pb-6"
              style={{ gridTemplateColumns: `repeat(${chartData.length}, minmax(0, 1fr))` }}
            >
              {chartData.map((row) => {
                const levelLabel = row.level.toLowerCase() === "sin nivel" ? row.level : `Nivel ${row.level}`;

                return (
                  <div key={row.level} className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-full w-full flex-col justify-end overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50 shadow-inner">
                      {row.total === 0 ? (
                        <div className="flex h-full items-center justify-center px-2 text-[11px] font-medium text-slate-400">
                          Sin estudiantes
                        </div>
                      ) : (
                        bandConfig.map((band) => {
                          const value = row[band.key] ?? 0;
                          if (!value) return null;
                          const heightPercent = Math.max((value / normalizedMax) * 100, 0);
                          const share = row.total ? value / row.total : 0;
                          const showLabel = heightPercent >= 18 && share >= 0.2;

                          return (
                            <div
                              key={band.key}
                              style={{
                                height: `${heightPercent}%`,
                                minHeight: value > 0 ? "6px" : undefined,
                                backgroundColor: band.color,
                              }}
                              className="relative w-full transition-all duration-200"
                              title={`${band.label}: ${integerFormatter.format(value)} (${formatPercent(value, row.total)})`}
                            >
                              {showLabel ? (
                                <span className="absolute inset-x-1 bottom-1 rounded-full bg-white/80 px-1.5 text-[10px] font-semibold text-slate-700 shadow">
                                  {formatPercent(value, row.total)}
                                </span>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">{levelLabel}</span>
                      <span className="text-[11px] uppercase tracking-wide text-slate-500">
                        {integerFormatter.format(row.total)} estudiantes
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap gap-3 text-xs text-slate-600">
        {bandsForLegend.map((band) => (
          <div key={band.key} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: band.color }} aria-hidden="true" />
            <span>{band.label}</span>
          </div>
        ))}
      </footer>
    </div>
  );
}
