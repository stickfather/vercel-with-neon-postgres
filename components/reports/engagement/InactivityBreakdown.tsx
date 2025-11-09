import type { InactiveCounts } from "@/types/reports.engagement";

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  counts: InactiveCounts;
};

export function InactivityBreakdown({ counts }: Props) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Inactivos 7+ */}
      <article className="flex flex-col gap-3 rounded-2xl border border-amber-200/70 bg-white/95 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <header>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
            Inactivos 7+
          </span>
        </header>
        <div className="text-3xl font-semibold text-amber-700">
          {integerFormatter.format(counts.inactive_7d_count)}
        </div>
        <div className="text-xs text-slate-500">Sin asistencia 7+ días</div>
      </article>

      {/* Inactivos 14+ */}
      <article className="flex flex-col gap-3 rounded-2xl border border-rose-200/70 bg-white/95 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <header>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-500">
            Inactivos 14+
          </span>
        </header>
        <div className="text-3xl font-semibold text-rose-500">
          {integerFormatter.format(counts.inactive_14d_count)}
        </div>
        <div className="text-xs text-slate-500">Sin asistencia 14+ días</div>
      </article>

      {/* Dormidos 30+ */}
      <article className="flex flex-col gap-3 rounded-2xl border border-rose-300/70 bg-white/95 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <header>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-600">
            Dormidos 30+
          </span>
        </header>
        <div className="text-3xl font-semibold text-rose-600">
          {integerFormatter.format(counts.dormant_30d_count)}
        </div>
        <div className="text-xs text-slate-500">Sin asistencia 30+ días</div>
      </article>

      {/* Inactivos 180+ */}
      <article className="flex flex-col gap-3 rounded-2xl border border-rose-400/70 bg-white/95 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <header>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-700">
            Inactivos 180+
          </span>
        </header>
        <div className="text-3xl font-semibold text-rose-700">
          {integerFormatter.format(counts.inactive_180d_count)}
        </div>
        <div className="text-xs text-slate-500">Sin asistencia 180+ días</div>
      </article>
    </section>
  );
}
