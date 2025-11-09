import type { ExamFirstAttemptPassRate } from "@/types/exams";

type Props = {
  data: ExamFirstAttemptPassRate;
};

export function FirstAttemptPassCard({ data }: Props) {
  const rate = data.first_attempt_pass_rate;
  const percentage = rate !== null ? rate * 100 : null;

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          First-Attempt Pass (90d)
        </h3>
      </header>
      <div className="flex flex-col gap-1">
        <div className="text-3xl font-bold text-slate-900">
          {percentage !== null ? `${percentage.toFixed(1)}%` : "—"}
        </div>
        <p className="text-xs text-slate-500">
          Earliest attempt per student × type × level
        </p>
      </div>
    </section>
  );
}
