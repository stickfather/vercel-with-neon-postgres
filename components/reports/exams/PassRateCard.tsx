import type { ExamPassRate90d } from "@/types/exams";

type Props = {
  data: ExamPassRate90d | null;
};

export function PassRateCard({ data }: Props) {
  const passRate = data?.pass_rate_90d ?? null;
  const percentage = passRate !== null ? passRate * 100 : null;

  // Color logic: >=70% emerald, 50-69% amber, <50% rose
  let valueColorClass = "text-slate-600";
  if (percentage !== null) {
    if (percentage >= 70) {
      valueColorClass = "text-emerald-600";
    } else if (percentage >= 50) {
      valueColorClass = "text-amber-600";
    } else {
      valueColorClass = "text-rose-600";
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Pass Rate (90d)
        </h3>
      </header>
      <div className="flex flex-col gap-1">
        <div className={`text-3xl font-bold ${valueColorClass}`}>
          {percentage !== null ? `${percentage.toFixed(1)}%` : "—"}
        </div>
        <p className="text-xs text-slate-500">Last 90 days</p>
      </div>
    </section>
  );
}
