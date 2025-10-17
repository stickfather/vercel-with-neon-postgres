import type { LevelKPI } from "@/types/reports.resumen";

const percentFormatter = new Intl.NumberFormat("es-EC", {
  style: "percent",
  maximumFractionDigits: 1,
});

const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const monthsFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("es-EC");

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const normalized = value > 1 ? value / 100 : value;
  return percentFormatter.format(normalized);
}

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return decimalFormatter.format(value);
}

function formatMonths(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${monthsFormatter.format(value)} m`; // meses
}

function getHeatColor(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "bg-slate-100";
  }
  const normalized = value > 1 ? value / 100 : value;
  if (normalized >= 0.75) return "bg-emerald-100 text-emerald-700";
  if (normalized >= 0.5) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

type Props = {
  data: LevelKPI[];
};

export function LevelKpiMatrix({ data }: Props) {
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
        <h3 className="text-lg font-semibold text-slate-800">Indicadores por nivel</h3>
        <p className="text-sm text-slate-500">Actividad, ritmo y velocidad de avance por nivel.</p>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              <th className="rounded-l-xl bg-slate-100/80 px-4 py-2">Nivel</th>
              <th className="bg-slate-100/80 px-4 py-2">% activos (30 d)</th>
              <th className="bg-slate-100/80 px-4 py-2">% en ritmo</th>
              <th className="bg-slate-100/80 px-4 py-2">LEI mediana</th>
              <th className="rounded-r-xl bg-slate-100/80 px-4 py-2">Meses p/ terminar</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.level}
                className="text-sm font-medium text-slate-700 transition duration-200 hover:translate-x-1"
              >
                <td className="rounded-l-xl bg-white px-4 py-3 text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">
                      {row.level}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-slate-500">Estudiantes</span>
                      <span className="text-base font-semibold text-slate-800">{integerFormatter.format(row.students)}</span>
                    </div>
                  </div>
                </td>
                <td className={`bg-white px-4 py-3 text-center font-semibold ${getHeatColor(row.active_30d_pct)}`}>
                  {formatPercent(row.active_30d_pct)}
                </td>
                <td className={`bg-white px-4 py-3 text-center font-semibold ${getHeatColor(row.on_pace_pct)}`}>
                  {formatPercent(row.on_pace_pct)}
                </td>
                <td className="bg-white px-4 py-3 text-center font-semibold text-slate-700">
                  {formatDecimal(row.median_lei_30d)}
                </td>
                <td className="rounded-r-xl bg-white px-4 py-3 text-center font-semibold text-slate-700">
                  {formatMonths(row.median_months_to_finish)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
