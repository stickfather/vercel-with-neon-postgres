"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchJSON } from "@/lib/fetchJSON";
import type {
  ArrivalRow,
  HeatmapCell,
  HourTrendRow,
  SegmentSummaryRow,
  UtilizationAvgRow,
  UtilizationTodayRow,
} from "@/types/management.engagement";

const MIN_HOUR = 8;
const MAX_HOUR = 20;
const MINUTE_START = MIN_HOUR * 60;
const MINUTE_END = MAX_HOUR * 60;

const LANG_LABELS = {
  en: {
    utilization: "Hourly Utilization (Today vs 30-day Avg)",
    heatmap: "Engagement Heatmap (Day × Hour)",
    arrivals: "Arrivals by 15-minute Slot (Today)",
    segments: "Engagement Segments",
    noDataToday: "No data today yet. Check after first sessions begin.",
    hourTrendTitle: "Hour trend · last 60 days",
    students: "Students",
    sessionsPerWeek: "Sessions/week",
    minutesPerSession: "Minutes/session",
    concentration: "Concentration",
    avgHealth: "Avg health",
    segmentHealth: "Segment health",
  },
  es: {
    utilization: "Curva de utilización (hoy vs 30 días)",
    heatmap: "Mapa de calor (Día × Hora)",
    arrivals: "Llegadas por tramo de 15 min (hoy)",
    segments: "Segmentos de participación",
    noDataToday: "Aún no hay datos del día. Revisa cuando inicien las sesiones.",
    hourTrendTitle: "Tendencia por hora · últimos 60 días",
    students: "Estudiantes",
    sessionsPerWeek: "Sesiones/sem",
    minutesPerSession: "Minutos/sesión",
    concentration: "Concentración",
    avgHealth: "Salud prom.",
    segmentHealth: "Salud del segmento",
  },
};

const CARD_CLASS =
  "rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-lg shadow-slate-200/60 flex flex-col gap-6";

type Language = keyof typeof LANG_LABELS;

type UtilizationDataset = {
  today: UtilizationTodayRow[];
  avg: UtilizationAvgRow[];
};

type DashboardState = {
  loading: boolean;
  error: string | null;
};

