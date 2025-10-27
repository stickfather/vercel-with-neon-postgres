"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { PinPrompt } from "@/features/security/components/PinPrompt";
import type {
  EngagementDeclinePoint,
  EngagementHourSplit,
  EngagementReport,
  EngagementVisitPace,
  ExamsReport,
  FinancialReport,
  LearningLevelDuration,
  LearningReport,
  LevelVelocity,
  PersonnelCoverage,
  PersonnelLoadPoint,
  PersonnelMix,
} from "@/types/management-reports";

type TabKey = "aprendizaje" | "engagement" | "finanzas" | "examenes" | "personal";

type PanelStatus = "idle" | "loading" | "error" | "success";

type PanelState<T> = {
  status: PanelStatus;
  data: T | null;
  error: string | null;
  reload: () => void;
};

type FetchConfig = {
  endpoint: string;
  enabled: boolean;
};

const integerFormatter = new Intl.NumberFormat("es-EC");
const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const percentFormatter = new Intl.NumberFormat("es-EC", {
  style: "percent",
  maximumFractionDigits: 1,
});
const currencyFormatter = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatPercentValue(value: number | null): string {
  if (value == null) return "—";
  const normalized = value > 1 ? value / 100 : value;
  return percentFormatter.format(normalized);
}

function formatCurrencyValue(value: number | null): string {
  if (value == null) return "—";
  return currencyFormatter.format(value);
}

function formatIntegerValue(value: number | null): string {
  if (value == null) return "—";
  return integerFormatter.format(value);
}

const TAB_CONFIG: { key: TabKey; label: string }[] = [
  { key: "aprendizaje", label: "Aprendizaje" },
  { key: "engagement", label: "Engagement" },
  { key: "finanzas", label: "Finanzas" },
  { key: "examenes", label: "Exámenes" },
  { key: "personal", label: "Personal" },
];

function useReportData<T>({ endpoint, enabled }: FetchConfig): PanelState<T> {
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(0);
  const hasFetchedRef = useRef(false);

  const reload = useCallback(() => {
    setRequestId((previous) => previous + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (hasFetchedRef.current && requestId === 0) {
      return;
    }

    hasFetchedRef.current = true;
    let ignore = false;

    setStatus("loading");
    setError(null);

    (async () => {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof payload?.error === "string"
              ? payload.error
              : "No pudimos cargar la información."
          );
        }
        if (!ignore) {
          setData(payload as T);
          setStatus("success");
        }
      } catch (fetchError) {
        if (ignore) return;
        console.error(`Error cargando ${endpoint}`, fetchError);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "No pudimos cargar la información."
        );
        setStatus("error");
      }
    })();

    return () => {
      ignore = true;
    };
  }, [enabled, endpoint, requestId]);

  return { status, data, error, reload };
}

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-800/60 bg-slate-900/60 p-8 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" aria-hidden />
      <p className="text-sm text-slate-300">Cargando {label}…</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-rose-500/40 bg-rose-500/10 p-8 text-center">
      <p className="text-sm text-rose-100">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
      >
        Reintentar
      </button>
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="flex flex-col gap-1">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description ? <p className="text-sm text-slate-300">{description}</p> : null}
    </header>
  );
}

function StatCard({
  title,
  value,
  caption,
  accent = "text-emerald-300",
}: {
  title: string;
  value: string;
  caption?: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5">
      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{title}</span>
      <span className={classNames("text-2xl font-black", accent)}>{value}</span>
      {caption ? <p className="text-xs text-slate-400">{caption}</p> : null}
    </div>
  );
}

