import type { MicroKpi7d } from "@/types/learning-panel";

type Props = {
  data: MicroKpi7d;
};

const numberFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function MicroKpiStrip({ data }: Props) {
  const { active_learners, avg_minutes_per_active, completions } = data;

  const kpis = [
    {
      label: "Active (7d)",
      value: numberFormatter.format(active_learners),
      color: "text-sky-600",
    },
    {
      label: "Avg min/active (7d)",
      value: decimalFormatter.format(avg_minutes_per_active),
      color: "text-emerald-600",
    },
    {
      label: "Completions (7d)",
      value: numberFormatter.format(completions),
      color: "text-slate-900",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {kpis.map((kpi) => (
        <section
          key={kpi.label}
          className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm"
        >
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {kpi.label}
            </p>
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
          </div>
        </section>
      ))}
    </div>
  );
}
