import type { LevelKPI } from "@/types/reports.resumen";

const stateConfig = [
  {
    key: "onPace" as const,
    label: "% en ritmo",
    color: "#10b981",
  },
  {
    key: "activeOffPace" as const,
    label: "Activos fuera de ritmo",
    color: "#fbbf24",
  },
  {
    key: "inactive" as const,
    label: "Inactivos (30 d)",
    color: "#f97316",
  },
];

type ComputedRow = {
  level: string;
  students: number;
  onPace: number;
  activeOffPace: number;
  inactive: number;
};

const percentFormatter = new Intl.NumberFormat("es-EC", {
  style: "percent",
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("es-EC");

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function normalizeRows(data: LevelKPI[]): ComputedRow[] {
  return data.map((row) => {
    const students = row.students ?? 0;
    const activePct = clamp(row.active_30d_pct ?? 0);
    const onPacePct = clamp(row.on_pace_pct ?? 0, 0, activePct);
    const activeOffPacePct = clamp(activePct - onPacePct, 0, 100);
    const inactivePct = clamp(100 - activePct, 0, 100);

    return {
      level: row.level,
      students,
      onPace: onPacePct,
      activeOffPace: activeOffPacePct,
      inactive: inactivePct,
    };
  });
}

function formatPercent(value: number) {
  return percentFormatter.format(value / 100);
}

function formatCount(totalStudents: number, percent: number) {
  if (!totalStudents) return "0";
  return integerFormatter.format(Math.round((totalStudents * percent) / 100));
}

type Props = {
  data: LevelKPI[];
};

export function LevelStateStacked({ data }: Props) {
  const rows = normalizeRows(data);

  if (!rows.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200/80 bg-white/70 p-8 text-sm text-slate-500">
        Sin datos aún — se mostrarán aquí los niveles activos.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 rounded-2xl border border-slate-200/60 bg-white/95 p-6 shadow-sm">
      <header className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-slate-800">Estados de actividad por nivel</h3>
        <p className="text-sm text-slate-500">Comparativo de estudiantes activos, fuera de ritmo e inactivos.</p>
      </header>
      <div className="flex flex-1 flex-col gap-4">
        {rows.map((row) => (
          <div key={row.level} className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm font-medium text-slate-700">
              <span className="font-semibold text-slate-800">Nivel {row.level}</span>
              <span className="text-xs uppercase tracking-wide text-slate-500">
                {integerFormatter.format(row.students)} estudiantes
              </span>
            </div>
            <div className="flex overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              {stateConfig.map((state) => {
                const value = row[state.key];
                return (
                  <span
                    key={state.key}
                    style={{ width: `${value}%`, backgroundColor: state.color }}
                    className="relative flex h-8 items-center justify-center text-[11px] font-semibold text-slate-900/80 transition-all duration-200"
                    title={`${state.label}: ${formatPercent(value)} · ${formatCount(row.students, value)} estudiantes`}
                  >
                    {value >= 12 ? `${formatPercent(value)} • ${formatCount(row.students, value)}` : null}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <footer className="flex flex-wrap gap-3 text-xs text-slate-600">
        {stateConfig.map((state) => (
          <div key={state.key} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: state.color }} aria-hidden="true" />
            <span>{state.label}</span>
          </div>
        ))}
      </footer>
    </div>
  );
}
