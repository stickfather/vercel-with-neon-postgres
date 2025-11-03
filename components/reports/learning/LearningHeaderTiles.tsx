import type { TransitionPoint, TrendPoint } from "@/types/reports.learning";

const percentFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("es-EC");

type Tone = "positive" | "negative" | "warning" | "neutral";

function getToneClasses(tone: Tone, variant: "light" | "dark") {
  if (variant === "dark") {
    switch (tone) {
      case "positive":
        return "border-emerald-500/40 bg-emerald-500/20 text-emerald-100";
      case "negative":
        return "border-rose-500/40 bg-rose-500/20 text-rose-100";
      case "warning":
        return "border-amber-500/40 bg-amber-500/20 text-amber-100";
      default:
        return "border-slate-800/60 bg-slate-900/70 text-slate-100";
    }
  }

  switch (tone) {
    case "positive":
      return "border-emerald-200/70 bg-emerald-50 text-emerald-700";
    case "negative":
      return "border-rose-200/70 bg-rose-50 text-rose-700";
    case "warning":
      return "border-amber-200/70 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200/70 bg-white text-slate-800";
  }
}

type SparklineProps = {
  values: number[];
  tone: Tone;
  variant: "light" | "dark";
};

function Sparkline({ values, tone, variant }: SparklineProps) {
  if (!values.length) {
    return null;
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const stroke = (() => {
    if (variant === "dark") {
      if (tone === "positive") return "#34d399";
      if (tone === "negative") return "#fb7185";
      if (tone === "warning") return "#fbbf24";
      return "#94a3b8";
    }
    if (tone === "positive") return "#047857";
    if (tone === "negative") return "#be123c";
    if (tone === "warning") return "#b45309";
    return "#1e293b";
  })();

  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-10 w-full">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

type Props = {
  leiTrend: TrendPoint[];
  leiTrendPctChange: number;
  transitionsTotal: number;
  transitionsSeries: TransitionPoint[];
  daysSinceMedian: number;
  atRiskCount: number;
  variant?: "light" | "dark";
};

export function LearningHeaderTiles({
  leiTrend,
  leiTrendPctChange,
  transitionsTotal,
  transitionsSeries,
  daysSinceMedian,
  atRiskCount,
  variant = "light",
}: Props) {
  const leiTone = leiTrendPctChange >= 0 ? "positive" : "negative";
  const riskTone = atRiskCount > 0 ? "warning" : "neutral";

  const leiSparkValues = leiTrend.slice(-30).map((point) => Number(point.median_lei ?? 0));
  const transitionSpark = transitionsSeries.map((point) => Number(point.n ?? 0));

  const isDark = variant === "dark";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const primaryText = isDark ? "text-slate-100" : "text-slate-900";
  const mutedTile = isDark
    ? "rounded-2xl border border-slate-800/60 bg-slate-900/70 p-5 shadow-sm text-slate-100"
    : "rounded-2xl border border-slate-200/70 bg-white/95 p-5 shadow-sm text-slate-800";
  const hintText = "text-slate-400";

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article
        className={`flex flex-col gap-3 rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${getToneClasses(leiTone, variant)}`}
      >
        <header className="flex items-center justify-between">
          <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${secondaryText}`}>
            Tendencia de eficiencia (LEI)
          </span>
          <span title="Promedio de eficiencia (lecciones por hora) vs. período previo." className={`text-xs ${hintText}`}>
            ℹ
          </span>
        </header>
        <div className={`flex items-baseline gap-2 text-3xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
          <span>{leiTrendPctChange >= 0 ? "↑" : "↓"}</span>
          <span>{percentFormatter.format(Math.abs(leiTrendPctChange))}%</span>
        </div>
        <Sparkline values={leiSparkValues} tone={leiTone} variant={variant} />
      </article>

      <article className={`flex flex-col gap-3 ${mutedTile} transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
        <header className="flex items-center justify-between">
          <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${secondaryText}`}>
            Transiciones de nivel (30 días)
          </span>
          <span title="Alumnos que subieron de nivel en 30 días." className={`text-xs ${hintText}`}>
            ℹ
          </span>
        </header>
        <div className={`text-3xl font-semibold ${primaryText}`}>{integerFormatter.format(transitionsTotal)}</div>
        <Sparkline values={transitionSpark} tone="neutral" variant={variant} />
      </article>

      <article className={`flex flex-col gap-3 ${mutedTile} transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
        <header className="flex items-center justify-between">
          <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${secondaryText}`}>
            Mediana de días sin progreso
          </span>
          <span title="Días desde la última lección completada (mediana)." className={`text-xs ${hintText}`}>
            ℹ
          </span>
        </header>
        <div className={`text-3xl font-semibold ${primaryText}`}>{decimalFormatter.format(daysSinceMedian)} d</div>
        <div className={`h-10 text-sm ${secondaryText}`}>Medición global considerando todos los niveles.</div>
      </article>

      <article
        className={`flex flex-col gap-3 rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${getToneClasses(riskTone, variant)}`}
      >
        <header className="flex items-center justify-between">
          <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${secondaryText}`}>
            Alumnos en riesgo
          </span>
          <span title="LEI bajo + señales de estancamiento/inactividad." className={`text-xs ${hintText}`}>
            ℹ
          </span>
        </header>
        <div className={`text-3xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
          {integerFormatter.format(atRiskCount)}
        </div>
        <div className={`h-10 text-sm ${secondaryText}`}>
          {atRiskCount > 0 ? "Revisar y priorizar seguimiento." : "Sin alertas activas."}
        </div>
      </article>
    </section>
  );
}
