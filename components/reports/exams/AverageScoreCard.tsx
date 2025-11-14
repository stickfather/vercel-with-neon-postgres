type Props = {
  avgScore: number | null;
  sparkline?: number[];
};

export function AverageScoreCard({ avgScore, sparkline }: Props) {
  const score = avgScore ?? null;
  const sparklinePoints = (sparkline ?? [])
    .filter((point): point is number => typeof point === "number" && Number.isFinite(point))
    .slice(-8);

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Puntuación Promedio (90d)
        </h3>
      </header>
      <div className="flex flex-col gap-2">
        <div className="text-3xl font-bold text-slate-900">
          {score !== null ? score.toFixed(1) : "—"}
        </div>
        {score !== null && (
          <>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-sky-600"
                style={{ width: `${Math.min(100, score)}%` }}
              />
            </div>
            {sparklinePoints.length > 1 && (
              <div className="mt-3 flex h-12 items-end gap-1">
                {sparklinePoints.map((value, index) => {
                  const normalized = Math.max(0, Math.min(100, value ?? 0));
                  return (
                    <div
                      key={`${value}-${index}`}
                      className="flex-1 rounded-full bg-sky-100"
                      style={{ height: `${(normalized / 100) * 100}%`, minHeight: "8px" }}
                      title={`${value.toFixed(1)} pts`}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
        <p className="text-xs text-slate-500">De 100</p>
      </div>
    </section>
  );
}
