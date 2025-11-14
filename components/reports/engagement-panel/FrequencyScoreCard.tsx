import type { FrequencyScore } from "@/types/reports.engagement";

function buildSparkline(values: number[]): string {
  if (!values.length) return "0,10 100,10";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const normalized = (value - min) / range;
      const y = 30 - normalized * 30;
      return `${x},${y}`;
    })
    .join(" ");
}

export function FrequencyScoreCard({ score }: { score: FrequencyScore }) {
  const sparkline = buildSparkline(score.sparkline);
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Frecuencia</p>
      <h3 className="mt-2 text-2xl font-semibold text-slate-900">Sesiones por semana</h3>
      <div className="mt-4 flex items-baseline gap-3">
        <p className="text-5xl font-black text-slate-900">
          {score.sessionsPerWeek === null ? "—" : score.sessionsPerWeek.toFixed(1)}
        </p>
        {score.targetSessionsPerWeek !== null ? (
          <span className="text-sm text-slate-500">Meta: {score.targetSessionsPerWeek.toFixed(1)}</span>
        ) : null}
      </div>
      <div className="mt-4 h-16">
        <svg viewBox="0 0 100 30" className="h-full w-full">
          <polyline
            fill="none"
            stroke="#6366f1"
            strokeWidth="2"
            strokeLinecap="round"
            points={sparkline}
          />
        </svg>
      </div>
      <p className="text-xs text-slate-500">Serie basada en los últimos 8 cortes semanales.</p>
    </article>
  );
}
