import type { LevelStateBreakdown, LevelStateKey } from "@/types/reports.resumen";

const stateConfig: Array<{ key: LevelStateKey; label: string; color: string }> = [
  { key: "activo", label: "Activo/a", color: "#10b981" },
  { key: "inactivo", label: "Inactivo/a", color: "#cbd5f5" },
  { key: "en_pausa", label: "En pausa", color: "#facc15" },
  { key: "congelado", label: "Congelado/a", color: "#38bdf8" },
  { key: "progreso_lento", label: "Progreso lento", color: "#f97316" },
  { key: "ausente", label: "Ausente", color: "#fb7185" },
  { key: "graduado", label: "Graduado/a", color: "#6366f1" },
  { key: "retirado", label: "Retirado/a", color: "#ef4444" },
  { key: "invalido", label: "Inválido/a", color: "#f43f5e" },
  { key: "prospecto", label: "Prospecto", color: "#a855f7" },
  { key: "otros", label: "Otros", color: "#d1d5db" },
];

const integerFormatter = new Intl.NumberFormat("es-EC");

const percentFormatter = new Intl.NumberFormat("es-EC", {
  style: "percent",
  maximumFractionDigits: 1,
});

function formatPercent(part: number, total: number) {
  if (!total) return "0%";
  return percentFormatter.format(part / total);
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
  data: LevelStateBreakdown[];
};

export function LevelStateStacked({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200/80 bg-white/70 p-8 text-sm text-slate-500">
        Sin datos aún — se mostrarán aquí los niveles activos.
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((row) => row.total), 0);
  const normalizedMax = maxTotal > 0 ? maxTotal : 1;
  const axisTicks = buildAxisTicks(maxTotal);

  const legendStates = stateConfig.filter((state) =>
    data.some((row) => row.total > 0 && row[state.key] > 0),
  );

  const statesForLegend = legendStates.length ? legendStates : stateConfig;

  return (
    <div className="flex h-full flex-col gap-6 rounded-2xl border border-slate-200/60 bg-white/95 p-6 shadow-sm">
      <header className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-slate-800">Estados de estudiantes por nivel</h3>
        <p className="text-sm text-slate-500">Distribución de estados (activo, pausado, congelado, etc.) por nivel.</p>
      </header>

      <div className="flex flex-1 flex-col gap-4">
        <div className="relative flex flex-1 flex-col">
          <div className="flex flex-1 items-stretch">
            <div className="flex w-14 flex-col-reverse justify-between pr-2 text-[11px] font-semibold text-slate-500">
              {axisTicks.map((tick) => (
                <span key={`axis-y-${tick}`}>{integerFormatter.format(tick)}</span>
              ))}
            </div>
            <div className="relative flex-1">
              <div className="absolute inset-0 flex flex-col-reverse justify-between">
                {axisTicks.map((tick, index) => (
                  <div
                    key={`grid-${tick}`}
                    className={`w-full ${index === 0 ? "h-[3px] bg-slate-300" : "h-px bg-slate-200/70"}`}
                  />
                ))}
              </div>
              <div
                className="relative grid h-full content-end gap-4 px-2"
                style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
              >
                {data.map((row) => {
                  const levelLabel =
                    row.level.toLowerCase() === "sin nivel" ? row.level : `Nivel ${row.level}`;

                  return (
                    <div key={row.level} className="flex flex-col items-center gap-2">
                      <div className="flex h-64 w-full flex-col justify-end overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50 shadow-inner transition-all duration-200">
                        {row.total === 0 ? (
                          <div className="flex h-full items-center justify-center px-2 text-[11px] font-medium text-slate-400">
                            Sin estudiantes
                          </div>
                        ) : (
                          stateConfig.map((state) => {
                            const count = row[state.key];
                            if (!count) {
                              return null;
                            }
                            const heightPercent = Math.max((count / normalizedMax) * 100, 0);
                            const share = row.total ? count / row.total : 0;
                            const showLabel = share >= 0.18 && heightPercent >= 14;
                            return (
                              <div
                                key={state.key}
                                style={{
                                  height: `${heightPercent}%`,
                                  minHeight: count > 0 ? "6px" : undefined,
                                  backgroundColor: state.color,
                                }}
                                className="relative w-full"
                                title={`${state.label}: ${integerFormatter.format(count)} (${formatPercent(count, row.total)})`}
                              >
                                {showLabel ? (
                                  <span className="absolute inset-x-1 bottom-1 rounded-full bg-white/85 px-1.5 text-[10px] font-semibold text-slate-700 shadow">
                                    {formatPercent(count, row.total)}
                                  </span>
                                ) : null}
                              </div>
                            );
                          })
                        )}
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {integerFormatter.format(row.total)} estudiantes
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-4 pl-14">
            <div
              className="grid gap-4 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600"
              style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
            >
              {data.map((row) => {
                const levelLabel =
                  row.level.toLowerCase() === "sin nivel" ? row.level : `Nivel ${row.level}`;
                return <span key={`label-${row.level}`}>{levelLabel}</span>;
              })}
            </div>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap gap-3 text-xs text-slate-600">
        {statesForLegend.map((state) => (
          <div key={state.key} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: state.color }} aria-hidden="true" />
            <span>{state.label}</span>
          </div>
        ))}
      </footer>
    </div>
  );
}
