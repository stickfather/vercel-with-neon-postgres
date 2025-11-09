import type { DaypartRetention } from "@/types/reports.engagement";

const percentFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Props = {
  data: DaypartRetention[];
};

const daypartLabels: Record<DaypartRetention["daypart"], string> = {
  morning_08_12: "Mañana (08–12)",
  afternoon_12_17: "Tarde (12–17)",
  evening_17_20: "Noche (17–20)",
};

const daypartColors: Record<DaypartRetention["daypart"], string> = {
  morning_08_12: "bg-amber-50 border-amber-300",
  afternoon_12_17: "bg-sky-50 border-sky-300",
  evening_17_20: "bg-purple-50 border-purple-300",
};

export function DaypartRetentionCard({ data }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          Time of Day Return Rate
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          % de alumnos que repiten franja en 30 días
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {data.map((item) => {
          const returnPercent = item.return_rate * 100;
          return (
            <article
              key={item.daypart}
              className={`flex flex-col gap-3 rounded-xl border-2 p-4 ${daypartColors[item.daypart]}`}
            >
              <div className="text-sm font-semibold text-slate-700">
                {daypartLabels[item.daypart]}
              </div>
              <div className="text-3xl font-semibold text-slate-900">
                {percentFormatter.format(returnPercent)}%
              </div>
              <div className="text-xs text-slate-500">
                Tasa de retorno
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
