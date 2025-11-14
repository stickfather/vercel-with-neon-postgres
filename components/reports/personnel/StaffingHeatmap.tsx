import type { StaffingHeatmapCell } from "@/types/personnel";

const ratioFormatter = new Intl.NumberFormat("es-EC", {
  maximumFractionDigits: 1,
});

function getColorClasses(ratio: number | null): string {
  if (ratio === null) return "bg-slate-100 text-slate-500";
  if (ratio <= 6) return "bg-emerald-100 text-emerald-900";
  if (ratio <= 9) return "bg-amber-100 text-amber-900";
  return "bg-rose-100 text-rose-900";
}

export function StaffingHeatmap({ cells }: { cells: StaffingHeatmapCell[] }) {
  const hasData = cells.some((cell) => cell.ratio !== null);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Cobertura vs demanda por hora</p>
          <p className="text-xs text-slate-500">08:00 – 20:00 • Estudiantes por profesor (minutos)</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Adecuado
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Ajustado
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-400" /> Riesgo
          </span>
        </div>
      </header>

      {!cells.length || !hasData ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          Aún no contamos con datos de cobertura horarios.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-13">
          {cells.map((cell) => (
            <div
              key={cell.hourLabel}
              className={`flex flex-col items-center rounded-xl px-2 py-3 text-center ${getColorClasses(cell.ratio)}`}
            >
              <span className="text-xs font-medium text-slate-600">{cell.hourLabel}</span>
              <span className="text-lg font-semibold">
                {cell.ratio !== null ? `${ratioFormatter.format(cell.ratio)}×` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
