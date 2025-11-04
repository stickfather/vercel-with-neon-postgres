import type { AvgBetweenVisitsRow } from "@/types/reports.engagement";

const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Props = {
  global: number;
  perLevel: AvgBetweenVisitsRow[];
  variant?: "light" | "dark";
};

export function AvgBetweenVisitsCard({ global, perLevel, variant = "light" }: Props) {
  const isDark = variant === "dark";
  const cardClasses = isDark
    ? "rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm";
  const titleClasses = isDark ? "text-slate-100" : "text-slate-900";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const hintText = "text-slate-400";

  const tone = global > 12 ? "warning" : "neutral";
  const valueColor = tone === "warning" ? (isDark ? "text-amber-400" : "text-amber-600") : titleClasses;

  return (
    <section className={cardClasses}>
      <header className="mb-4 flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${titleClasses}`}>Promedio de días entre visitas</h3>
        <span title="Mayor número = menor frecuencia de visitas." className={`text-xs ${hintText}`}>
          ℹ
        </span>
      </header>

      <div className="mb-6">
        <div className={`text-xs uppercase tracking-wider ${secondaryText} mb-2`}>Global</div>
        <div className={`text-4xl font-bold ${valueColor}`}>{decimalFormatter.format(global)}</div>
        <div className={`text-sm ${secondaryText} mt-1`}>días promedio</div>
      </div>

      {perLevel.length > 0 && (
        <>
          <div className={`border-t pt-4`} style={{ borderColor: isDark ? "#334155" : "#e2e8f0" }}>
            <div className={`text-xs uppercase tracking-wider ${secondaryText} mb-3`}>Por nivel</div>
            <div className="space-y-2">
              {perLevel.map((row) => {
                const maxGap = Math.max(...perLevel.map((r) => r.avg_days_between_visits), 1);
                const widthPct = (row.avg_days_between_visits / maxGap) * 100;
                return (
                  <div key={row.level} className="flex items-center gap-3">
                    <div className={`w-20 text-sm font-medium ${secondaryText}`}>{row.level ?? "N/A"}</div>
                    <div className="flex-1">
                      <div className="relative h-6 rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-end pr-2"
                          style={{ width: `${widthPct}%` }}
                        >
                          <span className="text-xs font-semibold text-white">
                            {decimalFormatter.format(row.avg_days_between_visits)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
