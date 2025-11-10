import type { SpeedBucketsData } from "@/types/learning-panel";

type Props = {
  data: SpeedBucketsData;
};

export function SpeedBucketsCard({ data }: Props) {
  const { fast, typical, slow, fast_pct, typical_pct, slow_pct } = data;
  const total = fast + typical + slow;

  if (total === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm">
        <header className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Categorías de Velocidad (90d)</h3>
        </header>
        <div className="flex flex-col gap-1">
          <div className="text-3xl font-bold text-slate-900">—</div>
          <p className="text-xs text-slate-500">No hay datos disponibles</p>
        </div>
      </section>
    );
  }

  const buckets = [
    { label: "Rápido", count: fast, pct: fast_pct, color: "bg-emerald-600" },
    { label: "Típico", count: typical, pct: typical_pct, color: "bg-slate-600" },
    { label: "Lento", count: slow, pct: slow_pct, color: "bg-rose-600" },
  ];

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Categorías de Velocidad (90d)</h3>
      </header>
      <div className="flex flex-col gap-3">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">{bucket.label}</span>
                <span className="text-slate-600">
                  {bucket.count} <span className="text-slate-500">({bucket.pct}%)</span>
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full ${bucket.color}`}
                  style={{ width: `${bucket.pct}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">
        Ritmos de aprendizaje: distribución de estudiantes por velocidad (90 días)
      </figcaption>
    </section>
  );
}
