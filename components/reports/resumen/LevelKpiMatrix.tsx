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
    return "bg-slate-100 text-slate-500";
  }
  const normalized = value > 1 ? value / 100 : value;
  if (normalized >= 0.75) return "bg-emerald-100 text-emerald-700";
  if (normalized >= 0.5) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function MetricCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  const className = tone ?? "bg-slate-50 text-slate-700";
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-center text-sm font-semibold ${className}`}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500/80">
        {label}
      </span>
      <span className="text-base">{value}</span>
    </div>
  );
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
      <div className="flex flex-col gap-4">
        <div className="overflow-x-auto">
          <div className="min-w-[720px] space-y-3">
            <div className="grid grid-cols-[minmax(180px,1.1fr)_repeat(4,minmax(0,1fr))] gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              <span>Nivel</span>
              <span>% activos (30 d)</span>
              <span>% en ritmo</span>
              <span>LEI mediana</span>
              <span>Meses p/ terminar</span>
            </div>

            {data.map((row) => (
              <div
                key={row.level}
                className="grid grid-cols-[minmax(180px,1.1fr)_repeat(4,minmax(0,1fr))] items-stretch gap-3 rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm transition duration-200 hover:-translate-y-[1px]"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                    {row.level}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wide text-slate-500">Estudiantes</span>
                    <span className="text-lg font-semibold text-slate-800">{integerFormatter.format(row.students)}</span>
                  </div>
                </div>
                <MetricCell
                  label="Activos 30 d"
                  value={formatPercent(row.active_30d_pct)}
                  tone={getHeatColor(row.active_30d_pct)}
                />
                <MetricCell
                  label="En ritmo"
                  value={formatPercent(row.on_pace_pct)}
                  tone={getHeatColor(row.on_pace_pct)}
                />
                <MetricCell label="LEI mediana" value={formatDecimal(row.median_lei_30d)} />
                <MetricCell label="Meses p/ terminar" value={formatMonths(row.median_months_to_finish)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
