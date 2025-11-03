import type { LearningReport, SpeedBucketRow } from "@/types/reports.learning";

const numberFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const percentileFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const DONUT_COLORS = {
  fast: "#059669",
  typical: "#0ea5e9",
  slow: "#f97316",
} as const;

type Props = {
  buckets: LearningReport["speed_buckets"];
};

function formatLei(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return numberFormatter.format(value);
}

function formatDays(value: unknown) {
  if (value === null || value === undefined) return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return `${Math.round(parsed)} d`;
}

function sortBucket(rows: SpeedBucketRow[]) {
  return [...rows].sort((a, b) => (b.lei_30d_plan ?? 0) - (a.lei_30d_plan ?? 0));
}

export function SpeedBuckets({ buckets }: Props) {
  const totalRows = buckets.fast.length + buckets.typical.length + buckets.slow.length;
  if (totalRows === 0) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200/70 bg-white/95 p-6 text-center text-sm text-slate-500">
        <h3 className="text-base font-semibold text-slate-600">Ritmo de aprendizaje (Rápidos / Típicos / Lentos)</h3>
        <p>No hay datos suficientes para mostrar los grupos de velocidad.</p>
      </section>
    );
  }

  const segments = [
    { key: "fast", value: buckets.proportions.fast_pct, label: "Rápidos" },
    { key: "typical", value: buckets.proportions.typical_pct, label: "Típicos" },
    { key: "slow", value: buckets.proportions.slow_pct, label: "Lentos" },
  ] as const;

  const circumference = 2 * Math.PI * 45;
  let offset = circumference * 0.25;

  const hasDaysColumn = [buckets.fast, buckets.typical, buckets.slow].some((group) =>
    group.some((row) => {
      const enriched = row as SpeedBucketRow & { days_since_progress?: number | null };
      return "days_since_progress" in enriched && enriched.days_since_progress != null;
    }),
  );

  const groups = [
    {
      key: "fast" as const,
      title: "Rápidos (≥75%)",
      description: "Alumnos en percentil igual o superior a 75.",
      rows: sortBucket(buckets.fast),
    },
    {
      key: "typical" as const,
      title: "Típicos (25–74%)",
      description: "Alumnos en percentiles medios.",
      rows: sortBucket(buckets.typical),
    },
    {
      key: "slow" as const,
      title: "Lentos (<25%)",
      description: "Alumnos que necesitan apoyo adicional.",
      rows: sortBucket(buckets.slow),
    },
  ];

  return (
    <section className="flex h-full flex-col gap-6 rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-slate-800">
            Ritmo de aprendizaje (Rápidos / Típicos / Lentos)
          </h3>
          <p className="text-sm text-slate-500">
            Distribución de alumnos por percentil LEI reciente.
          </p>
        </div>
        <span className="text-xs text-slate-400" title="LEI reciente por percentil. Rápidos = ≥ 75%.">
          ℹ
        </span>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
        <div className="flex flex-col items-center gap-4">
          <svg viewBox="0 0 120 120" className="h-44 w-44">
            <circle cx="60" cy="60" r="45" fill="#f8fafc" />
            {segments.map((segment) => {
              const dash = (segment.value / 100) * circumference;
              const circle = (
                <circle
                  key={segment.key}
                  cx="60"
                  cy="60"
                  r="45"
                  fill="transparent"
                  stroke={DONUT_COLORS[segment.key]}
                  strokeWidth={16}
                  strokeDasharray={`${dash} ${circumference}`}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              );
              offset -= dash;
              return circle;
            })}
            <circle cx="60" cy="60" r="32" fill="white" />
            <text
              x="60"
              y="64"
              textAnchor="middle"
              className="fill-slate-700 text-lg font-semibold"
            >
              {percentileFormatter.format(buckets.proportions.fast_pct + buckets.proportions.typical_pct + buckets.proportions.slow_pct)}%
            </text>
          </svg>
          <div className="flex items-center gap-4 text-sm">
            {segments.map((segment) => (
              <div key={segment.key} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: DONUT_COLORS[segment.key] }}
                />
                <span>{segment.label}</span>
                <strong className="text-slate-800">{percentileFormatter.format(segment.value)}%</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-4">
          {groups.map((group) => (
            <details
              key={group.key}
              className="group rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm"
              open={group.key !== "typical"}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-left">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-800">{group.title}</span>
                  <span className="text-xs text-slate-500">{group.description}</span>
                </div>
                <span className="text-sm text-slate-400 transition group-open:rotate-180">⌃</span>
              </summary>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      <th className="py-2 pr-3">Nombre</th>
                      <th className="py-2 pr-3">Nivel</th>
                      <th className="py-2 pr-3">Lección</th>
                      <th className="py-2 pr-3">LEI</th>
                      {hasDaysColumn ? <th className="py-2">Días sin progreso</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80">
                    {group.rows.length === 0 ? (
                      <tr>
                        <td colSpan={hasDaysColumn ? 5 : 4} className="py-4 text-center text-xs text-slate-400">
                          Sin alumnos en este grupo.
                        </td>
                      </tr>
                    ) : (
                      group.rows.map((row) => {
                        const lessonLabel = row.current_seq != null ? `L${row.current_seq}` : "—";
                        const daysSince =
                          hasDaysColumn && "days_since_progress" in row
                            ? formatDays((row as SpeedBucketRow & { days_since_progress?: number | null }).days_since_progress)
                            : "";
                        return (
                          <tr key={`${row.student_id}-${row.speed_bucket}`} className="text-slate-700">
                            <td className="py-2 pr-3 font-medium">{row.full_name ?? "Sin nombre"}</td>
                            <td className="py-2 pr-3">{row.level ?? "—"}</td>
                            <td className="py-2 pr-3">{lessonLabel}</td>
                            <td className="py-2 pr-3">{formatLei(row.lei_30d_plan)}</td>
                            {hasDaysColumn ? <td className="py-2">{daysSince || "—"}</td> : null}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
