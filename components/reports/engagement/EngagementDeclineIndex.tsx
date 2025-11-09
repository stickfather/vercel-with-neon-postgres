import type { WoWIndex } from "@/types/reports.engagement";

const integerFormatter = new Intl.NumberFormat("es-EC");
const percentFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Props = {
  wowIndex: WoWIndex;
};

function getDeltaSymbol(change: number | null): string {
  if (change === null) return "—";
  if (change > 0) return "▲";
  if (change < 0) return "▼";
  return "—";
}

function getDeltaColor(change: number | null): string {
  if (change === null) return "text-slate-500";
  if (change > 0) return "text-emerald-600";
  if (change < 0) return "text-rose-600";
  return "text-slate-500";
}

export function EngagementDeclineIndex({ wowIndex }: Props) {
  const studentsDelta = wowIndex.active_students_wow_change;
  const minutesDelta = wowIndex.total_minutes_wow_change;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Active Students 7d */}
      <article className="flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white/95 p-5 shadow-sm">
        <header>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Alumnos activos (7d)
          </span>
        </header>
        
        <div className="flex items-baseline gap-3">
          <div className="text-3xl font-semibold text-slate-900">
            {integerFormatter.format(wowIndex.active_students_7d)}
          </div>
          {studentsDelta !== null && (
            <div className={`flex items-center gap-1 text-sm font-medium ${getDeltaColor(studentsDelta)}`}>
              <span>{getDeltaSymbol(studentsDelta)}</span>
              <span>{percentFormatter.format(Math.abs(studentsDelta * 100))}%</span>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500">
          vs 7d previos (prev: {integerFormatter.format(wowIndex.active_students_prev7d)})
        </div>
      </article>

      {/* Minutes 7d */}
      <article className="flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white/95 p-5 shadow-sm">
        <header>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Minutos (7d)
          </span>
        </header>
        
        <div className="flex items-baseline gap-3">
          <div className="text-3xl font-semibold text-slate-900">
            {integerFormatter.format(wowIndex.total_minutes_7d)}
          </div>
          {minutesDelta !== null && (
            <div className={`flex items-center gap-1 text-sm font-medium ${getDeltaColor(minutesDelta)}`}>
              <span>{getDeltaSymbol(minutesDelta)}</span>
              <span>{percentFormatter.format(Math.abs(minutesDelta * 100))}%</span>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500">
          vs 7d previos (prev: {integerFormatter.format(wowIndex.total_minutes_prev7d)})
        </div>
      </article>
    </section>
  );
}
