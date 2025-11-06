import type { CollectionsPoint } from "@/types/reports.finance";

const currencyFormatter = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Props = {
  data: CollectionsPoint[];
  variant?: "light" | "dark";
};

export function CollectionsTrendCard({ data, variant = "light" }: Props) {
  const isDark = variant === "dark";
  const cardClasses = isDark
    ? "rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm";
  const titleClasses = isDark ? "text-slate-100" : "text-slate-900";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const hintText = "text-slate-400";

  if (!data.length) {
    const emptyClasses = isDark
      ? "flex h-64 items-center justify-center text-slate-400"
      : "flex h-64 items-center justify-center text-slate-500";
    return (
      <section className={cardClasses}>
        <header className="mb-4 flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${titleClasses}`}>Tendencia de cobranzas (30 días)</h3>
          <span title="Monto cobrado por día en los últimos 30 días." className={`text-xs ${hintText}`}>
            ℹ
          </span>
        </header>
        <div className={emptyClasses}>Sin cobranzas en los últimos 30 días</div>
      </section>
    );
  }

  const maxAmount = Math.max(...data.map((p) => p.amount), 1);
  const lineColor = "#10b981"; // green
  const gridColor = isDark ? "#334155" : "#e2e8f0";

  return (
    <section className={cardClasses}>
      <header className="mb-4 flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${titleClasses}`}>Tendencia de cobranzas (30 días)</h3>
        <span title="Monto cobrado por día en los últimos 30 días." className={`text-xs ${hintText}`}>
          ℹ
        </span>
      </header>

      <div className="relative" style={{ height: "300px" }}>
        <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y = (i / 4) * 300;
            return <line key={`grid-${i}`} x1="0" y1={y} x2="800" y2={y} stroke={gridColor} strokeWidth="1" strokeDasharray="4 4" />;
          })}

          {/* Line chart */}
          <polyline
            fill="none"
            stroke={lineColor}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={data
              .map((p, i) => {
                const x = (i / Math.max(1, data.length - 1)) * 800;
                const y = 300 - (p.amount / maxAmount) * 280;
                return `${x},${y}`;
              })
              .join(" ")}
          />

          {/* Area fill */}
          <polygon
            fill={lineColor}
            fillOpacity="0.1"
            points={
              data
                .map((p, i) => {
                  const x = (i / Math.max(1, data.length - 1)) * 800;
                  const y = 300 - (p.amount / maxAmount) * 280;
                  return `${x},${y}`;
                })
                .join(" ") +
              ` 800,300 0,300`
            }
          />
        </svg>

        <div className={`mt-2 text-xs ${secondaryText} text-center`}>
          {data.length > 0 && `${data[0].d} → ${data[data.length - 1].d}`}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: gridColor }}>
        <div>
          <div className={`text-xs uppercase tracking-wider ${secondaryText}`}>Total cobrado</div>
          <div className={`text-xl font-semibold ${titleClasses}`}>
            {currencyFormatter.format(data.reduce((sum, p) => sum + p.amount, 0))}
          </div>
        </div>
        <div>
          <div className={`text-xs uppercase tracking-wider ${secondaryText}`}>Promedio diario</div>
          <div className={`text-xl font-semibold ${titleClasses}`}>
            {currencyFormatter.format(data.reduce((sum, p) => sum + p.amount, 0) / data.length)}
          </div>
        </div>
      </div>
    </section>
  );
}
