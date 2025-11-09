"use client";

import Link from "next/link";

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
  EngagementShiftPoint,
  EngagementStudyShift,
  EngagementVisitPace,
  ExamsReport,
  FinancialReport,
  LearningLevelDuration,
  LevelVelocity,
  PersonnelCoverage,
  PersonnelLoadPoint,
  PersonnelMix,
} from "@/types/management-reports";
import type { LearningReport } from "@/types/reports.learning";

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

function calculatePercentBenchmark(value: number | null): number | undefined {
  if (value == null) return undefined;
  return Math.min(value * (value > 1 ? 1 : 100), 100);
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

type ManagementRefreshHeaderProps = {
  onRefreshComplete?: () => void;
};

function ManagementRefreshHeader({ onRefreshComplete }: ManagementRefreshHeaderProps) {
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/last-refresh", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            typeof payload?.error === "string"
              ? payload.error
              : "No se pudo cargar la última actualización.",
          );
        }

        if (!cancelled) {
          setLastRefreshedAt(
            typeof payload?.refreshed_at === "string" ? payload.refreshed_at : null,
          );
          setErrorMsg(null);
        }
      } catch (loadError) {
        console.error("failed to load last refresh", loadError);
        if (!cancelled) {
          setErrorMsg("No se pudo cargar la última actualización.");
          setLastRefreshedAt(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatTimestamp = useCallback((timestamp: string | null) => {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("es-EC", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }, []);

  const handleManualRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setErrorMsg(null);

      const response = await fetch("/api/refresh-mvs", {
        method: "POST",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        throw new Error(
          typeof payload?.error === "string" ? payload.error : "Fallo al refrescar.",
        );
      }

      const refreshedAt =
        typeof payload?.refreshed_at === "string" ? payload.refreshed_at : null;
      setLastRefreshedAt(refreshedAt);
      onRefreshComplete?.();
    } catch (refreshError) {
      console.error("manual refresh failed", refreshError);
      setErrorMsg("Error al actualizar los datos.");
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshComplete]);

  return (
    <div className="flex w-full flex-col gap-3 rounded-3xl border border-slate-800/60 bg-slate-900/60 p-5 shadow-[0_22px_65px_rgba(2,6,23,0.4)] sm:max-w-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
        Estado de datos
      </span>
      <div className="text-sm text-slate-300">
        Última actualización:{" "}
        <span className="font-semibold text-white">
          {formatTimestamp(lastRefreshedAt)}
        </span>
      </div>
      {errorMsg ? (
        <p className="text-xs text-rose-300">{errorMsg}</p>
      ) : null}
      <button
        type="button"
        onClick={handleManualRefresh}
        disabled={isRefreshing}
        className={classNames(
          "inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] transition",
          isRefreshing
            ? "cursor-not-allowed bg-slate-700/70 text-slate-300"
            : "bg-emerald-400 text-slate-900 shadow hover:-translate-y-[1px]",
        )}
      >
        {isRefreshing ? "Actualizando..." : "Actualizar datos"}
      </button>
      <p className="text-[11px] text-slate-400">
        Esto vuelve a calcular los KPIs desde la base de datos.
      </p>
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
      <h3 className="text-base font-semibold text-white md:text-lg">{title}</h3>
      {description ? <p className="text-sm text-slate-400">{description}</p> : null}
    </header>
  );
}

function StatCard({
  title,
  value,
  caption,
  accent = "text-emerald-300",
  benchmark,
  size = "normal",
}: {
  title: string;
  value: string;
  caption?: string;
  accent?: string;
  benchmark?: number;
  size?: "normal" | "large";
}) {
  const valueClass = size === "large" ? "text-3xl md:text-4xl font-black" : "text-2xl font-black";
  return (
    <div className="flex min-h-[120px] flex-col gap-2 rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5">
      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{title}</span>
      <div className="relative">
        {benchmark != null && (
          <div className="absolute inset-0 flex items-center">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/60">
              <div
                className="h-2 rounded-full bg-slate-700/40"
                style={{ width: `${Math.min(benchmark, 100)}%` }}
                aria-hidden
              />
            </div>
          </div>
        )}
        <span className={classNames(valueClass, accent, "relative z-10")}>{value}</span>
      </div>
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
    <svg viewBox="0 0 100 100" className="h-24 w-full overflow-visible" aria-label="Gráfico de índice de declive">
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
      <div className="flex h-3 overflow-hidden rounded-full border border-slate-800/60" title={`Mañana: ${split.morning ?? 0}, Tarde: ${split.afternoon ?? 0}, Noche: ${split.evening ?? 0}`}>
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
    <svg viewBox="0 0 100 100" className="h-40 w-full overflow-visible" aria-label="Gráfico de carga de estudiantes por docente">
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

function StudyShiftChart({ shift }: { shift: EngagementStudyShift | undefined }) {
  if (!shift || shift.points.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 text-sm text-slate-400">
        Sin práctica registrada en los últimos 30 días
      </div>
    );
  }

  const maxMinutes = Math.max(...shift.points.map(p => p.minutes), 1);
  const totalHours = (shift.total_minutes_30d / 60).toFixed(1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h4 className="text-base font-semibold text-slate-100">Horas de estudio (últimos 30 días)</h4>
          <p className="text-xs text-slate-400">Distribución de minutos de práctica por hora local</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-200">
          Total: {totalHours} h
        </span>
      </div>
      <div className="flex items-end gap-1 h-32" role="img" aria-label={`Gráfico de horas de estudio. Total: ${totalHours} horas en 30 días`}>
        {shift.points.map((point) => {
          const height = maxMinutes > 0 ? (point.minutes / maxMinutes) * 100 : 0;
          const hours = (point.minutes / 60).toFixed(1);
          return (
            <div
              key={point.hour_of_day}
              className="group relative flex flex-1 flex-col items-center"
            >
              <div
                className="w-full rounded-t bg-emerald-500/70 transition-all hover:bg-emerald-500/90"
                style={{ height: `${Math.max(height, 2)}%`, minHeight: height > 0 ? "4px" : "0" }}
                title={`${String(point.hour_of_day).padStart(2, '0')}:00 — ${point.minutes} min (${hours} h)`}
              />
              {point.hour_of_day % 3 === 0 && (
                <span className="mt-1 text-[9px] text-slate-500">
                  {String(point.hour_of_day).padStart(2, '0')}
                </span>
              )}
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center">
                <div className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 whitespace-nowrap shadow-lg">
                  {String(point.hour_of_day).padStart(2, '0')}:00 — {point.minutes} min ({hours} h)
                </div>
                <div className="h-0 w-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 text-xs text-slate-400">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>
    </div>
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
  // Redirect to new comprehensive learning panel
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-center">
        <h3 className="mb-3 text-xl font-semibold text-emerald-100">
          Panel de Aprendizaje Mejorado
        </h3>
        <p className="mb-6 text-sm text-emerald-200/80">
          El panel de aprendizaje ha sido actualizado con 16 módulos completos basados en datos de los últimos 90 días, 
          incluyendo KPIs de eficiencia (LEI), análisis de velocidad, heatmap de estudiantes atascados, 
          gráficos de tendencias y tablas interactivas con drill-down.
        </p>
        <Link
          href="/reports/aprendizaje"
          className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:-translate-y-[1px] hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
        >
          Ver Panel Completo de Aprendizaje →
        </Link>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-emerald-200/60">
          <span>• LEI 7-day avg</span>
          <span>• Speed Buckets</span>
          <span>• Heatmap estudiantes atascados</span>
          <span>• Varianza de duración</span>
          <span>• Velocidad por nivel</span>
          <span>• Tendencia LEI semanal</span>
          <span>• Estudiantes en riesgo</span>
        </div>
      </div>
    </div>
  );
}

function EngagementPanel({ state }: { state: PanelState<EngagementReport> }) {
  // Redirect to new comprehensive engagement panel
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-center">
        <h3 className="mb-3 text-xl font-semibold text-emerald-100">
          Panel de Engagement MD-Clean
        </h3>
        <p className="mb-6 text-sm text-emerald-200/80">
          El panel de engagement ha sido actualizado con 20 módulos completos, incluyendo KPIs en tiempo real 
          (Activos 7d/14d/30d/6m, WAU/MAU, ratios de retención), análisis de estudiantes inactivos con 
          drill-down, heatmaps de tráfico por hora/día, tendencias semanales, distribución de sesiones, 
          y análisis cross-panel con aprendizaje.
        </p>
        <Link
          href="/reports/engagement"
          className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:-translate-y-[1px] hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
        >
          Ver Panel Completo de Engagement →
        </Link>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-emerald-200/60">
          <span>• Activos 7d/14d/30d/6m</span>
          <span>• WAU/MAU/Ratio</span>
          <span>• Heatmap horario</span>
          <span>• Tendencia semanal</span>
          <span>• Roster inactivos</span>
          <span>• Análisis cross-panel</span>
          <span>• CSV Export</span>
        </div>
      </div>
    </div>
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

  // Helper to get aging bucket color
  const getAgingColor = (label: string) => {
    if (label.includes("90+") || label.includes(">90")) return "#dc2626";
    if (label.includes("60") || label.includes("61-90")) return "#ea580c";
    if (label.includes("30") || label.includes("31-60")) return "#f59e0b";
    if (label.includes("15") || label.includes("15-30")) return "#facc15";
    if (label.includes("8") || label.includes("8-14")) return "#84cc16";
    if (label.includes("1-7")) return "#22c55e";
    return "#10b981";
  };

  // Calculate total for aging stacked bar
  const agingTotal = (data?.aging ?? []).reduce((sum, bucket) => sum + (bucket.value ?? 0), 0);

  // Sort debtors: days overdue desc, then amount desc
  const sortedDebtors = [...(data?.debtors ?? [])]
    .sort((a, b) => {
      const daysDiff = (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0);
      if (daysDiff !== 0) return daysDiff;
      return (b.amount ?? 0) - (a.amount ?? 0);
    });

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
            <div className="grid gap-4 rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 md:p-6 sm:grid-cols-2">
              <StatCard
                title="Estudiantes con saldo"
                value={formatIntegerValue(data.outstanding.students ?? null)}
                caption="Actualmente con deuda"
                accent="text-amber-300"
                size="large"
              />
              <StatCard
                title="Saldo pendiente"
                value={formatCurrencyValue(data.outstanding.balance ?? null)}
                caption="Total consolidado"
                accent="text-emerald-300"
                size="large"
              />
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 md:p-6">
              <SectionTitle title="Aging de cartera" description="Distribución por días de mora." />
              {agingTotal > 0 ? (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex h-8 overflow-hidden rounded-full border border-slate-800/60">
                    {(data.aging ?? []).map((bucket, index) => {
                      const width = agingTotal > 0 ? ((bucket.value ?? 0) / agingTotal) * 100 : 0;
                      if (width === 0) return null;
                      return (
                        <div
                          key={bucket.label}
                          className="h-full transition-all hover:opacity-80"
                          style={{
                            width: `${width}%`,
                            backgroundColor: getAgingColor(bucket.label),
                          }}
                          title={`${bucket.label}: ${formatCurrencyValue(bucket.value ?? null)} (${Math.round(width)}%)`}
                          aria-label={bucket.label}
                        />
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    {(data.aging ?? []).map((bucket) => (
                      <div key={bucket.label} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: getAgingColor(bucket.label) }}
                        />
                        <span className="truncate text-slate-300">{bucket.label}</span>
                        <span className="ml-auto font-semibold text-slate-200">
                          {formatCurrencyValue(bucket.value ?? null)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 text-sm text-slate-400">
                  Sin deudas en el rango
                </div>
              )}
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 md:p-6">
              <SectionTitle title="Cobros últimos 30 días" description="Pagos registrados semana a semana." />
              {(data.collections ?? []).length > 0 ? (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex items-end gap-2">
                    {(data.collections ?? []).map((point) => {
                      const maxValue = Math.max(...(data.collections ?? []).map(p => p.value ?? 0), 1);
                      const height = ((point.value ?? 0) / maxValue) * 100;
                      return (
                        <div key={point.label} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t-lg bg-emerald-500/70 transition-all hover:bg-emerald-500/90"
                            style={{ height: `${Math.max(height, 8)}px`, minHeight: "32px" }}
                            title={`${point.label}: ${formatCurrencyValue(point.value ?? null)}`}
                          />
                          <span className="text-[10px] text-slate-400">{point.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 text-xs text-slate-300">
                    <span>Total</span>
                    <span className="font-semibold text-emerald-300">
                      {formatCurrencyValue((data.collections ?? []).reduce((sum, p) => sum + (p.value ?? 0), 0))}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 text-sm text-slate-400">
                  Sin cobros en el período
                </div>
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 md:p-6">
            <SectionTitle title="Estudiantes con deuda" description="Ordenados por días de mora y monto." />
            <div className="mt-4 max-h-[480px] overflow-y-auto pr-2">
              <SimpleTable
                headers={["Estudiante", "Monto", "Días mora"]}
                rows={sortedDebtors.map((debtor, index) => [
                  <span key="student" className="font-medium text-slate-100">{debtor.student}</span>,
                  <span key="amount" className="text-right font-semibold tabular-nums text-emerald-300">
                    {formatCurrencyValue(debtor.amount ?? null)}
                  </span>,
                  <span key="days" className="text-right font-semibold tabular-nums text-rose-200">
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
  // Redirect to new comprehensive exams panel
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-center">
        <h3 className="mb-3 text-xl font-semibold text-emerald-100">
          Panel de Exámenes Mejorado
        </h3>
        <p className="mb-6 text-sm text-emerald-200/80">
          El panel de exámenes ha sido actualizado con 17 módulos completos, incluyendo KPIs mejorados, 
          gráficos interactivos con Recharts, tablas de análisis y capacidades de drill-down.
        </p>
        <Link
          href="/reports/examenes"
          className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:-translate-y-[1px] hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
        >
          Ver Panel Completo de Exámenes →
        </Link>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-emerald-200/60">
          <span>• Tendencias semanales</span>
          <span>• Distribución de puntajes</span>
          <span>• Heatmap Nivel×Tipo</span>
          <span>• Análisis de reintentos</span>
          <span>• Estudiantes en riesgo</span>
          <span>• Agenda 30 días</span>
        </div>
      </div>
    </div>
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
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 md:p-6">
            <SectionTitle title="Mix de cobertura" description="Minutos de estudiantes vs staff por hora." />
            {(data?.staffingMix ?? []).length > 0 ? (
              <div className="mt-4 flex flex-col gap-3">
                {(data?.staffingMix ?? []).map((mix) => {
                  const ratio = (mix.staff ?? 0) > 0 
                    ? ((mix.students ?? 0) / (mix.staff ?? 0)).toFixed(1)
                    : "—";
                  return (
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
                          title={`Estudiantes: ${Math.round(mix.students ?? 0)} min`}
                        />
                        <div
                          className="h-full bg-sky-400/80"
                          style={{
                            width: (mix.students ?? 0) + (mix.staff ?? 0) > 0
                              ? `${((mix.staff ?? 0) / Math.max((mix.students ?? 0) + (mix.staff ?? 0), 1)) * 100}%`
                              : "0%",
                          }}
                          aria-label="Minutos staff"
                          title={`Personal: ${Math.round(mix.staff ?? 0)} min`}
                        />
                      </div>
                      <span className="inline-flex items-center rounded-full bg-slate-700/60 px-2 py-1 text-xs font-semibold tabular-nums text-slate-200">
                        {ratio}×
                      </span>
                    </div>
                  );
                })}
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                    <span>Estudiantes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-400/80" />
                    <span>Personal</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 text-sm text-slate-400">
                Sin datos de staffing mix
              </div>
            )}
          </div>
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 md:p-6">
            <SectionTitle title="Carga por docente" description="Estudiantes promedio por hora." />
            <div className="mt-4">
              <LineAreaChart points={data?.studentLoad ?? []} />
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 md:p-6">
          <SectionTitle title="Cobertura en picos" description="Zonas de riesgo operativo." />
          {(data?.coverage ?? []).length > 0 ? (
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
          ) : (
            <div className="mt-4 flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 text-sm text-slate-400">
              Sin datos de cobertura
            </div>
          )}
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

  const { reload: reloadLearning } = learning;
  const { reload: reloadEngagement } = engagement;
  const { reload: reloadFinance } = finance;
  const { reload: reloadExams } = exams;
  const { reload: reloadPersonnel } = personnel;

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
    reloadFinance();
  }, [reloadFinance]);

  const handleRefreshComplete = useCallback(() => {
    reloadLearning();
    reloadEngagement();
    reloadExams();
    reloadPersonnel();
    if (financeUnlocked) {
      reloadFinance();
    }
  }, [
    financeUnlocked,
    reloadEngagement,
    reloadExams,
    reloadFinance,
    reloadLearning,
    reloadPersonnel,
  ]);

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
        <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex max-w-3xl flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-300">
              Administración
            </span>
            <h1 className="text-4xl font-black sm:text-[44px]">Reportes gerenciales</h1>
            <p className="text-sm text-slate-300">
              Visión del centro: aprendizaje, engagement, finanzas, exámenes y personal en tiempo real.
            </p>
            <Link
              href="/administracion"
              className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-slate-800/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-200 transition hover:-translate-y-[1px] hover:bg-slate-800/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              ← Volver al panel
            </Link>
          </div>
          <ManagementRefreshHeader onRefreshComplete={handleRefreshComplete} />
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
