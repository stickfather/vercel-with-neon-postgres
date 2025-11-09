import type { DaysSinceProgressData } from "@/types/learning-panel";

type Props = {
  data: DaysSinceProgressData;
};

export function DaysSinceProgressCard({ data }: Props) {
  const { median_days } = data;

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Days Since Progress (Median)</h3>
      </header>
      <div className="flex flex-col gap-1">
        <div className="text-3xl font-bold text-slate-900">
          {median_days}
        </div>
        <p className="text-xs text-slate-500">Last completed lesson gap</p>
      </div>
      <figcaption className="sr-only">
        Median days since students last completed a lesson (90-day window)
      </figcaption>
    </section>
  );
}
