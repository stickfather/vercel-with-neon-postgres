import type { HourSplitRow } from "@/types/reports.engagement";
import { HOUR_SPLIT_LABELS } from "@/src/features/reports/engagement/constants";

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  rows: HourSplitRow[];
  variant?: "light" | "dark";
};

export function HourSplitCard({ rows, variant = "light" }: Props) {
  const isDark = variant === "dark";
  const cardClasses = isDark
    ? "rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm";
  const titleClasses = isDark ? "text-slate-100" : "text-slate-900";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const hintText = "text-slate-400";

  const totalMinutes = rows.reduce((sum, row) => sum + row.total_minutes, 0);

  const colors: Record<string, string> = {
    morning_08_12: "#3b82f6",
    afternoon_12_17: "#10b981",
    evening_17_20: "#f59e0b",
  };

  return (
    <section className={cardClasses}>
      <header className="mb-4 flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${titleClasses}`}>Distribución por franja horaria (08–20)</h3>
        <span title="Minutos totales por mañana, tarde y noche." className={`text-xs ${hintText}`}>
          ℹ
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rows.map((row) => {
          const percentage = totalMinutes > 0 ? (row.total_minutes / totalMinutes) * 100 : 0;
          const label = HOUR_SPLIT_LABELS[row.daypart] ?? row.daypart;
          const color = colors[row.daypart] ?? "#64748b";

          return (
            <div key={row.daypart} className="flex flex-col items-center gap-2">
              <div
                className="w-full h-32 rounded-lg flex flex-col items-center justify-center text-white shadow-md"
                style={{ backgroundColor: color }}
              >
                <div className="text-3xl font-bold">{integerFormatter.format(row.total_minutes)}</div>
                <div className="text-xs uppercase tracking-wider opacity-90">minutos</div>
              </div>
              <div className={`text-sm font-medium ${titleClasses}`}>{label}</div>
              <div className={`text-xs ${secondaryText}`}>{percentage.toFixed(1)}% del total</div>
            </div>
          );
        })}
      </div>

      <div className={`mt-6 pt-4 border-t text-sm ${secondaryText} text-center`} style={{ borderColor: isDark ? "#334155" : "#e2e8f0" }}>
        Total de minutos: {integerFormatter.format(totalMinutes)}
      </div>
    </section>
  );
}
