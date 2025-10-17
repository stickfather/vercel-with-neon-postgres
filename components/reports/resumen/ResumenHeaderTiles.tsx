import type { GenHeader } from "@/types/reports.resumen";

const numberFormatter = new Intl.NumberFormat("es-EC");
const percentFormatter = new Intl.NumberFormat("es-EC", {
  style: "percent",
  maximumFractionDigits: 1,
});
const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const hoursFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return numberFormatter.format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const normalized = value > 1 ? value / 100 : value;
  return percentFormatter.format(normalized);
}

function formatMinutes(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${decimalFormatter.format(value)} min`;
}

function formatHours(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${hoursFormatter.format(value)} h`;
}

function getOnPaceClass(value: number | null | undefined) {
  if (value === null || value === undefined) return "text-brand-ink";
  const pct = value > 1 ? value / 100 : value;
  if (pct >= 0.7) return "text-emerald-600";
  if (pct >= 0.5) return "text-amber-500";
  return "text-rose-500";
}

type TileKey = keyof GenHeader;

type TileConfig = {
  key: TileKey;
  label: string;
  format: (value: number | null) => string;
  valueClass?: (value: number | null) => string;
};

const tiles: TileConfig[] = [
  {
    key: "students_total",
    label: "Estudiantes totales",
    format: formatNumber,
  },
  {
    key: "active_7d",
    label: "Activos (7 días)",
    format: formatNumber,
  },
  {
    key: "active_30d",
    label: "Activos (30 días)",
    format: formatNumber,
  },
  {
    key: "new_30d",
    label: "Nuevos (30 días)",
    format: formatNumber,
  },
  {
    key: "returning_30d",
    label: "Retornantes (30 días)",
    format: formatNumber,
  },
  {
    key: "pct_on_pace",
    label: "% en ritmo (plan)",
    format: formatPercent,
    valueClass: getOnPaceClass,
  },
  {
    key: "median_session_minutes_30d",
    label: "Mediana min/sesión (30 d)",
    format: formatMinutes,
  },
  {
    key: "avg_study_hours_per_student_30d",
    label: "Horas promedio por estudiante (30 d)",
    format: formatHours,
  },
];

type Props = {
  header: GenHeader | null;
};

export function ResumenHeaderTiles({ header }: Props) {
  return (
    <section aria-label="Indicadores principales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => {
        const value = header ? header[tile.key] : null;
        const formatted = tile.format(value as number | null);
        const valueClass = tile.valueClass ? tile.valueClass(value as number | null) : "text-brand-deep";
        return (
          <article
            key={tile.key}
            className="flex flex-col gap-2 rounded-2xl border border-slate-200/60 bg-white/95 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md md:p-6"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{tile.label}</span>
            <span className={`text-2xl font-semibold md:text-3xl ${valueClass}`}>{formatted}</span>
          </article>
        );
      })}
    </section>
  );
}
