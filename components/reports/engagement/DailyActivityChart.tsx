import type { DailyActivityPoint } from "@/types/reports.engagement";

const integerFormatter = new Intl.NumberFormat("es-EC");
const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

type Props = {
  data: DailyActivityPoint[];
  variant?: "light" | "dark";
};

export function DailyActivityChart({ data, variant = "light" }: Props) {
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
          <h3 className={`text-lg font-semibold ${titleClasses}`}>Actividad diaria: alumnos activos y minutos</h3>
          <span title="Tendencia diaria de alumnos únicos y minutos totales." className={`text-xs ${hintText}`}>
            ℹ
          </span>
        </header>
        <div className={emptyClasses}>No hay datos de actividad diaria disponibles.</div>
      </section>
    );
  }

  const maxStudents = Math.max(...data.map((p) => p.active_students), 1);
  const maxMinutes = Math.max(...data.map((p) => p.total_minutes), 1);

  const studentsColor = "#3b82f6"; // blue
  const minutesColor = "#10b981"; // green
  const gridColor = isDark ? "#334155" : "#e2e8f0";

  return (
    <section className={cardClasses}>
      <header className="mb-4 flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${titleClasses}`}>Actividad diaria: alumnos activos y minutos</h3>
        <span title="Tendencia diaria de alumnos únicos y minutos totales." className={`text-xs ${hintText}`}>
          ℹ
        </span>
      </header>

      <div className="mb-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: studentsColor }}></div>
          <span className={secondaryText}>Alumnos activos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: minutesColor }}></div>
          <span className={secondaryText}>Minutos totales</span>
        </div>
      </div>

      <div className="relative" style={{ height: "300px" }}>
        <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y = (i / 4) * 300;
            return <line key={`grid-${i}`} x1="0" y1={y} x2="800" y2={y} stroke={gridColor} strokeWidth="1" strokeDasharray="4 4" />;
          })}

          {/* Students line */}
          <polyline
            fill="none"
            stroke={studentsColor}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={data
              .map((p, i) => {
                const x = (i / Math.max(1, data.length - 1)) * 800;
                const y = 300 - (p.active_students / maxStudents) * 280;
                return `${x},${y}`;
              })
              .join(" ")}
          />

          {/* Minutes line */}
          <polyline
            fill="none"
            stroke={minutesColor}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={data
              .map((p, i) => {
                const x = (i / Math.max(1, data.length - 1)) * 800;
                const y = 300 - (p.total_minutes / maxMinutes) * 280;
                return `${x},${y}`;
              })
              .join(" ")}
          />
        </svg>

        <div className={`mt-2 text-xs ${secondaryText} text-center`}>
          {data.length > 0 && `${data[0].d} → ${data[data.length - 1].d}`}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: gridColor }}>
        <div>
          <div className={`text-xs uppercase tracking-wider ${secondaryText}`}>Alumnos promedio</div>
          <div className={`text-xl font-semibold ${titleClasses}`}>
            {integerFormatter.format(Math.round(data.reduce((sum, p) => sum + p.active_students, 0) / data.length))}
          </div>
        </div>
        <div>
          <div className={`text-xs uppercase tracking-wider ${secondaryText}`}>Minutos promedio</div>
          <div className={`text-xl font-semibold ${titleClasses}`}>
            {decimalFormatter.format(data.reduce((sum, p) => sum + p.total_minutes, 0) / data.length)}
          </div>
        </div>
      </div>
    </section>
  );
}
