import type { StudentCoachPanelSummary } from "@/features/administration/data/student-profile";

type CoachPanelProps = {
  data: StudentCoachPanelSummary | null;
  errorMessage?: string | null;
};

function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat("es-EC", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatInteger(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function getLeiRatioVariant(value: number | null | undefined): {
  label: string;
  className: string;
} {
  if (value == null || !Number.isFinite(value)) {
    return {
      label: "Sin datos",
      className: "bg-slate-200 text-slate-600",
    };
  }

  if (value >= 1) {
    return {
      label: `Ratio ${formatDecimal(value, 2)}`,
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  if (value >= 0.6) {
    return {
      label: `Ratio ${formatDecimal(value, 2)}`,
      className: "bg-amber-100 text-amber-700",
    };
  }

  return {
    label: `Ratio ${formatDecimal(value, 2)}`,
    className: "bg-rose-100 text-rose-700",
  };
}

function getOnPaceStatus(onPace: boolean | null | undefined): {
  label: string;
  className: string;
} {
  if (onPace === true) {
    return {
      label: "Sí",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  if (onPace === false) {
    return {
      label: "No",
      className: "bg-amber-100 text-amber-700",
    };
  }

  return {
    label: "—",
    className: "bg-slate-200 text-slate-600",
  };
}

function formatForecast(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  const formatted = formatDecimal(value, value >= 10 ? 0 : 1);
  return `Pronóstico: ${formatted} meses`;
}

function computeConsistency(daysActive: number | null | undefined): string {
  if (daysActive == null || !Number.isFinite(daysActive)) {
    return "—";
  }
  const perWeek = daysActive / 4.345;
  return `${formatDecimal(perWeek, 1)} días/sem`;
}

function formatDaysSinceLast(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "Última visita: —";
  }
  if (value === 0) {
    return "Última visita: hoy";
  }
  if (value === 1) {
    return "Última visita: hace 1 día";
  }
  return `Última visita: hace ${formatInteger(value)} días`;
}

function buildRiskMessages(data: StudentCoachPanelSummary | null): string[] {
  if (!data) {
    return [];
  }
  const risks: string[] = [];

  if (data.stallFlag) {
    const repeatsLabel = data.repeatsAtLast == null
      ? "sin datos"
      : formatInteger(data.repeatsAtLast);
    risks.push(`Estancamiento (Repeticiones en última lección: ${repeatsLabel})`);
  }

  if (data.daysSinceLast != null && data.daysSinceLast >= 14) {
    risks.push("Inactivo (≥14d)");
  }

  if (data.leiRatio != null && Number.isFinite(data.leiRatio) && data.leiRatio < 0.6) {
    risks.push("LEI bajo (ratio < 0.6)");
  }

  return risks;
}

export function CoachPanel({ data, errorMessage }: CoachPanelProps) {
  const leiVariant = getLeiRatioVariant(data?.leiRatio ?? null);
  const paceStatus = getOnPaceStatus(data?.onPace ?? null);
  const forecastLabel = formatForecast(data?.forecastMonthsToFinish ?? null);
  const risks = buildRiskMessages(data);

  return (
    <section className="flex h-full flex-col gap-6 rounded-[28px] border border-white/70 bg-white/92 px-6 py-6 text-brand-deep shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-2xl font-bold text-brand-deep">Panel del coach</h2>
          <p className="text-sm text-brand-ink-muted">
            Resumen de esfuerzo, progreso y pronóstico del nivel actual.
          </p>
          {errorMessage ? (
            <p className="text-sm font-medium text-rose-600">{errorMessage}</p>
          ) : null}
        </div>
        {data ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-teal-soft/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal">
            <span>Nivel {data.levelCode ?? "—"}</span>
            <span className="text-brand-ink-muted">·</span>
            <span>Lección {data.lessonSeq != null ? formatInteger(data.lessonSeq) : "—"}</span>
          </span>
        ) : null}
      </div>

      {!data ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-3 rounded-2xl border border-dashed border-brand-ink-muted/30 bg-white/70 px-6 py-10">
          <span className="text-lg font-semibold text-brand-deep">Sin actividad reciente</span>
          <p className="max-w-md text-sm text-brand-ink-muted">
            No encontramos registros recientes de esfuerzo o progreso en los últimos 30 días para este estudiante.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <article className="flex flex-col gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-brand-ink-muted">En ritmo</h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paceStatus.className}`}
                >
                  {paceStatus.label}
                </span>
              </div>
              <div className="text-2xl font-bold text-brand-deep">
                {paceStatus.label === "—" ? "Sin datos" : paceStatus.label}
              </div>
              {forecastLabel ? (
                <p className="text-xs text-brand-ink-muted">{forecastLabel}</p>
              ) : (
                <p className="text-xs text-brand-ink-muted">Pronóstico no disponible</p>
              )}
            </article>

            <article className="flex flex-col gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-brand-ink-muted">LEI (lecciones/hora)</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${leiVariant.className}`}
                  >
                    {leiVariant.label}
                  </span>
              </div>
              <div className="text-2xl font-bold text-brand-deep">{formatDecimal(data.lei30d, 2)}</div>
              {data.targetLph != null ? (
                <p className="text-xs text-brand-ink-muted">Meta: {formatDecimal(data.targetLph, 2)}</p>
              ) : (
                <p className="text-xs text-brand-ink-muted">Meta no definida</p>
              )}
            </article>

            <article className="flex flex-col gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm">
              <div className="text-sm font-semibold text-brand-ink-muted">Minutos (30 días)</div>
              <div className="text-2xl font-bold text-brand-deep">{formatCompactNumber(data.minutes30d)}</div>
              <p className="text-xs text-brand-ink-muted">
                Promedio sesión: {formatInteger(data.avgSessionMinutes30d)} min
              </p>
            </article>

            <article className="flex flex-col gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm">
              <div className="text-sm font-semibold text-brand-ink-muted">Consistencia</div>
              <div className="text-2xl font-bold text-brand-deep">{computeConsistency(data.daysActive30d)}</div>
              <p className="text-xs text-brand-ink-muted">{formatDaysSinceLast(data.daysSinceLast)}</p>
            </article>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/90 px-5 py-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-ink-muted">Progreso</h3>
              <dl className="grid gap-3 text-sm text-brand-deep">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-brand-ink-muted">Lecciones ganadas (30d)</dt>
                  <dd className="font-semibold">{formatInteger(data.lessonsGained30d)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-brand-ink-muted">Lecciones restantes</dt>
                  <dd className="font-semibold">{formatInteger(data.lessonsRemaining)}</dd>
                </div>
              </dl>
              <p className="text-xs text-brand-ink-muted">
                Incrementa tiempo o eficiencia para mejorar el pronóstico.
              </p>
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/90 px-5 py-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-ink-muted">Riesgos</h3>
              {risks.length ? (
                <ul className="flex list-disc flex-col gap-2 pl-4 text-sm text-brand-deep">
                  {risks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-brand-ink-muted">Sin riesgos detectados.</p>
              )}
            </div>
          </div>

        </>
      )}
    </section>
  );
}

export function CoachPanelSkeleton() {
  return (
    <section className="flex h-full flex-col gap-6 rounded-[28px] border border-white/70 bg-white/92 px-6 py-6 shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="h-6 w-48 rounded-full bg-brand-deep-soft/60" />
          <span className="h-4 w-64 rounded-full bg-brand-deep-soft/40" />
        </div>
        <span className="h-8 w-40 rounded-full bg-brand-teal-soft/60" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm"
          >
            <span className="h-4 w-32 rounded-full bg-brand-deep-soft/50" />
            <span className="h-8 w-24 rounded-full bg-brand-deep-soft/80" />
            <span className="h-3 w-36 rounded-full bg-brand-deep-soft/40" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/90 px-5 py-5 shadow-sm"
          >
            <span className="h-4 w-28 rounded-full bg-brand-deep-soft/50" />
            <span className="h-4 w-full rounded-full bg-brand-deep-soft/40" />
            <span className="h-4 w-5/6 rounded-full bg-brand-deep-soft/30" />
            <span className="h-3 w-1/2 rounded-full bg-brand-deep-soft/30" />
          </div>
        ))}
      </div>
    </section>
  );
}
