import type { PersonnelKpiSnapshot } from "@/types/personnel";

type KpiStripProps = {
  kpiSnapshot: PersonnelKpiSnapshot;
};

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}×`;
}

export function KpiStrip({ kpiSnapshot }: KpiStripProps) {
  const { bestCoveredHour, worstLoadHour, hoursAtRisk } = kpiSnapshot;

  return (
    <figure>
      <figcaption className="sr-only">
        At a glance snapshot showing best covered hour, worst load hour, and
        hours at risk with load ratio above 3.0×
      </figcaption>
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Best Covered Hour */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Best Covered Hour
          </span>
          <div className="flex items-baseline gap-2">
            {bestCoveredHour ? (
              <>
                <span className="text-2xl font-black text-slate-900">
                  {formatHour(bestCoveredHour.hour)}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                  {formatRatio(bestCoveredHour.ratio)}
                </span>
              </>
            ) : (
              <span className="text-2xl font-black text-slate-400">—</span>
            )}
          </div>
          <p className="text-xs text-slate-600">
            Hour with the lowest teacher load ratio
          </p>
        </div>

        {/* Worst Load Hour */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Worst Load Hour
          </span>
          <div className="flex items-baseline gap-2">
            {worstLoadHour ? (
              <>
                <span className="text-2xl font-black text-slate-900">
                  {formatHour(worstLoadHour.hour)}
                </span>
                <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">
                  {formatRatio(worstLoadHour.ratio)}
                </span>
              </>
            ) : (
              <span className="text-2xl font-black text-slate-400">—</span>
            )}
          </div>
          <p className="text-xs text-slate-600">
            Hour with the highest teacher load ratio
          </p>
        </div>

        {/* Hours at Risk */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Hours at Risk (&gt;3×)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {hoursAtRisk.toLocaleString("en-US")}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                hoursAtRisk === 0
                  ? "bg-emerald-100 text-emerald-700"
                  : hoursAtRisk <= 2
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
              }`}
            >
              {hoursAtRisk === 0
                ? "None"
                : hoursAtRisk === 1
                  ? "1 hour"
                  : `${hoursAtRisk} hours`}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Hours with load ratio above 3.0×
          </p>
        </div>
      </div>
    </figure>
  );
}
