import type { VelocityLevelCard } from "@/types/reports.learning";

const numberFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Props = {
  cards: VelocityLevelCard[];
};

export function VelocityCards({ cards }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-4 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Velocidad por nivel</p>
        <h3 className="text-xl font-semibold text-slate-900">Lecciones completadas por semana</h3>
      </header>
      {!cards.length ? (
        <div className="flex h-32 items-center justify-center text-sm text-slate-500">
          No tenemos datos suficientes para calcular la velocidad.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <article key={card.level} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Nivel</p>
                  <p className="text-xl font-bold text-slate-900">{card.level}</p>
                </div>
                <TrendBadge trend={card.trend} />
              </div>
              <p className="mt-4 text-3xl font-semibold text-slate-900">
                {numberFormatter.format(card.lessonsPerWeek)}
                <span className="ml-2 text-sm font-medium text-slate-500">lecc/sem</span>
              </p>
              <Sparkline values={card.sparkline.map((point) => point.lessons)} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

type TrendProps = { trend: VelocityLevelCard["trend"]; };

function TrendBadge({ trend }: TrendProps) {
  if (trend === "up") return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">↗ Consistente</span>;
  if (trend === "down") return <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">↘ Riesgo</span>;
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">→ Estable</span>;
}

type SparklineProps = {
  values: number[];
};

function Sparkline({ values }: SparklineProps) {
  if (!values.length) return null;
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

  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-4 h-16 w-full">
      <polyline
        fill="none"
        stroke="#0f172a"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
