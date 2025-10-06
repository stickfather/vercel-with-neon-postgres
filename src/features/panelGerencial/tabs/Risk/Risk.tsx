import type { ReactNode } from "react";
import Link from "next/link";
import ErrorState from "../../ErrorState";
import {
  atRiskTop,
  onpaceByLevel,
  type AtRiskRow,
  type OnpaceByLevelRow,
} from "../../data/risk.read";
import RiskTable from "./RiskTable.client";

const percentFormatter = new Intl.NumberFormat("es-EC", {
  style: "percent",
  maximumFractionDigits: 1,
});

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  const normalized = value > 1 ? value / 100 : value;
  return percentFormatter.format(normalized);
}

function EmptyState() {
  return (
    <p className="rounded-2xl border border-dashed border-brand-ink/20 bg-white/80 px-4 py-10 text-center text-sm text-brand-ink-muted">
      Sin datos disponibles.
    </p>
  );
}

function ChartContainer({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-brand-ink/5 bg-white/95 p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-brand-deep">{title}</h3>
        {description ? <p className="text-sm text-brand-ink-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

type RiskPanelProps = {
  selectedLevel?: string | null;
  selectedBand?: string | null;
};

export default async function RiskPanel({ selectedLevel, selectedBand }: RiskPanelProps) {
  try {
    const [atRisk, onpace] = (await Promise.all([atRiskTop(), onpaceByLevel()])) as [
      AtRiskRow[],
      OnpaceByLevelRow[],
    ];

    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-brand-deep">Riesgo &amp; retención</h2>
          <p className="text-sm text-brand-ink-muted">Priorización de alumnos por riesgo y contexto por nivel.</p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <ChartContainer
            title="Top en riesgo"
            description="Ordenado por score de riesgo (descendente)"
          >
            {atRisk.length ? (
              <RiskTable
                rows={atRisk}
                initialLevel={selectedLevel ?? undefined}
                initialBand={selectedBand ?? undefined}
              />
            ) : (
              <EmptyState />
            )}
          </ChartContainer>

          <ChartContainer
            title="En ritmo por nivel"
            description="Porcentaje de alumnos en ritmo según nivel actual"
          >
            {onpace.length ? (
              <OnpaceContext
                rows={onpace}
                selectedLevel={selectedLevel ?? undefined}
                selectedBand={selectedBand ?? undefined}
              />
            ) : (
              <EmptyState />
            )}
          </ChartContainer>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error al cargar riesgo y retención", error);
    return <ErrorState retryHref="/panel-gerencial/risk" />;
  }
}

function OnpaceContext({
  rows,
  selectedLevel,
  selectedBand,
}: {
  rows: OnpaceByLevelRow[];
  selectedLevel?: string;
  selectedBand?: string;
}) {
  const filtered = rows.filter((row) => row.level_code);
  if (!filtered.length) return <EmptyState />;
  const sorted = [...filtered].sort((a, b) => a.level_code.localeCompare(b.level_code));
  const maxValue = Math.max(...sorted.map((row) => Number(row.onpace_pct ?? 0)), 0);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((row) => {
        const percent = row.onpace_pct ?? 0;
        const heightPercent = maxValue === 0 ? 0 : (percent / maxValue) * 100;
        const isSelected = selectedLevel && row.level_code === selectedLevel;
        const query = new URLSearchParams();
        query.set("level", row.level_code);
        if (selectedBand) {
          query.set("band", selectedBand);
        }
        return (
          <Link
            key={row.level_code}
            href={`/panel-gerencial/risk?${query.toString()}`}
            className={`group flex flex-col gap-1 rounded-2xl border border-transparent p-3 transition ${
              isSelected ? "border-brand-deep/40 bg-brand-deep/5" : "hover:bg-brand-ink/5"
            }`}
          >
            <div className="flex items-center justify-between text-sm font-semibold text-brand-deep">
              <span>{row.level_code}</span>
              <span>{formatPercent(percent)}</span>
            </div>
            <div className="relative flex h-12 items-end overflow-hidden rounded-xl bg-brand-teal-soft/20">
              <span
                className={`absolute bottom-0 left-0 right-0 bg-brand-teal transition group-hover:bg-brand-deep ${
                  isSelected ? "!bg-brand-deep" : ""
                }`}
                style={{ height: `${Math.max(heightPercent, 6)}%` }}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