function formatHourLabel(hour: number, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildLinePath(points: { minute: number; value: number }[], maxValue: number) {
  if (!points.length) return "";
  const clampedMax = Math.max(maxValue, 1);
  return points
    .map((point, index) => {
      const x = 60 + ((point.minute - MINUTE_START) / (MINUTE_END - MINUTE_START)) * 880;
      const y = 320 - (point.value / clampedMax) * 260;
      const command = index === 0 ? "M" : "L";
      return `${command}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function UtilizationChart({ data, language }: { data: UtilizationDataset; language: Language }) {
  const labels = LANG_LABELS[language];

  const maxValue = useMemo(() => {
    const todayMax = Math.max(0, ...data.today.map((row) => row.concurrent_sessions));
    const avgMax = Math.max(0, ...data.avg.map((row) => row.avg_concurrent));
    return Math.max(todayMax, avgMax, 1);
  }, [data]);

  const todayPath = useMemo(
    () =>
      buildLinePath(
        data.today.map((row) => ({
          minute: row.hour * 60 + row.minute,
          value: row.concurrent_sessions,
        })),
        maxValue,
      ),
    [data.today, maxValue],
  );

  const avgPath = useMemo(
    () =>
      buildLinePath(
        data.avg.map((row) => ({
          minute: row.hour * 60 + row.minute,
          value: row.avg_concurrent,
        })),
        maxValue,
      ),
    [data.avg, maxValue],
  );

  return (
    <section className={CARD_CLASS}>
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">{labels.utilization}</h2>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            <span>Today</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            <span>30d avg</span>
          </span>
        </div>
      </header>
      <div className="relative h-80 w-full">
        <svg viewBox="0 0 1000 360" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="util-bg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={1000} height={360} fill="url(#util-bg)" rx={28} />
          <AxisGrid maxValue={maxValue} />
          <path d={avgPath} fill="none" stroke="#94a3b8" strokeWidth={3} strokeLinecap="round" />
          <path d={todayPath} fill="none" stroke="#0ea5e9" strokeWidth={4} strokeLinecap="round" />
        </svg>
      </div>
      {!data.today.length && (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{labels.noDataToday}</p>
      )}
    </section>
  );
}

function AxisGrid({ maxValue }: { maxValue: number }) {
  const steps = 4;
  return (
    <g>
      {Array.from({ length: steps + 1 }).map((_, index) => {
        const value = Math.round((maxValue * index) / steps);
        const y = 320 - (index / steps) * 260;
        return (
          <g key={`y-${index}`}>
            <line x1={60} x2={940} y1={y} y2={y} stroke="#cbd5f5" strokeDasharray="4 6" strokeWidth={0.8} />
            <text x={20} y={y + 4} fontSize={20} fill="#64748b" fontFamily="var(--font-sans)">
              {value}
            </text>
          </g>
        );
      })}
      {Array.from({ length: MAX_HOUR - MIN_HOUR + 1 }).map((_, offset) => {
        const hour = MIN_HOUR + offset;
        const minute = hour * 60;
        const x = 60 + ((minute - MINUTE_START) / (MINUTE_END - MINUTE_START)) * 880;
        return (
          <g key={`x-${hour}`}>
            <line x1={x} x2={x} y1={60} y2={320} stroke="#e2e8f0" strokeWidth={0.8} />
            <text x={x} y={340} fontSize={20} fill="#475569" textAnchor="middle">
              {formatHourLabel(hour)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

const DOW_LABELS = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
};

function Heatmap({
  data,
  language,
  selectedHour,
  onSelectHour,
  trend,
}: {
  data: HeatmapCell[];
  language: Language;
  selectedHour: number | null;
  onSelectHour: (hour: number | null) => void;
  trend: HourTrendRow[];
}) {
  const labels = LANG_LABELS[language];
  const hours = useMemo(() => {
    const unique = new Set(data.map((cell) => cell.hour));
    return Array.from(unique).sort((a, b) => a - b);
  }, [data]);

  const maxConcurrent = useMemo(() => Math.max(1, ...data.map((cell) => cell.avg_concurrent)), [data]);

  const palette = ["#f8fafc", "#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8"];

  const colorFor = (value: number) => {
    const ratio = value / maxConcurrent;
    const index = Math.min(palette.length - 1, Math.floor(ratio * palette.length));
    return palette[index];
  };

  const dowLabels = DOW_LABELS[language];

  return (
    <section className={CARD_CLASS}>
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">{labels.heatmap}</h2>
        {selectedHour !== null && (
          <button
            type="button"
            onClick={() => onSelectHour(null)}
            className="text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            ×
          </button>
        )}
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-16 text-left text-xs font-semibold uppercase tracking-widest text-slate-500"></th>
              {hours.map((hour) => (
                <th key={hour} className="px-2 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  {formatHourLabel(hour)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 7 }).map((_, dow) => (
              <tr key={dow}>
                <th className="w-16 pr-2 text-left text-xs font-medium text-slate-600">{dowLabels[dow]}</th>
                {hours.map((hour) => {
                  const cell = data.find((item) => item.dow === dow && item.hour === hour);
                  const value = cell ? cell.avg_concurrent : 0;
                  const isSelected = selectedHour === hour;
                  return (
                    <td key={hour} className="p-0">
                      <button
                        type="button"
                        onClick={() => onSelectHour(hour)}
                        className={`h-12 w-12 rounded-lg border transition ${
                          isSelected ? "border-sky-500 shadow" : "border-transparent"
                        }`}
                        style={{ backgroundColor: colorFor(value) }}
                        aria-pressed={isSelected}
                      >
                        <span className="text-[11px] font-semibold text-slate-700">{Math.round(value)}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedHour !== null && trend.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {labels.hourTrendTitle}: {formatHourLabel(selectedHour)}
          </span>
          <Sparkline data={trend} />
        </div>
      )}
    </section>
  );
}

function Sparkline({ data }: { data: HourTrendRow[] }) {
  if (!data.length) return null;
  const maxValue = Math.max(1, ...data.map((row) => row.avg_concurrent));
  const path = data
    .map((row, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 320;
      const y = 80 - (row.avg_concurrent / maxValue) * 60;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 320 100" className="h-24 w-full">
      <rect x={0} y={0} width={320} height={100} fill="#bfdbfe" opacity={0.2} rx={16} />
      <path d={path} fill="none" stroke="#0ea5e9" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

function ArrivalsChart({ arrivals, language }: { arrivals: ArrivalRow[]; language: Language }) {
  const labels = LANG_LABELS[language];
  const maxArrivals = Math.max(1, ...arrivals.map((row) => row.arrivals));

  return (
    <section className={CARD_CLASS}>
      <header>
        <h2 className="text-xl font-semibold text-slate-900">{labels.arrivals}</h2>
      </header>
      <div className="relative h-72 w-full">
        <svg viewBox="0 0 1000 320" preserveAspectRatio="none" className="h-full w-full">
          <rect x={0} y={0} width={1000} height={320} fill="#f1f5f9" rx={28} />
          {arrivals.map((row) => {
            const minute = row.hour * 60 + row.minute;
            const x = 60 + ((minute - MINUTE_START) / (MINUTE_END - MINUTE_START)) * 880;
            const height = (row.arrivals / maxArrivals) * 220;
            return (
              <g key={row.slot_start}>
                <rect
                  x={x - 10}
                  y={260 - height}
                  width={20}
                  height={height}
                  fill="#0ea5e9"
                  rx={6}
                />
              </g>
            );
          })}
          {Array.from({ length: MAX_HOUR - MIN_HOUR + 1 }).map((_, offset) => {
            const hour = MIN_HOUR + offset;
            const minute = hour * 60;
            const x = 60 + ((minute - MINUTE_START) / (MINUTE_END - MINUTE_START)) * 880;
            return (
              <g key={`arr-hour-${hour}`}>
                <line x1={x} x2={x} y1={40} y2={260} stroke="#e2e8f0" strokeWidth={0.8} />
                <text x={x} y={300} fontSize={20} fill="#475569" textAnchor="middle">
                  {formatHourLabel(hour)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function SegmentTiles({ summaries, language }: { summaries: SegmentSummaryRow[]; language: Language }) {
  const labels = LANG_LABELS[language];
  return (
    <section className={CARD_CLASS}>
      <header>
        <h2 className="text-xl font-semibold text-slate-900">{labels.segments}</h2>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {summaries.map((segment) => {
          const healthPercent = Math.min(100, Math.max(0, segment.avg_segment_health_score));
          return (
            <article
              key={segment.primary_segment}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold text-slate-900">{segment.primary_segment}</h3>
                <span className="text-sm font-semibold text-slate-500">{labels.segmentHealth}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-slate-900">{healthPercent.toFixed(0)}</div>
                <div className="h-2 flex-1 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${healthPercent}%` }} />
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div>
                  <dt className="text-xs uppercase tracking-widest text-slate-500">{labels.students}</dt>
                  <dd className="text-base font-semibold text-slate-900">{segment.students.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-widest text-slate-500">{labels.sessionsPerWeek}</dt>
                  <dd className="text-base font-semibold text-slate-900">
                    {segment.avg_sessions_per_week.toFixed(1)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-widest text-slate-500">{labels.minutesPerSession}</dt>
                  <dd className="text-base font-semibold text-slate-900">
                    {segment.avg_minutes_per_session.toFixed(0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-widest text-slate-500">{labels.concentration}</dt>
                  <dd className="text-base font-semibold text-slate-900">
                    {segment.avg_concentration_index.toFixed(1)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-widest text-slate-500">{labels.avgHealth}</dt>
                  <dd className="text-base font-semibold text-slate-900">
                    {segment.avg_segment_health_score.toFixed(0)}
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}

type EngagementDashboardProps = {
  initialLanguage?: Language;
};

export function EngagementDashboard({ initialLanguage = "es" }: EngagementDashboardProps) {
  const language = initialLanguage;
  const [utilization, setUtilization] = useState<UtilizationDataset>({ today: [], avg: [] });
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [arrivals, setArrivals] = useState<ArrivalRow[]>([]);
  const [segments, setSegments] = useState<SegmentSummaryRow[]>([]);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [trend, setTrend] = useState<HourTrendRow[]>([]);
  const [state, setState] = useState<DashboardState>({ loading: true, error: null });

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: null });
    Promise.all([
      fetchJSON<UtilizationTodayRow[]>("/api/engagement/utilization/today"),
      fetchJSON<UtilizationAvgRow[]>("/api/engagement/utilization/avg30d"),
      fetchJSON<HeatmapCell[]>("/api/engagement/heatmap"),
      fetchJSON<ArrivalRow[]>("/api/engagement/arrivals/today"),
      fetchJSON<SegmentSummaryRow[]>("/api/engagement/segments/summary"),
    ])
      .then(([todayRows, avgRows, heatmapRows, arrivalRows, segmentRows]) => {
        if (!active) return;
        setUtilization({ today: todayRows, avg: avgRows });
        setHeatmap(heatmapRows);
        setArrivals(arrivalRows);
        setSegments(segmentRows);
        setState({ loading: false, error: null });
      })
      .catch((error) => {
        if (!active) return;
        setState({ loading: false, error: error instanceof Error ? error.message : "Failed to load" });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedHour === null) {
      setTrend([]);
      return;
    }
    let active = true;
    fetchJSON<HourTrendRow[]>(`/api/engagement/hour-trend/${selectedHour}`)
      .then((rows) => {
        if (!active) return;
        setTrend(rows);
      })
      .catch(() => {
        if (!active) return;
        setTrend([]);
      });
    return () => {
      active = false;
    };
  }, [selectedHour]);

  return (
    <div className="flex flex-col gap-10">
      {state.loading && (
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-500 shadow">
          Loading…
        </div>
      )}
      {state.error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}
      <UtilizationChart data={utilization} language={language} />
      <Heatmap
        data={heatmap}
        language={language}
        selectedHour={selectedHour}
        onSelectHour={(hour) => setSelectedHour((current) => (current === hour ? null : hour))}
        trend={trend}
      />
      <ArrivalsChart arrivals={arrivals} language={language} />
      <SegmentTiles summaries={segments} language={language} />
    </div>
  );
}
