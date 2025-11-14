import type { ActiveSummary } from "@/types/reports.engagement";

const LABELS: Record<keyof ActiveSummary, { title: string; subtitle: string }> = {
  last7d: { title: "Activos (7d)", subtitle: "Semana en curso" },
  last14d: { title: "Activos (14d)", subtitle: "Comparativo quincenal" },
  last30d: { title: "Activos (30d)", subtitle: "Último mes" },
  last180d: { title: "Activos (180d)", subtitle: "Últimos 6 meses" },
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-EC", { maximumFractionDigits: 0 }).format(value);
}

function formatChange(value: number | null): { label: string; tone: string } {
  if (value === null) return { label: "—", tone: "text-slate-500" };
  const sign = value > 0 ? "+" : "";
  const tone = value > 0 ? "text-emerald-600" : value < 0 ? "text-rose-600" : "text-slate-500";
  return { label: `${sign}${value.toFixed(1)}%`, tone };
}

export function ActiveSummaryCards({ summary }: { summary: ActiveSummary }) {
  const keys = Object.keys(LABELS) as Array<keyof ActiveSummary>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {keys.map((key) => {
        const label = LABELS[key];
        const metric = summary[key];
        const change = formatChange(metric.changePct);
        return (
          <article
            key={key}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-900/5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label.subtitle}</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">{label.title}</h3>
            <p className="mt-4 text-4xl font-black text-slate-900">{formatNumber(metric.count)}</p>
            <p className={`mt-2 text-sm font-semibold ${change.tone}`}>
              {change.label === "—" ? "Sin cambio disponible" : `${change.label} vs periodo anterior`}
            </p>
          </article>
        );
      })}
    </div>
  );
}
