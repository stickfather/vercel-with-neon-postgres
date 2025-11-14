import type { HourSplitBucket } from "@/types/reports.engagement";

const LABELS: Record<HourSplitBucket["bucket"], string> = {
  Morning: "Mañana (08-11h)",
  Afternoon: "Tarde (12-16h)",
  Evening: "Noche (17-20h)",
};

function formatMinutes(minutes: number): string {
  const hours = minutes / 60;
  return `${hours.toFixed(1)} h`;
}

export function HourSplitCard({ buckets }: { buckets: HourSplitBucket[] }) {
  const totalMinutes = buckets.reduce((sum, bucket) => sum + bucket.studentMinutes, 0);
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Uso por horario</p>
      <h3 className="mt-2 text-2xl font-semibold text-slate-900">08h00 - 20h00</h3>
      <div className="mt-6 flex flex-col gap-4">
        {buckets.map((bucket) => {
          const share = totalMinutes > 0 ? bucket.studentMinutes / totalMinutes : 0;
          const width = share === 0 ? "0%" : `${Math.max(share * 100, 6)}%`;
          return (
            <div key={bucket.bucket}>
              <div className="flex items-center justify-between text-sm">
                <p className="font-semibold text-slate-900">{LABELS[bucket.bucket]}</p>
                <span className="text-slate-500">{formatMinutes(bucket.studentMinutes)}</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-slate-100">
                <div className="h-3 rounded-full bg-sky-500" style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Basado en minutos de asistencia estudiantil, incluye {totalMinutes.toLocaleString("es-EC")} minutos del último
        corte.
      </p>
    </article>
  );
}
