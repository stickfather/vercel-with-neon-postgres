function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const levelOptions = ["A1", "A2", "B1", "B2", "C1"] as const;
const rangeOptions = [
  { label: "30 días", value: "30" },
  { label: "60 días", value: "60" },
  { label: "90 días", value: "90" },
];

export default function FilterRail() {
  return (
    <aside className="flex flex-col gap-6 rounded-3xl border border-brand-ink/5 bg-white/90 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-brand-deep">Nivel</h3>
        <p className="text-xs text-brand-ink-muted">Selecciona varios niveles para filtrar.</p>
        <div className="flex flex-wrap gap-2">
          {levelOptions.map((level) => (
            <button
              key={level}
              type="button"
              className={cx(
                "rounded-full border border-brand-ink/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-ink/70 shadow-sm",
                "cursor-not-allowed opacity-60",
              )}
              disabled
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-brand-deep">Rango de fechas</h3>
        <p className="text-xs text-brand-ink-muted">Selecciona un rango predefinido.</p>
        <div className="flex flex-wrap gap-2">
          {rangeOptions.map((range) => (
            <button
              key={range.value}
              type="button"
              className="rounded-full border border-brand-ink/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-ink/70 shadow-sm cursor-not-allowed opacity-60"
              disabled
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full bg-brand-deep px-4 py-2 text-sm font-semibold text-white shadow-sm cursor-not-allowed opacity-60"
        disabled
      >
        Aplicar
      </button>
    </aside>
  );
}