function HorizontalBarList({
  data,
  unit,
  accent = "bg-emerald-400",
}: {
  data: LearningLevelDuration[] | LevelVelocity[] | EngagementVisitPace[];
  unit?: string;
  accent?: string;
}) {
  const maxValue = useMemo(() => {
    return data.reduce((max, item) => {
      const value = "medianDays" in item ? item.medianDays : "lessonsPerWeek" in item ? item.lessonsPerWeek : "value" in item ? item.value : null;
      if (value == null) return max;
      return Math.max(max, value);
    }, 0);
  }, [data]);

  return (
    <div className="flex flex-col gap-3">
      {data.map((item) => {
        const label = "level" in item ? item.level : item.label;
        const rawValue = "medianDays" in item ? item.medianDays : "lessonsPerWeek" in item ? item.lessonsPerWeek : "value" in item ? item.value : null;
        const value = rawValue ?? 0;
        const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 6) : 0;
        return (
          <div key={label} className="flex items-center gap-4">
            <span className="w-24 shrink-0 text-sm font-medium text-slate-200">{label}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800/80">
              <div className={classNames("h-3 rounded-full transition-all", accent)} style={{ width: `${width}%` }} aria-hidden />
            </div>
            <span className="w-16 text-right text-xs font-semibold text-slate-300">
              {rawValue == null ? "—" : `${decimalFormatter.format(rawValue)}${unit ?? ""}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
  getKey,
}: {
  headers: string[];
  rows: ReactNode[][];
  getKey: (index: number, row: ReactNode[]) => string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/70">
      <table className="min-w-full border-collapse text-left">
        <thead className="bg-slate-900/80">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="sticky top-0 border-b border-slate-800/60 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {rows.map((row, index) => (
            <tr key={getKey(index, row)} className={index % 2 === 0 ? "bg-slate-900/40" : "bg-slate-900/20"}>
              {row.map((cell, cellIndex) => (
                <td key={`cell-${cellIndex}`} className="px-4 py-3 text-sm text-slate-200">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PieDonut({
  buckets,
}: {
  buckets: { label: string; value: number }[];
}) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.value, 0);
  let start = 0;

  const segments = buckets.map((bucket, index) => {
    const percent = total > 0 ? (bucket.value / total) * 100 : 0;
    const segment = {
      start,
      end: start + percent,
      color: ["#34d399", "#facc15", "#fb7185", "#38bdf8"][index % 4],
      label: bucket.label,
      value: bucket.value,
    };
    start += percent;
    return segment;
  });

  const gradient = segments
    .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
    .join(", ");

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="h-32 w-32 rounded-full border border-slate-800/60"
        style={{ background: `conic-gradient(${gradient || "#1f2937 0% 100%"})` }}
        aria-hidden
      />
      <ul className="w-full space-y-2 text-xs text-slate-300">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden />
              {segment.label}
            </span>
            <span className="font-semibold text-slate-100">
              {total > 0 ? percentFormatter.format(segment.value / total) : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sparkline({ points }: { points: EngagementDeclinePoint[] }) {
  if (!points.length) {
    return (
      <div className="flex h-24 items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/60 text-sm text-slate-400">
        Sin datos
      </div>
    );
  }
  const values = points.map((point) => point.value ?? 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const normalized = values.map((value) => ((value - min) / (max - min || 1)) * 100);

  const d = normalized
    .map((value, index) => `${index === 0 ? "M" : "L"} ${(index / Math.max(normalized.length - 1, 1)) * 100} ${100 - value}`)
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-24 w-full overflow-visible">
      <path d={`${d} L 100 100 L 0 100 Z`} fill="url(#sparkGradient)" opacity={0.35} />
      <path d={d} fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinecap="round" />
      <defs>
        <linearGradient id="sparkGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function StackedHourBar({ split }: { split: EngagementHourSplit }) {
  const total = (split.morning ?? 0) + (split.afternoon ?? 0) + (split.evening ?? 0);
  const morningWidth = total > 0 ? ((split.morning ?? 0) / total) * 100 : 0;
  const afternoonWidth = total > 0 ? ((split.afternoon ?? 0) / total) * 100 : 0;
  const eveningWidth = total > 0 ? ((split.evening ?? 0) / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>{split.hour}</span>
        <span>{total ? integerFormatter.format(total) : "—"}</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full border border-slate-800/60">
        <div className="h-full bg-sky-400/80" style={{ width: `${morningWidth}%` }} aria-label="Mañana" />
        <div className="h-full bg-amber-400/80" style={{ width: `${afternoonWidth}%` }} aria-label="Tarde" />
        <div className="h-full bg-fuchsia-500/80" style={{ width: `${eveningWidth}%` }} aria-label="Noche" />
      </div>
    </div>
  );
}

function LineAreaChart({ points }: { points: PersonnelLoadPoint[] }) {
  if (!points.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/60 text-sm text-slate-400">
        Sin datos
      </div>
    );
  }
  const values = points.map((point) => point.value ?? 0);
  const max = Math.max(...values, 1);
  const normalized = values.map((value) => (value / (max || 1)) * 100);
  const d = normalized
    .map((value, index) => `${index === 0 ? "M" : "L"} ${(index / Math.max(normalized.length - 1, 1)) * 100} ${100 - value}`)
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-40 w-full overflow-visible">
      <path d={`${d} L 100 100 L 0 100 Z`} fill="url(#loadGradient)" opacity={0.35} />
      <path d={d} fill="none" stroke="#60a5fa" strokeWidth={2.5} strokeLinecap="round" />
      <defs>
        <linearGradient id="loadGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function mapRiskChip(riskLevel: string) {
  const normalized = riskLevel.toLowerCase();
  if (normalized.includes("alto") || normalized.includes("rojo")) {
    return "bg-rose-500/20 text-rose-200 border border-rose-500/40";
  }
  if (normalized.includes("medio") || normalized.includes("amar")) {
    return "bg-amber-500/20 text-amber-100 border border-amber-500/40";
  }
  return "bg-emerald-500/20 text-emerald-100 border border-emerald-500/40";
}

function ManagementPinDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8">
      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <PinPrompt
          scope="manager"
          title="PIN gerencial requerido"
          description="Solo dirección tiene acceso a finanzas. Ingresa el PIN para desbloquear la sesión."
          ctaLabel="Validar PIN"
          onSuccess={onSuccess}
          className="bg-slate-900/95"
        />
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function PanelWrapper({
  status,
  error,
  empty,
  label,
  onRetry,
  children,
}: {
  status: PanelStatus;
  error: string | null;
  empty: boolean;
  label: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (status === "loading" || status === "idle") {
    return <LoadingState label={label} />;
  }

  if (status === "error") {
    return <ErrorState message={error ?? "Ocurrió un error inesperado."} onRetry={onRetry} />;
  }

  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-800/60 bg-slate-900/60 p-10 text-center text-sm text-slate-300">
        Aún no hay datos disponibles para este panel.
      </div>
    );
  }

  return <>{children}</>;
}

function LearningPanel({
  state,
}: {
  state: PanelState<LearningReport>;
}) {
  const data = state.data;
  const empty = !data ||
    (data.levelDurations.length === 0 &&
      data.stuckStudents.length === 0 &&
      data.academicRisk.length === 0 &&
      data.completionVelocity.length === 0 &&
      data.speedBuckets.length === 0);

  return (
    <PanelWrapper
      status={state.status}
      error={state.error}
      empty={empty}
      label="los indicadores de aprendizaje"
      onRetry={state.reload}
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1.2fr]">
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
            <SectionTitle
              title="Días promedio por nivel"
              description="Tiempo mediano que los estudiantes permanecen en cada nivel."
            />
            <div className="mt-4">
              <HorizontalBarList data={data?.levelDurations ?? []} unit=" d" />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
            <SectionTitle
              title="Velocidad de finalización"
              description="Lecciones completadas por estudiante cada semana."
            />
            <div className="mt-4">
              <HorizontalBarList data={data?.completionVelocity ?? []} unit=" lecc." accent="bg-sky-400" />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
            <SectionTitle
              title="Riesgo académico por nivel"
              description="Estancados y medianas de días sin progreso."
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data?.academicRisk.map((risk) => (
                <div key={risk.level} className="flex flex-col gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{risk.level}</span>
                  <span className="text-sm text-slate-300">Mediana sin avance</span>
                  <span className="text-xl font-semibold text-emerald-300">
                    {risk.medianDaysSinceProgress == null ? "—" : `${decimalFormatter.format(risk.medianDaysSinceProgress)} d`}
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="rounded-xl bg-slate-800/70 p-3">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-200">Estancados</span>
                      <span className="text-lg font-semibold text-rose-200">
                        {formatIntegerValue(risk.stalledCount ?? null)}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-800/70 p-3">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-200">Inactivos 14d+</span>
                      <span className="text-lg font-semibold text-amber-200">
                        {formatIntegerValue(risk.inactiveCount ?? null)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
            <SectionTitle
              title="Distribución de velocidad"
              description="Proporción de estudiantes en ritmo rápido, típico o lento."
            />
            <div className="mt-4 flex flex-col gap-6">
              <PieDonut
                buckets={(data?.speedBuckets ?? []).map((bucket) => ({
                  label: bucket.label,
                  value: bucket.percentage ?? 0,
                }))}
              />
              <div>
                <h4 className="text-sm font-semibold text-slate-100">Estudiantes más lentos</h4>
                <div className="mt-3 max-h-[220px] overflow-y-auto pr-2">
                  <SimpleTable
                    headers={["Estudiante", "Nivel", "Índice"]}
                    rows={(data?.slowStudents ?? []).slice(0, 12).map((student) => [
                      <span key="student" className="font-medium">{student.student}</span>,
                      <span key="level" className="text-slate-300">{student.level}</span>,
                      <span key="metric" className="text-slate-200">
                        {student.metric == null ? "—" : decimalFormatter.format(student.metric)}
                      </span>,
                    ])}
                    getKey={(index) => `row-${index}`}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
            <SectionTitle
              title="Estudiantes estancados"
              description="Más de 14 días sin avanzar en una lección."
            />
            <div className="mt-4 max-h-[240px] overflow-y-auto pr-2">
              <SimpleTable
                headers={["Estudiante", "Nivel", "Lección", "Días"]}
                rows={(data?.stuckStudents ?? []).map((student) => [
                  <span key="student" className="font-medium text-slate-100">{student.student}</span>,
                  <span key="level" className="text-slate-300">{student.level}</span>,
                  <span key="lesson" className="text-slate-300">{student.lesson}</span>,
                  <span
                    key="days"
                    className={classNames(
                      "font-semibold",
                      student.daysStuck != null && student.daysStuck >= 14
                        ? "text-rose-300"
                        : "text-slate-200"
                    )}
                  >
                    {formatIntegerValue(student.daysStuck ?? null)}
                  </span>,
                ])}
                getKey={(index) => `row-${index}`}
              />
            </div>
          </div>
        </div>
      </div>
    </PanelWrapper>
  );
}

function EngagementPanel({ state }: { state: PanelState<EngagementReport> }) {
  const data = state.data;
  const empty = !data ||
    (data.active.length === 0 &&
      data.inactive.length === 0 &&
      data.roster.length === 0 &&
      data.visitPace.length === 0 &&
      data.declineIndex.length === 0);

  return (
    <PanelWrapper
      status={state.status}
      error={state.error}
      empty={empty}
      label="los indicadores de engagement"
      onRetry={state.reload}
    >
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6 sm:grid-cols-2">
            <SectionTitle title="Activos recientes" description="Estudiantes activos en los últimos días." />
            {(data?.active ?? []).map((bucket) => (
              <StatCard
                key={bucket.range}
                title={bucket.range}
                value={formatIntegerValue(bucket.count ?? null)}
                caption="Estudiantes activos"
              />
            ))}
          </div>
          <div className="grid gap-4 rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6 sm:grid-cols-2">
            <SectionTitle title="Inactivos" description="Alumnos que necesitan reactivación." />
            {(data?.inactive ?? []).map((bucket) => (
              <StatCard
                key={bucket.range}
                title={bucket.range}
                value={formatIntegerValue(bucket.count ?? null)}
                caption="Estudiantes"
                accent="text-amber-300"
              />
            ))}
          </div>
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
            <SectionTitle title="Días promedio entre visitas" description="Promedio de días por segmento." />
            <div className="mt-4">
              <HorizontalBarList data={data?.visitPace ?? []} unit=" d" accent="bg-amber-400" />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
            <SectionTitle title="Índice de declive" description="Tendencia semanal del engagement." />
            <div className="mt-4">
              <Sparkline points={data?.declineIndex ?? []} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
            <SectionTitle
              title="Horario de visitas"
              description="Distribución de estudiantes por bloques horarios."
            />
            <div className="mt-4 flex flex-col gap-3">
              {(data?.hourSplit ?? []).map((split) => (
                <StackedHourBar key={split.hour} split={split} />
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
            <SectionTitle
              title="Alumnos inactivos"
              description="Lista prioritaria para llamadas de seguimiento."
            />
            <div className="mt-4 max-h-[300px] overflow-y-auto pr-2">
              <SimpleTable
                headers={["Estudiante", "Estado", "Última visita", "Días"]}
                rows={(data?.roster ?? []).map((row) => [
                  <span key="student" className="font-medium text-slate-100">{row.student}</span>,
                  <span key="status" className="text-slate-300">{row.status}</span>,
                  <span key="visit" className="text-slate-400">{row.lastVisit}</span>,
                  <span key="days" className="font-semibold text-rose-200">
                    {formatIntegerValue(row.daysInactive ?? null)}
                  </span>,
                ])}
                getKey={(index) => `row-${index}`}
              />
            </div>
          </div>
        </div>
      </div>
    </PanelWrapper>
  );
}

function FinancialPanel({ state, locked }: { state: PanelState<FinancialReport>; locked: boolean }) {
  const data = state.data;
  const empty = !data ||
    ((data.aging ?? []).length === 0 &&
      (data.collections ?? []).length === 0 &&
      (data.debtors ?? []).length === 0);

  if (locked) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/70 p-10 text-center">
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" aria-hidden />
        <div className="relative flex flex-col items-center gap-4 text-slate-200">
          <span className="text-4xl">🔒</span>
          <p className="text-sm font-semibold">Solo acceso gerencial</p>
          <p className="text-xs text-slate-300">Ingresa el PIN gerencial para visualizar los indicadores financieros.</p>
        </div>
      </div>
    );
  }

  return (
    <PanelWrapper
      status={state.status}
      error={state.error}
      empty={empty}
      label="los indicadores financieros"
      onRetry={state.reload}
    >
      {data ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6 sm:grid-cols-2">
              <StatCard
                title="Estudiantes con saldo"
                value={formatIntegerValue(data.outstanding.students ?? null)}
                caption="Actualmente con deuda"
                accent="text-rose-300"
              />
              <StatCard
                title="Saldo pendiente"
                value={formatCurrencyValue(data.outstanding.balance ?? null)}
                caption="Total consolidado"
                accent="text-emerald-300"
              />
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
              <SectionTitle title="Aging de cartera" description="Distribución por días de mora." />
              <div className="mt-4 space-y-3">
                {(data.aging ?? []).map((bucket) => (
                  <div key={bucket.label} className="flex items-center gap-4">
                    <span className="w-28 text-sm text-slate-200">{bucket.label}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800/80">
                      <div
                        className="h-3 rounded-full bg-rose-400"
                        style={{
                          width: data.outstanding.balance
                            ? `${Math.max(((bucket.value ?? 0) / Math.max(data.outstanding.balance, 1)) * 100, 4)}%`
                            : "0%",
                        }}
                        aria-hidden
                      />
                    </div>
                    <span className="w-28 text-right text-sm font-semibold text-slate-200">
                      {formatCurrencyValue(bucket.value ?? null)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
              <SectionTitle title="Cobros últimos 30 días" description="Pagos registrados semana a semana." />
              <div className="mt-4 grid gap-3">
                {(data.collections ?? []).map((point) => (
                  <div key={point.label} className="flex items-center justify-between rounded-2xl bg-slate-800/60 px-4 py-3 text-sm text-slate-200">
                    <span>{point.label}</span>
                    <span className="font-semibold text-emerald-300">
                      {formatCurrencyValue(point.value ?? null)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
            <SectionTitle title="Estudiantes con deuda" description="Ordenados por mayor mora." />
            <div className="mt-4 max-h-[480px] overflow-y-auto pr-2">
              <SimpleTable
                headers={["Estudiante", "Monto", "Días mora"]}
                rows={(data.debtors ?? []).map((debtor) => [
                  <span key="student" className="font-medium text-slate-100">{debtor.student}</span>,
                  <span key="amount" className="font-semibold text-emerald-300">
                    {formatCurrencyValue(debtor.amount ?? null)}
                  </span>,
                  <span key="days" className="font-semibold text-rose-200">
                    {formatIntegerValue(debtor.daysOverdue ?? null)}
                  </span>,
                ])}
                getKey={(index) => `row-${index}`}
              />
            </div>
          </div>
        </div>
      ) : null}
    </PanelWrapper>
  );
}

function ExamsPanel({ state }: { state: PanelState<ExamsReport> }) {
  const data = state.data;
  const empty = !data ||
    (data.upcoming.length === 0 &&
      !data.firstAttemptRate &&
      !data.overallRate &&
      !data.averageScore &&
      (data.strugglingStudents ?? []).length === 0);

  return (
    <PanelWrapper
      status={state.status}
      error={state.error}
      empty={empty}
      label="los indicadores de exámenes"
      onRetry={state.reload}
    >
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6 sm:grid-cols-2">
            <StatCard
              title={data?.firstAttemptRate?.label ?? "1er intento"}
              value={formatPercentValue(data?.firstAttemptRate?.value ?? null)}
              caption="Tasa de aprobación"
            />
            <StatCard
              title={data?.overallRate?.label ?? "Global"}
              value={formatPercentValue(data?.overallRate?.value ?? null)}
              caption="Tasa acumulada"
              accent="text-sky-300"
            />
            <StatCard
              title={data?.averageScore?.label ?? "Puntaje promedio"}
              value={data?.averageScore?.value == null ? "—" : decimalFormatter.format(data.averageScore.value)}
              caption="Sobre 100"
              accent="text-emerald-300"
            />
            <StatCard
              title={data?.instructiveCompletion?.label ?? "Instructivo"}
              value={formatPercentValue(data?.instructiveCompletion?.value ?? null)}
              caption="Cumplimiento"
              accent="text-amber-300"
            />
          </div>
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
            <SectionTitle title="Próximos exámenes (30 días)" />
            <div className="mt-4 max-h-[240px] overflow-y-auto pr-2">
              <SimpleTable
                headers={["Examen", "Fecha", "Candidatos"]}
                rows={(data?.upcoming ?? []).map((exam) => [
                  <span key="exam" className="font-medium text-slate-100">{exam.exam}</span>,
                  <span key="date" className="text-slate-300">{exam.date}</span>,
                  <span key="count" className="text-slate-200">
                    {formatIntegerValue(exam.candidates ?? null)}
                  </span>,
                ])}
                getKey={(index) => `row-${index}`}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
            <SectionTitle title="Alumnos con dificultad" description="Prioriza refuerzos y tutorías." />
            <div className="mt-4 max-h-[280px] overflow-y-auto pr-2">
              <SimpleTable
                headers={["Estudiante", "Examen", "Intentos", "Puntaje"]}
                rows={(data?.strugglingStudents ?? []).map((student) => [
                  <span key="student" className="font-medium text-slate-100">{student.student}</span>,
                  <span key="exam" className="text-slate-300">{student.exam}</span>,
                  <span key="attempts" className="text-slate-200">
                    {formatIntegerValue(student.attempts ?? null)}
                  </span>,
                  <span key="score" className="text-rose-200">
                    {student.score == null ? "—" : decimalFormatter.format(student.score)}
                  </span>,
                ])}
                getKey={(index) => `row-${index}`}
              />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
            <SectionTitle title="Instructivo post-evaluación" description="Seguimiento después de reprobar." />
            <div className="mt-4 grid gap-3">
              <StatCard
                title={data?.instructiveDays?.label ?? "Días promedio"}
                value={data?.instructiveDays?.value == null ? "—" : decimalFormatter.format(data.instructiveDays.value)}
                caption="Para completar instructivo"
                accent="text-emerald-300"
              />
              <StatCard
                title={data?.failToInstructiveLink?.label ?? "Vinculación"}
                value={formatPercentValue(data?.failToInstructiveLink?.value ?? null)}
                caption="Alumnos reprobados con instructivo asignado"
                accent="text-sky-300"
              />
            </div>
          </div>
        </div>
      </div>
    </PanelWrapper>
  );
}

function PersonnelPanel({ state }: { state: PanelState<{
  staffingMix: PersonnelMix[];
  coverage: PersonnelCoverage[];
  studentLoad: PersonnelLoadPoint[];
}> }) {
  const data = state.data;
  const empty = !data ||
    (data.staffingMix.length === 0 && data.coverage.length === 0 && data.studentLoad.length === 0);

  return (
    <PanelWrapper
      status={state.status}
      error={state.error}
      empty={empty}
      label="los indicadores de personal"
      onRetry={state.reload}
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
            <SectionTitle title="Mix de cobertura" description="Minutos de estudiantes vs staff por hora." />
            <div className="mt-4 flex flex-col gap-3">
              {(data?.staffingMix ?? []).map((mix) => (
                <div key={mix.hour} className="flex items-center gap-4">
                  <span className="w-16 text-sm text-slate-200">{mix.hour}</span>
                  <div className="flex h-3 flex-1 overflow-hidden rounded-full border border-slate-800/60">
                    <div
                      className="h-full bg-emerald-400/80"
                      style={{
                        width: (mix.students ?? 0) + (mix.staff ?? 0) > 0
                          ? `${((mix.students ?? 0) / Math.max((mix.students ?? 0) + (mix.staff ?? 0), 1)) * 100}%`
                          : "0%",
                      }}
                      aria-label="Minutos estudiantes"
                    />
                    <div
                      className="h-full bg-sky-400/80"
                      style={{
                        width: (mix.students ?? 0) + (mix.staff ?? 0) > 0
                          ? `${((mix.staff ?? 0) / Math.max((mix.students ?? 0) + (mix.staff ?? 0), 1)) * 100}%`
                          : "0%",
                      }}
                      aria-label="Minutos staff"
                    />
                  </div>
                  <span className="w-20 text-right text-xs text-slate-300">
                    {mix.students == null && mix.staff == null
                      ? "—"
                      : `${integerFormatter.format(Math.round((mix.students ?? 0)))}/${integerFormatter.format(Math.round((mix.staff ?? 0)))}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
            <SectionTitle title="Carga por docente" description="Estudiantes promedio por hora." />
            <div className="mt-4">
              <LineAreaChart points={data?.studentLoad ?? []} />
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
          <SectionTitle title="Cobertura en picos" description="Zonas de riesgo operativo." />
          <div className="mt-4 flex flex-col gap-3">
            {(data?.coverage ?? []).map((coverage) => (
              <div key={coverage.area} className="flex flex-col gap-2 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">{coverage.area}</span>
                  <span className={classNames("rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide", mapRiskChip(coverage.riskLevel))}>
                    {coverage.riskLevel}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{coverage.status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PanelWrapper>
  );
}

export function ManagementReportsDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("aprendizaje");
  const [financeUnlocked, setFinanceUnlocked] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [financeDenied, setFinanceDenied] = useState(false);

  const learning = useReportData<LearningReport>({
    endpoint: "/api/reportes/aprendizaje",
    enabled: activeTab === "aprendizaje",
  });

  const engagement = useReportData<EngagementReport>({
    endpoint: "/api/reportes/engagement",
    enabled: activeTab === "engagement",
  });

  const finance = useReportData<FinancialReport>({
    endpoint: "/api/reportes/finanzas",
    enabled: activeTab === "finanzas" && financeUnlocked,
  });

  const exams = useReportData<ExamsReport>({
    endpoint: "/api/reportes/examenes",
    enabled: activeTab === "examenes",
  });

  const personnel = useReportData<{
    staffingMix: PersonnelMix[];
    coverage: PersonnelCoverage[];
    studentLoad: PersonnelLoadPoint[];
  }>({
    endpoint: "/api/reportes/personal",
    enabled: activeTab === "personal",
  });

  const handleSelectTab = useCallback(
    (tab: TabKey) => {
      if (tab === "finanzas" && !financeUnlocked) {
        setActiveTab(tab);
        setPinVisible(true);
        setFinanceDenied(false);
        return;
      }
      setActiveTab(tab);
    },
    [financeUnlocked],
  );

  const handlePinClose = useCallback(() => {
    setPinVisible(false);
    setFinanceDenied(true);
  }, []);

  const handlePinSuccess = useCallback(() => {
    setFinanceUnlocked(true);
    setPinVisible(false);
    setFinanceDenied(false);
    setActiveTab("finanzas");
    finance.reload();
  }, [finance]);

  const renderPanel = useMemo(() => {
    switch (activeTab) {
      case "aprendizaje":
        return <LearningPanel state={learning} />;
      case "engagement":
        return <EngagementPanel state={engagement} />;
      case "finanzas":
        return <FinancialPanel state={finance} locked={!financeUnlocked} />;
      case "examenes":
        return <ExamsPanel state={exams} />;
      case "personal":
        return <PersonnelPanel state={personnel} />;
      default:
        return null;
    }
    }, [activeTab, engagement, exams, finance, financeUnlocked, learning, personnel]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05070f] via-[#0b1220] to-[#111827] text-white">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 md:px-10 lg:px-16">
        <header className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-300">Administración</span>
          <h1 className="text-4xl font-black sm:text-[44px]">Reportes gerenciales</h1>
          <p className="max-w-3xl text-sm text-slate-300">
            Visión del centro: aprendizaje, engagement, finanzas, exámenes y personal en tiempo real.
          </p>
        </header>

        <div className="flex flex-wrap gap-2 rounded-full border border-slate-800/60 bg-slate-900/50 p-1">
          {TAB_CONFIG.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleSelectTab(tab.key)}
                className={classNames(
                  "rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] transition",
                  isActive
                    ? "bg-emerald-400 text-slate-900 shadow"
                    : "text-slate-300 hover:bg-slate-800/70"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <section className="pb-12">
          {financeDenied && activeTab === "finanzas" && !financeUnlocked ? (
            <div className="mb-6 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-100">
              Ingresa el PIN gerencial para desbloquear finanzas. Puedes reintentar desde la pestaña de finanzas.
            </div>
          ) : null}
          {renderPanel}
        </section>
      </main>

      <ManagementPinDialog open={pinVisible} onClose={handlePinClose} onSuccess={handlePinSuccess} />
    </div>
  );
}
