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

function getToneClasses(tone: "positive" | "negative" | "warning" | "neutral") {
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
  tone: "positive" | "negative" | "warning" | "neutral";
};

function Sparkline({ values, tone }: SparklineProps) {
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

  const stroke =
    tone === "positive"
      ? "#047857"
      : tone === "negative"
        ? "#be123c"
        : tone === "warning"
          ? "#b45309"
          : "#1e293b";

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
};

export function LearningHeaderTiles({
  leiTrend,
  leiTrendPctChange,
  transitionsTotal,
  transitionsSeries,
  daysSinceMedian,
  atRiskCount,
}: Props) {
  const leiTone = leiTrendPctChange >= 0 ? "positive" : "negative";
  const riskTone = atRiskCount > 0 ? "warning" : "neutral";

  const leiSparkValues = leiTrend.slice(-30).map((point) => Number(point.median_lei ?? 0));
  const transitionSpark = transitionsSeries.map((point) => Number(point.n ?? 0));

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article className={`flex flex-col gap-3 rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${getToneClasses(leiTone)}`}>
        <header className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Tendencia de eficiencia (LEI)
          </span>
          <span title="Promedio de eficiencia (lecciones por hora) vs. período previo." className="text-xs text-slate-400">
            ℹ
          </span>
        </header>
        <div className="flex items-baseline gap-2 text-3xl font-semibold">
          <span>{leiTrendPctChange >= 0 ? "↑" : "↓"}</span>
          <span>{percentFormatter.format(Math.abs(leiTrendPctChange))}%</span>
        </div>
        <Sparkline values={leiSparkValues} tone={leiTone} />
      </article>

      <article className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/95 p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <header className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Transiciones de nivel (30 días)
          </span>
          <span title="Alumnos que subieron de nivel en 30 días." className="text-xs text-slate-400">
            ℹ
          </span>
        </header>
        <div className="text-3xl font-semibold text-slate-900">{integerFormatter.format(transitionsTotal)}</div>
        <Sparkline values={transitionSpark} tone="neutral" />
      </article>

      <article className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/95 p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <header className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Mediana de días sin progreso
          </span>
          <span title="Días desde la última lección completada (mediana)." className="text-xs text-slate-400">
            ℹ
          </span>
        </header>
        <div className="text-3xl font-semibold text-slate-900">{decimalFormatter.format(daysSinceMedian)} d</div>
        <div className="h-10 text-sm text-slate-400">Medición global considerando todos los niveles.</div>
      </article>

      <article className={`flex flex-col gap-3 rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${getToneClasses(riskTone)}`}>
        <header className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Alumnos en riesgo
          </span>
          <span title="LEI bajo + señales de estancamiento/inactividad." className="text-xs text-slate-400">
            ℹ
          </span>
        </header>
        <div className="text-3xl font-semibold">{integerFormatter.format(atRiskCount)}</div>
        <div className="h-10 text-sm text-slate-500">
          {atRiskCount > 0 ? "Revisar y priorizar seguimiento." : "Sin alertas activas."}
        </div>
      </article>
    </section>
  );
}
