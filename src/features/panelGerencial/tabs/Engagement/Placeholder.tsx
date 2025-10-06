export default function EngagementPlaceholder() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-32 rounded-3xl border border-dashed border-brand-ink/20 bg-white/80 animate-pulse"
          />
        ))}
      </div>
      <p className="rounded-3xl border border-brand-ink/10 bg-white/90 px-6 py-10 text-center text-sm text-brand-ink-muted">
        Los gráficos y tablas de este panel se implementarán en los siguientes pasos.
      </p>
    </div>
  );
}
