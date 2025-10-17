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

function formatPercent(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

const integerFormatter = new Intl.NumberFormat("es-EC");

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

  return (
    <div className="flex h-full flex-col gap-6 rounded-2xl border border-slate-200/60 bg-white/95 p-6 shadow-sm">
      <header className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-slate-800">Progreso por nivel</h3>
        <p className="text-sm text-slate-500">Distribución de estudiantes por bandas de avance.</p>
      </header>
      <div className="flex flex-1 flex-col gap-4">
        {data.map((row) => {
          const total = bandConfig.reduce((acc, band) => acc + (row[band.key] ?? 0), 0);
          return (
            <div key={row.level} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                <span className="font-semibold text-slate-800">Nivel {row.level}</span>
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  {integerFormatter.format(total)} estudiantes
                </span>
              </div>
              <div className="flex overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                {bandConfig.map((band) => {
                  const value = row[band.key] ?? 0;
                  const width = total ? Math.max((value / total) * 100, 0) : 0;
                  return (
                    <span
                      key={band.key}
                      style={{ width: `${width}%`, backgroundColor: band.color }}
                      className="relative flex h-8 items-center justify-center text-xs font-semibold text-slate-900/80 transition-all duration-200"
                      title={`${band.label}: ${value} (${formatPercent(value, total)})`}
                    >
                      {width > 12 ? `${value} • ${formatPercent(value, total)}` : null}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <footer className="flex flex-wrap gap-3 text-xs text-slate-600">
        {bandConfig.map((band) => (
          <div key={band.key} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: band.color }} aria-hidden="true" />
            <span>{band.label}</span>
          </div>
        ))}
      </footer>
    </div>
  );
}
