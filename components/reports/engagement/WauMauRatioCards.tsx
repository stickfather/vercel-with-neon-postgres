import type { WauMauMetrics } from "@/types/reports.engagement";

const integerFormatter = new Intl.NumberFormat("es-EC");
const percentFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Props = {
  metrics: WauMauMetrics;
};

function getRatioColor(ratio: number): string {
  if (ratio >= 0.6) return "emerald";
  if (ratio >= 0.4) return "sky";
  return "rose";
}

export function WauMauRatioCards({ metrics }: Props) {
  const ratioPercent = metrics.wau_mau_ratio * 100;
  const ratioColor = getRatioColor(metrics.wau_mau_ratio);

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* WAU (7d) */}
      <article className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <header>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            WAU (7d)
          </span>
        </header>
        <div className="text-3xl font-semibold text-slate-900">
          {integerFormatter.format(metrics.wau)}
        </div>
        <div className="text-xs text-slate-500">Activos semanales</div>
      </article>

      {/* MAU (30d) */}
      <article className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <header>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            MAU (30d)
          </span>
        </header>
        <div className="text-3xl font-semibold text-slate-900">
          {integerFormatter.format(metrics.mau)}
        </div>
        <div className="text-xs text-slate-500">Activos mensuales</div>
      </article>

      {/* WAU/MAU Ratio */}
      <article 
        className={`flex flex-col gap-3 rounded-2xl border border-${ratioColor}-200/70 bg-white/95 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}
      >
        <header>
          <span className={`text-xs font-semibold uppercase tracking-[0.28em] text-${ratioColor}-700`}>
            WAU/MAU
          </span>
        </header>
        <div className={`text-3xl font-semibold text-${ratioColor}-700`}>
          {percentFormatter.format(ratioPercent)}%
        </div>
        <div className="text-xs text-slate-500">
          {metrics.wau_mau_ratio >= 0.6 ? "Alta adherencia" : 
           metrics.wau_mau_ratio >= 0.4 ? "Adherencia media" : 
           "Adherencia baja"}
        </div>
      </article>
    </section>
  );
}
