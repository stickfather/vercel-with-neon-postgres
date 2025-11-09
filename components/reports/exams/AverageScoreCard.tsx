import type { ExamAverageScore90d } from "@/types/exams";

type Props = {
  data: ExamAverageScore90d | null;
};

export function AverageScoreCard({ data }: Props) {
  const score = data?.average_score_90d ?? null;

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
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-sky-600"
              style={{ width: `${Math.min(100, score)}%` }}
            />
          </div>
        )}
        <p className="text-xs text-slate-500">De 100</p>
      </div>
    </section>
  );
}
