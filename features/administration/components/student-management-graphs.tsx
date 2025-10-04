import type { FlagKey } from "./student-management-table";

type StateGraphItem = {
  key: string;
  label: string;
  count: number;
  percentage: number;
  selected: boolean;
};

type FlagGraphItem = {
  key: FlagKey;
  label: string;
  count: number;
  percentage: number;
  selected: boolean;
};

type Props = {
  totalStudents: number;
  filteredStudents: number;
  stateData: StateGraphItem[];
  flagData: FlagGraphItem[];
  onToggleState: (key: string) => void;
  onToggleFlag: (key: FlagKey) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
};

function GraphButton({
  label,
  count,
  percentage,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  percentage: number;
  selected: boolean;
  onClick: () => void;
}) {
  const barWidth = Math.max(percentage, count > 0 ? 8 : 0);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition ${
        selected
          ? "border-brand-teal bg-brand-teal-soft/50 shadow"
          : "border-brand-ink-muted/20 bg-white/95 hover:border-brand-teal hover:bg-brand-teal-soft/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-sm font-semibold text-brand-deep">
        <span className="whitespace-pre-wrap break-words leading-snug">{label}</span>
        <span className="text-xs font-semibold text-brand-ink-muted">{count}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-deep-soft/40">
        <div
          className={`h-full rounded-full ${selected ? "bg-brand-teal" : "bg-brand-teal-soft"}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
        {percentage}%
      </span>
    </button>
  );
}

export function StudentManagementGraphs({
  totalStudents,
  filteredStudents,
  stateData,
  flagData,
  onToggleState,
  onToggleFlag,
  onClearFilters,
  hasActiveFilters,
}: Props) {
  return (
    <section className="flex flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-3 text-sm text-brand-ink">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-deep">Visión general</span>
          <span className="text-sm text-brand-ink-muted">
            Mostrando {filteredStudents} de {totalStudents} estudiantes
          </span>
        </div>
        <button
          type="button"
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/30 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-ink transition hover:-translate-y-[1px] hover:border-brand-teal hover:text-brand-teal disabled:cursor-not-allowed disabled:opacity-60"
        >
          Limpiar filtros
        </button>
      </header>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-deep">Estados de estudiantes</h3>
          <div className="grid gap-2">
            {stateData.map((item) => (
              <GraphButton
                key={item.key}
                label={item.label}
                count={item.count}
                percentage={item.percentage}
                selected={item.selected}
                onClick={() => onToggleState(item.key)}
              />
            ))}
            {!stateData.length && (
              <p className="rounded-2xl border border-brand-ink-muted/20 bg-white/80 px-4 py-3 text-sm text-brand-ink-muted">
                No hay datos de estado disponibles.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-deep">Banderas de estudiantes</h3>
          <div className="grid gap-2">
            {flagData.map((item) => (
              <GraphButton
                key={item.key}
                label={item.label}
                count={item.count}
                percentage={item.percentage}
                selected={item.selected}
                onClick={() => onToggleFlag(item.key)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
