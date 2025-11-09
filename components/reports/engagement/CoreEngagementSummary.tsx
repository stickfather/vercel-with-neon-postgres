import type { ActiveCounts } from "@/types/reports.engagement";

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  activeCounts: ActiveCounts;
};

export function CoreEngagementSummary({ activeCounts }: Props) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Activos 7d */}
      <article className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <header>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Activos (7d)
          </span>
        </header>
        <div className="text-3xl font-semibold text-slate-900">
          {integerFormatter.format(activeCounts.active_7d)}
        </div>
        <div className="text-xs text-slate-500">Últimos 7 días</div>
      </article>

      {/* Activos 14d */}
      <article className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <header>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Activos (14d)
          </span>
        </header>
        <div className="text-3xl font-semibold text-slate-900">
          {integerFormatter.format(activeCounts.active_14d)}
        </div>
        <div className="text-xs text-slate-500">Últimos 14 días</div>
      </article>

      {/* Activos 30d */}
      <article className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <header>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Activos (30d)
          </span>
        </header>
        <div className="text-3xl font-semibold text-slate-900">
          {integerFormatter.format(activeCounts.active_30d)}
        </div>
        <div className="text-xs text-slate-500">Últimos 30 días</div>
      </article>

      {/* Activos 6m */}
      <article className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <header>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Activos (6m)
          </span>
        </header>
        <div className="text-3xl font-semibold text-slate-900">
          {integerFormatter.format(activeCounts.active_6mo)}
        </div>
        <div className="text-xs text-slate-500">Base de retención</div>
      </article>
    </section>
  );
}
