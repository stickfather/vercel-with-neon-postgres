const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Props = {
  avgDays: number;
  medianDays: number;
};

export function AvgDaysBetweenVisitsCard({ avgDays, medianDays }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Promedio de Días Entre Visitas
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Cálculo basado en brechas entre check-ins por alumno
        </p>
      </header>

      <div className="space-y-4">
        {/* Average */}
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-sm font-medium text-slate-600">Promedio</div>
            <div className="mt-1 text-xs text-slate-400">Más alto = menor compromiso</div>
          </div>
          <div className="text-4xl font-semibold text-slate-900">
            {decimalFormatter.format(avgDays)}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Median */}
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-medium text-slate-600">Mediana</div>
          <div className="text-4xl font-semibold text-slate-900">
            {decimalFormatter.format(medianDays)}
          </div>
        </div>
      </div>
    </section>
  );
}
