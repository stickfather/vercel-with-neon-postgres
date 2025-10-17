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
  return `${monthsFormatter.format(value)} m`;
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
            <div className="grid grid-cols-[minmax(200px,1.1fr)_repeat(4,minmax(0,1fr))] items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              <span>Nivel</span>
              <span>% activos (30 d)</span>
              <span>% en ritmo</span>
              <span>LEI mediana</span>
              <span>Meses p/ terminar</span>
            </div>

            {data.map((row) => {
              const levelBadge = row.level ?? "—";
              const studentsLabel = integerFormatter.format(row.students);
              const activePercent = formatPercent(row.active_30d_pct);
              const onPacePercent = formatPercent(row.on_pace_pct);
              const leiValue = formatDecimal(row.median_lei_30d);
              const monthsValue = formatMonths(row.median_months_to_finish);

              return (
                <div
                  key={row.level}
                  className="grid grid-cols-[minmax(200px,1.1fr)_repeat(4,minmax(0,1fr))] items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/95 px-4 py-3 shadow-sm transition duration-200 hover:-translate-y-[1px]"
                >
                  <div className="flex items-center gap-3 text-left">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                      {levelBadge}
                    </span>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estudiantes</span>
                      <span className="text-lg font-semibold text-slate-800">{studentsLabel}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold ${getHeatColor(row.active_30d_pct)}`}>
                    {activePercent}
                  </span>
                  <span className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold ${getHeatColor(row.on_pace_pct)}`}>
                    {onPacePercent}
                  </span>
                  <span className={`text-sm font-semibold ${leiValue === "—" ? "text-slate-400" : "text-slate-700"}`}>
                    {leiValue}
                  </span>
                  <span className={`text-sm font-semibold ${monthsValue === "—" ? "text-slate-400" : "text-slate-700"}`}>
                    {monthsValue}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
