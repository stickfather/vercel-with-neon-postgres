import type { LeiKpiData } from "@/types/learning-panel";

type Props = {
  data: LeiKpiData;
};

export function LeiKpiCard({ data }: Props) {
  const { lei_7d_avg, sparkline_90d } = data;

  // Simple sparkline SVG (small markers)
  if (sparkline_90d.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm">
        <header className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900">LEI (7-day avg)</h3>
        </header>
        <div className="flex flex-col gap-1">
          <div className="text-3xl font-bold text-slate-900">—</div>
          <p className="text-xs text-slate-500">Lessons/hour (last 7 days)</p>
        </div>
      </section>
    );
  }

  // Calculate sparkline dimensions
  const values = sparkline_90d.map((d) => d.lei_week);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 200;
  const height = 40;
  const padding = 4;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (width - 2 * padding) + padding;
      const y = height - padding - ((v - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">LEI (7-day avg)</h3>
      </header>
      <div className="flex flex-col gap-2">
        <div className="text-3xl font-bold text-emerald-600">
          {lei_7d_avg.toFixed(2)}
        </div>
        <p className="text-xs text-slate-500">Lessons/hour (last 7 days)</p>
        
        {/* Sparkline */}
        <div className="mt-2">
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            aria-hidden="true"
          >
            <polyline
              points={points}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {values.map((v, i) => {
              const x = (i / (values.length - 1)) * (width - 2 * padding) + padding;
              const y = height - padding - ((v - min) / range) * (height - 2 * padding);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="2"
                  fill="#10b981"
                />
              );
            })}
          </svg>
        </div>
      </div>
      <figcaption className="sr-only">
        LEI 7-day average sparkline showing weekly trends over the last 90 days
      </figcaption>
    </section>
  );
}
