import type { DeclinePoint } from "@/types/reports.engagement";

function buildPolyline(points: DeclinePoint[]): string {
  if (!points.length) return "0,50 100,50";
  const values = points.map((point) => point.declineIndex ?? 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, -1);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const normalized = (value - min) / range;
      const y = 100 - normalized * 100;
      return `${x},${y}`;
    })
    .join(" ");
}

export function DeclineIndexChart({ points }: { points: DeclinePoint[] }) {
  const latest = points.at(-1);
  const latestValue =
    latest?.declineIndex === null || latest?.declineIndex === undefined
      ? "—"
      : latest.declineIndex.toFixed(2);
  const polyline = buildPolyline(points);
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        Índice de declive
      </p>
      <h3 className="mt-2 text-2xl font-semibold text-slate-900">Tendencia 8 semanas</h3>
      <div className="mt-6 h-48">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <linearGradient id="decline-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f87171" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="url(#decline-gradient)"
            strokeWidth="2"
            strokeLinecap="round"
            points={polyline}
          />
        </svg>
      </div>
      <p className="text-sm text-slate-500">
        {latest ? `Semana del ${latest.weekStart}: ${latestValue}` : "Sin datos de tendencia"}
      </p>
    </article>
  );
}
