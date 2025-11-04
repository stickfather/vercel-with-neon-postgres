import type { ActiveCounts, WoWIndex } from "@/types/reports.engagement";

const integerFormatter = new Intl.NumberFormat("es-EC");
const percentFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

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

type Props = {
  activeCounts: ActiveCounts;
  wowIndex: WoWIndex;
  variant?: "light" | "dark";
};

export function EngagementHeaderTiles({
  activeCounts,
  wowIndex,
  variant = "light",
}: Props) {
  const wowTone = (wowIndex.active_students_wow_change ?? 0) >= 0 ? "positive" : "negative";

  const isDark = variant === "dark";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const primaryText = isDark ? "text-slate-100" : "text-slate-900";
  const mutedTile = isDark
    ? "rounded-2xl border border-slate-800/60 bg-slate-900/70 p-5 shadow-sm text-slate-100"
    : "rounded-2xl border border-slate-200/70 bg-white/95 p-5 shadow-sm text-slate-800";
  const hintText = "text-slate-400";

  const wowChange = wowIndex.active_students_wow_change;
  const wowDisplay = wowChange !== null ? percentFormatter.format(Math.abs(wowChange * 100)) : "—";

  return (
    <>
      {/* Row 1: Active Students (7/14/30/180 days) */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className={`flex flex-col gap-3 ${mutedTile} transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
          <header className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${secondaryText}`}>
              Activos (7 días)
            </span>
            <span title="Alumnos con ≥1 asistencia en los últimos 7 días." className={`text-xs ${hintText}`}>
              ℹ
            </span>
          </header>
          <div className={`text-3xl font-semibold ${primaryText}`}>{integerFormatter.format(activeCounts.active_7d)}</div>
          <div className={`h-10 text-sm ${secondaryText}`}>Últimos 7 días</div>
        </article>

        <article className={`flex flex-col gap-3 ${mutedTile} transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
          <header className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${secondaryText}`}>
              Activos (14 días)
            </span>
            <span title="Alumnos con ≥1 asistencia en los últimos 14 días." className={`text-xs ${hintText}`}>
              ℹ
            </span>
          </header>
          <div className={`text-3xl font-semibold ${primaryText}`}>{integerFormatter.format(activeCounts.active_14d)}</div>
          <div className={`h-10 text-sm ${secondaryText}`}>Últimos 14 días</div>
        </article>

        <article className={`flex flex-col gap-3 ${mutedTile} transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
          <header className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${secondaryText}`}>
              Activos (30 días)
            </span>
            <span title="Alumnos con ≥1 asistencia en los últimos 30 días." className={`text-xs ${hintText}`}>
              ℹ
            </span>
          </header>
          <div className={`text-3xl font-semibold ${primaryText}`}>{integerFormatter.format(activeCounts.active_30d)}</div>
          <div className={`h-10 text-sm ${secondaryText}`}>Últimos 30 días</div>
        </article>

        <article className={`flex flex-col gap-3 ${mutedTile} transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
          <header className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${secondaryText}`}>
              Activos (6 meses)
            </span>
            <span title="Alumnos con ≥1 asistencia en los últimos 180 días." className={`text-xs ${hintText}`}>
              ℹ
            </span>
          </header>
          <div className={`text-3xl font-semibold ${primaryText}`}>{integerFormatter.format(activeCounts.active_180d)}</div>
          <div className={`h-10 text-sm ${secondaryText}`}>Últimos 180 días</div>
        </article>
      </section>

      {/* Row 2: Engagement Decline Index */}
      <section className="grid gap-4">
        <article
          className={`flex flex-col gap-3 rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${getToneClasses(wowTone, variant)}`}
        >
          <header className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${secondaryText}`}>
              Índice de declive de engagement (WoW)
            </span>
            <span title="Cambio semana a semana en alumnos activos." className={`text-xs ${hintText}`}>
              ℹ
            </span>
          </header>
          <div className="flex items-center justify-between">
            <div className={`flex items-baseline gap-2 text-3xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
              {wowChange !== null && <span>{wowChange >= 0 ? "↑" : "↓"}</span>}
              <span>{wowDisplay}%</span>
            </div>
            <div className={`text-sm ${secondaryText}`}>
              {wowChange !== null && wowChange >= 0 ? "Incremento en participación" : wowChange !== null ? "Descenso en participación" : "Sin datos comparativos"}
            </div>
          </div>
        </article>
      </section>
    </>
  );
}
