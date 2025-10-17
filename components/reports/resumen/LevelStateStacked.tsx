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
        {data.map((row) => {
          const levelLabel =
            row.level.toLowerCase() === "sin nivel" ? row.level : `Nivel ${row.level}`;

          return (
            <div key={row.level} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                <span className="font-semibold text-slate-800">{levelLabel}</span>
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  {integerFormatter.format(row.total)} estudiantes
                </span>
              </div>
              <div className="flex overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                {stateConfig.map((state) => {
                  const count = row[state.key];
                  if (!count) {
                    return null;
                  }
                  const width = row.total ? Math.max((count / row.total) * 100, 0) : 0;
                  return (
                    <span
                      key={state.key}
                      style={{ width: `${width}%`, backgroundColor: state.color }}
                      className="relative flex h-8 items-center justify-center text-[11px] font-semibold text-slate-900/80 transition-all duration-200"
                      title={`${state.label}: ${integerFormatter.format(count)} (${formatPercent(count, row.total)})`}
                    >
                      {width >= 14 ? `${formatPercent(count, row.total)} • ${integerFormatter.format(count)}` : null}
                    </span>
                  );
                })}
              </div>
              {row.total === 0 ? (
                <p className="text-xs text-slate-500">Sin estudiantes registrados en este nivel.</p>
              ) : null}
            </div>
          );
        })}
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
