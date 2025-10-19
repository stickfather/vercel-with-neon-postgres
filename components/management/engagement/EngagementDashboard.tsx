"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { fetchJSON } from "@/lib/fetchJSON";
import type {
  ArrivalRow,
  EngagementFilters,
  EngagementLensState,
  HeatmapCell,
  HourTrendRow,
  SegmentMemberRow,
  SegmentSummaryRow,
  StudentProfile,
  UtilizationAvgRow,
  UtilizationTodayRow,
} from "@/types/management.engagement";

const MIN_HOUR = 8;
const MAX_HOUR = 20;
const MINUTE_STEP = 15;
const MINUTE_START = MIN_HOUR * 60;
const MINUTE_END = MAX_HOUR * 60;
const DEFAULT_BRUSH: [number, number] = [MINUTE_START, MINUTE_END];
const LENS_PREFIX = "engagement:lens:";

const LANG_LABELS = {
  en: {
    title: "Engagement",
    subtitle:
      "Management Reports · Engagement overview for attendance, arrivals, and student segments.",
    utilization: "Hourly Utilization (Today vs 30-day Avg)",
    heatmap: "Engagement Heatmap (Day × Hour)",
    arrivals: "Arrivals by 15-minute Slot (Today)",
    segments: "Engagement Segments",
    segmentHealth: "Segment Health (0–100)",
    filters: "Filters",
    level: "Level",
    coach: "Coach",
    plan: "Plan",
    campus: "Campus",
    date: "Date",
    language: "Language",
    saveLens: "Save lens",
    manageLenses: "Saved lenses",
    noLenses: "No lenses saved yet.",
    noDataToday: "No data today yet. Check after first sessions begin.",
    compareLabel: "Compare segments",
    selectSegment: "Select segment",
    students: "Students",
    sessionsPerWeek: "Sessions/week",
    minutesPerSession: "Minutes/session",
    concentration: "Concentration",
    avgHealth: "Avg health",
    openSegment: "Open segment",
    close: "Close",
    members: "Members",
    viewStudent: "View student",
    radarAxes: ["Recency", "Frequency", "Intensity", "Concentration"],
    preferredHour: "Preferred hour",
    daysSinceLast: "Days since last attendance",
    distinctHours: "Distinct hours (30d)",
    concentrationIndex: "Concentration index",
    save: "Save",
    lensNamePlaceholder: "Lens name",
    loadLens: "Load",
    delete: "Delete",
    brushLabel: "Time window",
    highlight: "Highlighted hours",
    spike: "Spike",
    spikeMessage: "Arrivals in the last hour are up",
  },
  es: {
    title: "Participación",
    subtitle:
      "Panel Gerencial · Visión de asistencia, llegadas y segmentos de estudiantes.",
    utilization: "Curva de utilización (hoy vs 30 días)",
    heatmap: "Mapa de calor (Día × Hora)",
    arrivals: "Llegadas por tramo de 15 min (hoy)",
    segments: "Segmentos de participación",
    segmentHealth: "Salud del segmento (0–100)",
    filters: "Filtros",
    level: "Nivel",
    coach: "Coach",
    plan: "Plan",
    campus: "Campus",
    date: "Fecha",
    language: "Idioma",
    saveLens: "Guardar vista",
    manageLenses: "Vistas guardadas",
    noLenses: "Aún no guardas vistas.",
    noDataToday: "Aún no hay datos del día. Revisa cuando inicien las sesiones.",
    compareLabel: "Comparar segmentos",
    selectSegment: "Selecciona segmento",
    students: "Estudiantes",
    sessionsPerWeek: "Sesiones/sem",
    minutesPerSession: "Minutos/sesión",
    concentration: "Concentración",
    avgHealth: "Salud prom.",
    openSegment: "Abrir segmento",
    close: "Cerrar",
    members: "Integrantes",
    viewStudent: "Ver estudiante",
    radarAxes: ["Recencia", "Frecuencia", "Intensidad", "Concentración"],
    preferredHour: "Hora preferida",
    daysSinceLast: "Días desde última asistencia",
    distinctHours: "Horas distintas (30d)",
    concentrationIndex: "Índice de concentración",
    save: "Guardar",
    lensNamePlaceholder: "Nombre de vista",
    loadLens: "Cargar",
    delete: "Eliminar",
    brushLabel: "Ventana horaria",
    highlight: "Horas destacadas",
    spike: "Pico",
    spikeMessage: "Las llegadas en la última hora subieron",
  },
};

type Language = keyof typeof LANG_LABELS;

type UtilizationDataset = {
  today: UtilizationTodayRow[];
  avg: UtilizationAvgRow[];
};

type DashboardFetchState = {
  loading: boolean;
  error: string | null;
};

type SegmentDrawerState = {
  segment: string | null;
  loading: boolean;
  members: SegmentMemberRow[];
  error: string | null;
};

type StudentDrawerState = {
  studentId: number | null;
  loading: boolean;
  profile: StudentProfile | null;
  error: string | null;
};

function formatHourLabel(hour: number, minute = 0): string {
  const date = new Date();
  date.setHours(hour);
  date.setMinutes(minute);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minutesToLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return formatHourLabel(hour, minute);
}

function buildQueryString(filters: EngagementFilters): string {
  const params = new URLSearchParams();
  if (filters.level) params.set("level", filters.level);
  if (filters.coach) params.set("coach", filters.coach);
  if (filters.plan) params.set("plan", filters.plan);
  if (filters.campus) params.set("campus", filters.campus);
  if (filters.date) params.set("date", filters.date);
  return params.toString();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function clampBrush(value: number): number {
  if (value < MINUTE_START) return MINUTE_START;
  if (value > MINUTE_END) return MINUTE_END;
  return value;
}

type RangeSliderProps = {
  value: [number, number];
  onChange: (value: [number, number]) => void;
};

function RangeSlider({ value, onChange }: RangeSliderProps) {
  const [min, max] = value;

  const handleStartChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = clampBrush(Number(event.target.value));
    if (next <= max) onChange([next, max]);
  };

  const handleEndChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = clampBrush(Number(event.target.value));
    if (next >= min) onChange([min, next]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs font-medium text-slate-600">
        <span>{minutesToLabel(min)}</span>
        <span>{minutesToLabel(max)}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={MINUTE_START}
          max={MINUTE_END}
          step={MINUTE_STEP}
          value={min}
          onChange={handleStartChange}
          className="h-1 flex-1 cursor-pointer"
        />
        <input
          type="range"
          min={MINUTE_START}
          max={MINUTE_END}
          step={MINUTE_STEP}
          value={max}
          onChange={handleEndChange}
          className="h-1 flex-1 cursor-pointer"
        />
      </div>
    </div>
  );
}

type UtilizationChartProps = {
  data: UtilizationDataset;
  language: Language;
  brush: [number, number];
  onBrushChange: (next: [number, number]) => void;
};

function UtilizationChart({ data, language, brush, onBrushChange }: UtilizationChartProps) {
  const labels = LANG_LABELS[language];
  const minutesRange = useMemo(() => {
    return data.today.map((row) => row.hour * 60 + row.minute);
  }, [data.today]);

  const maxValue = useMemo(() => {
    const todayMax = Math.max(0, ...data.today.map((row) => row.concurrent_sessions));
    const avgMax = Math.max(0, ...data.avg.map((row) => row.avg_concurrent));
    return Math.max(todayMax, avgMax, 1);
  }, [data]);

  const pathToday = useMemo(() => {
    return buildLinePath(data.today.map((row) => ({
      minute: row.hour * 60 + row.minute,
      value: row.concurrent_sessions,
    })), maxValue);
  }, [data.today, maxValue]);

  const pathAvg = useMemo(() => {
    return buildLinePath(data.avg.map((row) => ({
      minute: row.hour * 60 + row.minute,
      value: row.avg_concurrent,
    })), maxValue);
  }, [data.avg, maxValue]);

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-lg shadow-slate-200/50">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{labels.utilization}</h2>
        <div className="flex flex-col items-end text-xs text-slate-500">
          <span>
            {labels.brushLabel}: {minutesToLabel(brush[0])} – {minutesToLabel(brush[1])}
          </span>
          <span>{labels.highlight}: {brush[1] - brush[0]} min</span>
        </div>
      </header>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)]">
        <div className="relative h-64 w-full">
          <svg viewBox="0 0 1000 320" preserveAspectRatio="none" className="h-full w-full">
            <rect x={0} y={0} width={1000} height={320} fill="#f8fafc" rx={20} />
            <AxisGrid maxValue={maxValue} />
            <path d={pathAvg} fill="none" stroke="#94a3b8" strokeWidth={3} />
            <path d={pathToday} fill="none" stroke="#0ea5e9" strokeWidth={4} strokeLinecap="round" />
            {brushToRect(brush).map((rect) => (
              <rect
                key={`${rect.x}-${rect.width}`}
                x={rect.x}
                y={0}
                width={rect.width}
                height={320}
                fill="#0ea5e9"
                opacity={0.08}
              />
            ))}
          </svg>
        </div>
        <RangeSlider value={brush} onChange={onBrushChange} />
      </div>
      {!minutesRange.length && (
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">{labels.noDataToday}</p>
      )}
    </section>
  );
}

type AxisGridProps = {
  maxValue: number;
};

function AxisGrid({ maxValue }: AxisGridProps) {
  const steps = 4;
  const lines = Array.from({ length: steps + 1 }, (_, index) => index);
  return (
    <g>
      {lines.map((step) => {
        const y = 300 - (step / steps) * 260;
        const value = Math.round((maxValue * step) / steps);
        return (
          <g key={step}>
            <line x1={60} x2={980} y1={y} y2={y} stroke="#cbd5f5" strokeDasharray="4 6" strokeWidth={0.8} />
            <text x={20} y={y + 4} fontSize={20} fill="#64748b" fontFamily="var(--font-sans)">
              {value}
            </text>
          </g>
        );
      })}
      {Array.from({ length: MAX_HOUR - MIN_HOUR + 1 }).map((_, index) => {
        const minute = (MIN_HOUR + index) * 60;
        const x = 60 + ((minute - MINUTE_START) / (MINUTE_END - MINUTE_START)) * 920;
        return (
          <g key={minute}>
            <line x1={x} x2={x} y1={40} y2={300} stroke="#e2e8f0" strokeWidth={0.8} />
            <text x={x} y={310} fontSize={20} fill="#475569" textAnchor="middle">
              {formatHourLabel(MIN_HOUR + index)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

type LinePoint = {
  minute: number;
  value: number;
};

function buildLinePath(points: LinePoint[], maxValue: number): string {
  if (!points.length) return "";
  const clampedMax = Math.max(maxValue, 1);
  const coords = points.map((point) => {
    const x = 60 + ((point.minute - MINUTE_START) / (MINUTE_END - MINUTE_START)) * 920;
    const y = 300 - (point.value / clampedMax) * 260;
    return [x, y];
  });
  return coords
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
}

function brushToRect([start, end]: [number, number]) {
  const x1 = 60 + ((start - MINUTE_START) / (MINUTE_END - MINUTE_START)) * 920;
  const x2 = 60 + ((end - MINUTE_START) / (MINUTE_END - MINUTE_START)) * 920;
  return [{ x: x1, width: Math.max(x2 - x1, 0) }];
}

type HeatmapProps = {
  data: HeatmapCell[];
  language: Language;
  highlightHours: Set<number>;
  onSelectHour: (hour: number) => void;
  selectedHour: number | null;
  trend: HourTrendRow[];
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_LABELS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function Heatmap({ data, language, highlightHours, onSelectHour, selectedHour, trend }: HeatmapProps) {
  const hourValues = useMemo(() => {
    const unique = new Set<number>();
    data.forEach((cell) => unique.add(cell.hour));
    return Array.from(unique).sort((a, b) => a - b);
  }, [data]);

  const maxConcurrent = useMemo(() => {
    return Math.max(1, ...data.map((cell) => cell.avg_concurrent));
  }, [data]);

  const quantize = useCallback(
    (value: number) => {
      const buckets = 6;
      const ratio = value / maxConcurrent;
      const index = Math.min(buckets - 1, Math.floor(ratio * buckets));
      const palette = ["#f1f5f9", "#cbd5f5", "#94a3b8", "#60a5fa", "#3b82f6", "#1e3a8a"];
      return palette[index];
    },
    [maxConcurrent],
  );

  const dowLabels = language === "en" ? DOW_LABELS : DOW_LABELS_ES;

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-lg shadow-slate-200/50">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{LANG_LABELS[language].heatmap}</h2>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-16 text-left text-xs font-semibold uppercase tracking-widest text-slate-500"></th>
              {hourValues.map((hour) => (
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
                {hourValues.map((hour) => {
                  const cell = data.find((item) => item.dow === dow && item.hour === hour);
                  const highlight = highlightHours.has(hour);
                  const isSelected = selectedHour === hour;
                  const color = cell ? quantize(cell.avg_concurrent) : "#f8fafc";
                  return (
                    <td key={hour} className="p-0">
                      <button
                        type="button"
                        onClick={() => onSelectHour(hour)}
                        className={`h-12 w-12 rounded-lg border transition ${
                          isSelected ? "border-sky-500 shadow" : "border-transparent"
                        }`}
                        style={{
                          backgroundColor: color,
                          opacity: highlight ? 1 : 0.55,
                        }}
                      >
                        {cell ? (
                          <span className="text-[11px] font-semibold text-slate-700">
                            {Math.round(cell.avg_concurrent)}
                          </span>
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedHour !== null && (
        <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {formatHourLabel(selectedHour)} · 60d
          </span>
          <Sparkline data={trend} />
        </div>
      )}
    </section>
  );
}

type SparklineProps = {
  data: HourTrendRow[];
};

function Sparkline({ data }: SparklineProps) {
  const maxConcurrent = Math.max(1, ...data.map((row) => row.avg_concurrent));
  const coords = data.map((row, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * 300;
    const y = 60 - (row.avg_concurrent / maxConcurrent) * 50;
    return [x, y];
  });

  const path = coords
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox="0 0 300 80" className="h-20 w-full">
      <rect x={0} y={0} width={300} height={80} fill="#e2e8f0" opacity={0.3} rx={16} />
      <path d={path} fill="none" stroke="#0ea5e9" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

type ArrivalsProps = {
  arrivals: ArrivalRow[];
  language: Language;
  brush: [number, number];
};

function ArrivalsChart({ arrivals, language, brush }: ArrivalsProps) {
  const filtered = arrivals.filter((row) => {
    const minute = row.hour * 60 + row.minute;
    return minute >= brush[0] && minute <= brush[1];
  });

  const maxArrivals = Math.max(1, ...arrivals.map((row) => row.arrivals));
  const lastHourTotal = arrivals
    .filter((row) => {
      const minute = row.hour * 60 + row.minute;
      return minute >= MINUTE_END - 60;
    })
    .reduce((sum, row) => sum + row.arrivals, 0);

  const avgLastHour = arrivals
    .filter((row) => row.hour * 60 + row.minute < MINUTE_END - 60)
    .reduce((sum, row, _, array) => sum + row.arrivals / Math.max(array.length, 1), 0);

  const spike = avgLastHour > 0 && lastHourTotal > avgLastHour * 1.3;

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-lg shadow-slate-200/50">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{LANG_LABELS[language].arrivals}</h2>
        {spike && (
          <span className="flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            {LANG_LABELS[language].spike}
          </span>
        )}
      </header>
      <div className="relative h-56 w-full">
        <svg viewBox="0 0 1000 260" className="h-full w-full">
          <rect x={0} y={0} width={1000} height={260} fill="#f8fafc" rx={20} />
          {arrivals.map((row) => {
            const minute = row.hour * 60 + row.minute;
            const height = (row.arrivals / maxArrivals) * 200;
            const x = 60 + ((minute - MINUTE_START) / (MINUTE_END - MINUTE_START)) * 900;
            const y = 220 - height;
            const inRange = filtered.includes(row);
            return (
              <rect
                key={`${row.slot_start}`}
                x={x}
                y={y}
                width={12}
                height={height}
                fill={inRange ? "#0ea5e9" : "#cbd5f5"}
                opacity={inRange ? 0.9 : 0.4}
                rx={3}
              />
            );
          })}
        </svg>
      </div>
      {spike && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {LANG_LABELS[language].spikeMessage}
        </p>
      )}
    </section>
  );
}

type SegmentTilesProps = {
  summaries: SegmentSummaryRow[];
  language: Language;
  onOpenSegment: (segment: string) => void;
  comparison: [string | null, string | null];
  onUpdateComparison: (index: 0 | 1, value: string | null) => void;
};

function SegmentTiles({ summaries, language, onOpenSegment, comparison, onUpdateComparison }: SegmentTilesProps) {
  const labels = LANG_LABELS[language];
  const total = summaries.reduce((sum, row) => sum + row.students, 0);

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-lg shadow-slate-200/50">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{labels.segments}</h2>
          <p className="text-xs text-slate-500">
            {labels.students}: {total.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            <span>{labels.compareLabel}</span>
            <select
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
              value={comparison[0] ?? ""}
              onChange={(event) => onUpdateComparison(0, event.target.value || null)}
            >
              <option value="">—</option>
              {summaries.map((row) => (
                <option key={row.primary_segment} value={row.primary_segment}>
                  {row.primary_segment}
                </option>
              ))}
            </select>
          </label>
          <select
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
            value={comparison[1] ?? ""}
            onChange={(event) => onUpdateComparison(1, event.target.value || null)}
          >
            <option value="">—</option>
            {summaries.map((row) => (
              <option key={row.primary_segment} value={row.primary_segment}>
                {row.primary_segment}
              </option>
            ))}
          </select>
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaries.map((row) => (
          <button
            key={row.primary_segment}
            type="button"
            onClick={() => onOpenSegment(row.primary_segment)}
            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="text-sm font-semibold text-slate-500">{row.primary_segment}</span>
            <strong className="text-3xl font-bold text-slate-900">{row.students.toLocaleString()}</strong>
            <div className="text-xs text-slate-600">
              <div>
                {labels.sessionsPerWeek}: {row.avg_sessions_per_week.toFixed(1)}
              </div>
              <div>
                {labels.minutesPerSession}: {row.avg_minutes_per_session.toFixed(0)}
              </div>
              <div>
                {labels.concentration}: {row.avg_concentration_index.toFixed(1)}
              </div>
            </div>
            <div className="mt-2 text-sm font-semibold text-sky-600">
              {labels.avgHealth}: {row.avg_segment_health_score.toFixed(0)}
            </div>
          </button>
        ))}
      </div>
      <SegmentComparisonTable summaries={summaries} selection={comparison} language={language} />
    </section>
  );
}

type SegmentComparisonTableProps = {
  summaries: SegmentSummaryRow[];
  selection: [string | null, string | null];
  language: Language;
};

function SegmentComparisonTable({ summaries, selection, language }: SegmentComparisonTableProps) {
  const labels = LANG_LABELS[language];
  const [first, second] = selection;
  const firstRow = summaries.find((row) => row.primary_segment === first) ?? null;
  const secondRow = summaries.find((row) => row.primary_segment === second) ?? null;

  if (!firstRow && !secondRow) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full table-fixed text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">{labels.segments}</th>
            <th className="px-4 py-3">{labels.students}</th>
            <th className="px-4 py-3">{labels.sessionsPerWeek}</th>
            <th className="px-4 py-3">{labels.minutesPerSession}</th>
            <th className="px-4 py-3">{labels.concentration}</th>
            <th className="px-4 py-3">{labels.avgHealth}</th>
          </tr>
        </thead>
        <tbody>
          {[firstRow, secondRow].filter(Boolean).map((row) => (
            <tr key={row!.primary_segment} className="odd:bg-white even:bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-700">{row!.primary_segment}</td>
              <td className="px-4 py-3">{row!.students.toLocaleString()}</td>
              <td className="px-4 py-3">{row!.avg_sessions_per_week.toFixed(1)}</td>
              <td className="px-4 py-3">{row!.avg_minutes_per_session.toFixed(0)}</td>
              <td className="px-4 py-3">{row!.avg_concentration_index.toFixed(1)}</td>
              <td className="px-4 py-3">{row!.avg_segment_health_score.toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type DrawerProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  language: Language;
};

function Drawer({ title, onClose, children, language }: DrawerProps) {
  const labels = LANG_LABELS[language];
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-sm">
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600"
          >
            {labels.close}
          </button>
        </header>
        <div className="space-y-6 px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

type SegmentDrawerProps = {
  state: SegmentDrawerState;
  onClose: () => void;
  onViewStudent: (studentId: number) => void;
  language: Language;
};

function SegmentDrawer({ state, onClose, onViewStudent, language }: SegmentDrawerProps) {
  const labels = LANG_LABELS[language];
  if (!state.segment) return null;

  const averages = computeSegmentAverages(state.members);

  return (
    <Drawer title={`${state.segment}`} onClose={onClose} language={language}>
      <div className="flex flex-col gap-4 text-sm text-slate-600">
        <div>
          <span className="font-semibold text-slate-700">{labels.segmentHealth}</span>
          <div className="text-2xl font-bold text-slate-900">
            {averages.health.toFixed(0)}
          </div>
        </div>
        <RadarChart
          language={language}
          values={[
            averages.recency,
            averages.frequency,
            averages.intensity,
            averages.concentration,
          ]}
        />
        <div className="grid gap-4 text-xs text-slate-600 md:grid-cols-2">
          <div>
            {labels.sessionsPerWeek}: {averages.sessions.toFixed(1)}
          </div>
          <div>
            {labels.minutesPerSession}: {averages.minutes.toFixed(0)}
          </div>
          <div>
            {labels.concentration}: {averages.concentrationIndex.toFixed(1)}
          </div>
          <div>
            {labels.students}: {state.members.length.toLocaleString()}
          </div>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-slate-700">{labels.members}</h4>
        <div className="flex flex-col divide-y divide-slate-200 rounded-2xl border border-slate-200">
          {state.loading && (
            <div className="px-4 py-3 text-sm text-slate-500">Loading…</div>
          )}
          {state.error && (
            <div className="px-4 py-3 text-sm text-red-600">{state.error}</div>
          )}
          {!state.loading && !state.error &&
            state.members.map((member) => (
              <button
                key={member.student_id}
                type="button"
                onClick={() => onViewStudent(member.student_id)}
                className="flex items-center justify-between px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <div>
                  <div className="font-semibold">#{member.student_id}</div>
                  <div className="text-xs text-slate-500">
                    {labels.sessionsPerWeek}: {member.sessions_per_week.toFixed(1)} · {labels.avgHealth}: {" "}
                    {member.segment_health_score ? member.segment_health_score.toFixed(0) : "—"}
                  </div>
                </div>
                <span className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500">
                  {labels.viewStudent}
                </span>
              </button>
            ))}
        </div>
      </div>
    </Drawer>
  );
}

type RadarChartProps = {
  values: Array<number | null>;
  language: Language;
};

function RadarChart({ values, language }: RadarChartProps) {
  const normalized = values.map((value) => (value ?? 0) * 100);
  const axes = LANG_LABELS[language].radarAxes;

  const points = normalized.map((value, index) => {
    const angle = (Math.PI * 2 * index) / normalized.length - Math.PI / 2;
    const radius = 100;
    const x = 120 + (Math.cos(angle) * value * radius) / 100;
    const y = 120 + (Math.sin(angle) * value * radius) / 100;
    return `${x},${y}`;
  });

  return (
    <svg viewBox="0 0 240 240" className="h-56 w-full">
      <circle cx={120} cy={120} r={110} fill="#f1f5f9" stroke="#cbd5f5" />
      <polygon points="120,10 230,120 120,230 10,120" fill="none" stroke="#cbd5f5" strokeDasharray="6 6" />
      <polygon points={points.join(" ")} fill="#0ea5e9" opacity={0.25} stroke="#0ea5e9" strokeWidth={2} />
      {axes.map((axis, index) => {
        const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
        const x = 120 + Math.cos(angle) * 110;
        const y = 120 + Math.sin(angle) * 110;
        return (
          <text key={axis} x={x} y={y} fontSize={12} fill="#334155" textAnchor="middle">
            {axis}
          </text>
        );
      })}
    </svg>
  );
}

type StudentDrawerProps = {
  state: StudentDrawerState;
  language: Language;
  onClose: () => void;
};

function StudentDrawer({ state, language, onClose }: StudentDrawerProps) {
  const labels = LANG_LABELS[language];
  if (!state.studentId) return null;

  const metrics = state.profile?.segment;
  const time = state.profile?.timeProfile;

  return (
    <Drawer title={`Student #${state.studentId}`} onClose={onClose} language={language}>
      {state.loading && <p className="text-sm text-slate-500">Loading…</p>}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {!state.loading && !state.error && metrics && (
        <div className="space-y-4 text-sm text-slate-600">
          <div>
            <span className="font-semibold text-slate-700">{labels.segmentHealth}</span>
            <div className="text-2xl font-bold text-slate-900">
              {metrics.segment_health_score ? metrics.segment_health_score.toFixed(0) : "—"}
            </div>
          </div>
          <RadarChart
            values={[
              metrics.recency_norm,
              metrics.freq_norm,
              metrics.intensity_norm,
              metrics.concentration_norm,
            ]}
            language={language}
          />
          <div className="grid gap-4 text-xs text-slate-600 md:grid-cols-2">
            <div>
              {labels.sessionsPerWeek}: {metrics.sessions_per_week.toFixed(1)}
            </div>
            <div>
              {labels.minutesPerSession}: {metrics.avg_minutes_30d.toFixed(0)}
            </div>
            <div>
              {labels.daysSinceLast}: {metrics.days_since_last ?? "—"}
            </div>
            <div>
              {labels.distinctHours}: {metrics.distinct_hours_30d ?? "—"}
            </div>
          </div>
          {time && (
            <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
              <div>
                {labels.preferredHour}: {time.preferred_hour !== null ? formatHourLabel(time.preferred_hour) : "—"}
              </div>
              <div>
                {labels.concentrationIndex}: {time.concentration_index !== null ? time.concentration_index.toFixed(1) : "—"}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

type LensManagerProps = {
  lenses: EngagementLensState[];
  onSave: (name: string) => void;
  onLoad: (lens: EngagementLensState) => void;
  onDelete: (lens: EngagementLensState) => void;
  language: Language;
};

function LensManager({ lenses, onSave, onLoad, onDelete, language }: LensManagerProps) {
  const labels = LANG_LABELS[language];
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={labels.lensNamePlaceholder}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            if (name.trim()) {
              onSave(name.trim());
              setName("");
            }
          }}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-600"
        >
          {labels.save}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {lenses.length === 0 && <p className="text-xs text-slate-500">{labels.noLenses}</p>}
        {lenses.map((lens) => (
          <div key={lens.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <div className="flex flex-col">
              <span className="font-semibold text-slate-700">{lens.name}</span>
              <span className="text-xs text-slate-500">
                {lens.language.toUpperCase()} · {Object.entries(lens.filters)
                  .filter(([, value]) => value)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(", ") || "All"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onLoad(lens)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs"
              >
                {labels.loadLens}
              </button>
              <button
                type="button"
                onClick={() => onDelete(lens)}
                className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600"
              >
                {labels.delete}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type FilterBarProps = {
  filters: EngagementFilters;
  onChange: (filters: EngagementFilters) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  lenses: EngagementLensState[];
  onSaveLens: (name: string) => void;
  onLoadLens: (lens: EngagementLensState) => void;
  onDeleteLens: (lens: EngagementLensState) => void;
};

function FilterBar({
  filters,
  onChange,
  language,
  onLanguageChange,
  lenses,
  onSaveLens,
  onLoadLens,
  onDeleteLens,
}: FilterBarProps) {
  const labels = LANG_LABELS[language];

  const updateFilter = (key: keyof EngagementFilters, value: string | null) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="sticky top-0 z-40 flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl shadow-slate-200/40 backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">{labels.filters}</span>
          <h1 className="text-2xl font-black text-slate-900">{LANG_LABELS[language].title}</h1>
          <p className="text-sm text-slate-600">{LANG_LABELS[language].subtitle}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>{labels.language}</span>
          <div className="flex overflow-hidden rounded-full border border-slate-200">
            {(["en", "es"] as Language[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onLanguageChange(code)}
                className={`px-3 py-1 text-sm font-semibold transition ${
                  language === code ? "bg-sky-500 text-white" : "bg-white text-slate-600"
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <input
          type="text"
          placeholder={labels.level}
          value={filters.level ?? ""}
          onChange={(event) => updateFilter("level", event.target.value || null)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder={labels.coach}
          value={filters.coach ?? ""}
          onChange={(event) => updateFilter("coach", event.target.value || null)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder={labels.plan}
          value={filters.plan ?? ""}
          onChange={(event) => updateFilter("plan", event.target.value || null)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder={labels.campus}
          value={filters.campus ?? ""}
          onChange={(event) => updateFilter("campus", event.target.value || null)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={filters.date ?? ""}
          onChange={(event) => updateFilter("date", event.target.value || null)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <LensManager
          lenses={lenses}
          onSave={onSaveLens}
          onLoad={onLoadLens}
          onDelete={onDeleteLens}
          language={language}
        />
      </div>
    </div>
  );
}

function computeSegmentAverages(members: SegmentMemberRow[]) {
  if (!members.length) {
    return {
      sessions: 0,
      minutes: 0,
      concentrationIndex: 0,
      health: 0,
      recency: 0,
      frequency: 0,
      intensity: 0,
      concentration: 0,
    };
  }
  const totals = members.reduce(
    (acc, member) => {
      acc.sessions += member.sessions_per_week;
      acc.minutes += member.avg_minutes_30d;
      acc.concentrationIndex += member.concentration_index;
      acc.health += member.segment_health_score ?? 0;
      acc.recency += member.recency_norm ?? 0;
      acc.frequency += member.freq_norm ?? 0;
      acc.intensity += member.intensity_norm ?? 0;
      acc.concentration += member.concentration_norm ?? 0;
      return acc;
    },
    {
      sessions: 0,
      minutes: 0,
      concentrationIndex: 0,
      health: 0,
      recency: 0,
      frequency: 0,
      intensity: 0,
      concentration: 0,
    },
  );

  const count = members.length;
  return {
    sessions: totals.sessions / count,
    minutes: totals.minutes / count,
    concentrationIndex: totals.concentrationIndex / count,
    health: totals.health / count,
    recency: totals.recency / count,
    frequency: totals.frequency / count,
    intensity: totals.intensity / count,
    concentration: totals.concentration / count,
  };
}

type EngagementDashboardProps = {
  initialLanguage?: Language;
};

export function EngagementDashboard({ initialLanguage = "es" }: EngagementDashboardProps) {
  const [filters, setFilters] = useState<EngagementFilters>({ date: new Date().toISOString().slice(0, 10) });
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [brush, setBrush] = useState<[number, number]>(DEFAULT_BRUSH);
  const [utilization, setUtilization] = useState<UtilizationDataset>({ today: [], avg: [] });
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [arrivals, setArrivals] = useState<ArrivalRow[]>([]);
  const [segments, setSegments] = useState<SegmentSummaryRow[]>([]);
  const [fetchState, setFetchState] = useState<DashboardFetchState>({ loading: false, error: null });
  const [segmentDrawer, setSegmentDrawer] = useState<SegmentDrawerState>({
    segment: null,
    loading: false,
    members: [],
    error: null,
  });
  const [studentDrawer, setStudentDrawer] = useState<StudentDrawerState>({
    studentId: null,
    loading: false,
    profile: null,
    error: null,
  });
  const [hourSelection, setHourSelection] = useState<number | null>(null);
  const [hourTrend, setHourTrend] = useState<HourTrendRow[]>([]);
  const [comparison, setComparison] = useState<[string | null, string | null]>([null, null]);
  const [lenses, setLenses] = useState<EngagementLensState[]>([]);

  const query = useMemo(() => buildQueryString(filters), [filters]);

  useEffect(() => {
    let active = true;
    setFetchState({ loading: true, error: null });
    const base = query ? `?${query}` : "";
    Promise.all([
      fetchJSON<UtilizationTodayRow[]>(`/api/engagement/utilization/today${base}`),
      fetchJSON<UtilizationAvgRow[]>(`/api/engagement/utilization/avg30d${base}`),
      fetchJSON<HeatmapCell[]>(`/api/engagement/heatmap${base}`),
      fetchJSON<ArrivalRow[]>(`/api/engagement/arrivals/today${base}`),
      fetchJSON<SegmentSummaryRow[]>(`/api/engagement/segments/summary${base}`),
    ])
      .then(([todayRows, avgRows, heatmapRows, arrivalRows, summaryRows]) => {
        if (!active) return;
        setUtilization({ today: todayRows, avg: avgRows });
        setHeatmap(heatmapRows);
        setArrivals(arrivalRows);
        setSegments(summaryRows);
        setFetchState({ loading: false, error: null });
      })
      .catch((error) => {
        console.error(error);
        if (!active) return;
        setFetchState({ loading: false, error: error instanceof Error ? error.message : "Failed to load" });
      });
    return () => {
      active = false;
    };
  }, [query]);

  useEffect(() => {
    if (hourSelection === null) return;
    let active = true;
    fetchJSON<HourTrendRow[]>(`/api/engagement/hour-trend/${hourSelection}`)
      .then((rows) => {
        if (!active) return;
        setHourTrend(rows);
      })
      .catch((error) => {
        console.error(error);
      });
    return () => {
      active = false;
    };
  }, [hourSelection]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved: EngagementLensState[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(LENS_PREFIX)) {
        try {
          const payload = window.localStorage.getItem(key);
          if (!payload) continue;
          const parsed = JSON.parse(payload) as EngagementLensState;
          saved.push(parsed);
        } catch (error) {
          console.warn("Failed to parse lens", error);
        }
      }
    }
    setLenses(saved);
  }, []);

  const highlightHours = useMemo(() => {
    const hours = new Set<number>();
    for (let minute = brush[0]; minute <= brush[1]; minute += 60) {
      hours.add(Math.floor(minute / 60));
    }
    return hours;
  }, [brush]);

  const handleOpenSegment = (segment: string) => {
    setSegmentDrawer({ segment, loading: true, members: [], error: null });
    const filtersQuery = query ? `&${query}` : "";
    fetchJSON<SegmentMemberRow[]>(
      `/api/engagement/segments/members?primary_segment=${encodeURIComponent(segment)}${filtersQuery}`,
    )
      .then((rows) => {
        setSegmentDrawer({ segment, loading: false, members: rows, error: null });
      })
      .catch((error) => {
        setSegmentDrawer({ segment, loading: false, members: [], error: error instanceof Error ? error.message : "Failed" });
      });
  };

  const handleViewStudent = (studentId: number) => {
    setStudentDrawer({ studentId, loading: true, profile: null, error: null });
    fetchJSON<StudentProfile>(`/api/engagement/student/${studentId}`)
      .then((profile) => {
        setStudentDrawer({ studentId, loading: false, profile, error: null });
      })
      .catch((error) => {
        setStudentDrawer({ studentId, loading: false, profile: null, error: error instanceof Error ? error.message : "Failed" });
      });
  };

  const handleSaveLens = (name: string) => {
    if (typeof window === "undefined") return;
    const slug = slugify(name);
    if (!slug) return;
    const lens: EngagementLensState = {
      name,
      language,
      filters,
      brush,
    };
    window.localStorage.setItem(`${LENS_PREFIX}${slug}`, JSON.stringify(lens));
    setLenses((current) => {
      const without = current.filter((item) => item.name !== name);
      return [...without, lens];
    });
  };

  const handleLoadLens = (lens: EngagementLensState) => {
    setLanguage(lens.language);
    setFilters(lens.filters);
    setBrush(lens.brush);
  };

  const handleDeleteLens = (lens: EngagementLensState) => {
    if (typeof window === "undefined") return;
    const slug = slugify(lens.name);
    window.localStorage.removeItem(`${LENS_PREFIX}${slug}`);
    setLenses((current) => current.filter((item) => item.name !== lens.name));
  };

  const labels = LANG_LABELS[language];

  return (
    <div className="flex flex-col gap-8">
      <FilterBar
        filters={filters}
        onChange={setFilters}
        language={language}
        onLanguageChange={setLanguage}
        lenses={lenses}
        onSaveLens={handleSaveLens}
        onLoadLens={handleLoadLens}
        onDeleteLens={handleDeleteLens}
      />
      {fetchState.error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {fetchState.error}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <UtilizationChart data={utilization} language={language} brush={brush} onBrushChange={setBrush} />
        <Heatmap
          data={heatmap}
          language={language}
          highlightHours={highlightHours}
          onSelectHour={setHourSelection}
          selectedHour={hourSelection}
          trend={hourTrend}
        />
        <ArrivalsChart arrivals={arrivals} language={language} brush={brush} />
        <SegmentTiles
          summaries={segments}
          language={language}
          onOpenSegment={handleOpenSegment}
          comparison={comparison}
          onUpdateComparison={(index, value) => {
            setComparison((current) => {
              const next: [string | null, string | null] = [...current] as [string | null, string | null];
              next[index] = value;
              return next;
            });
          }}
        />
      </div>
      <SegmentDrawer
        state={segmentDrawer}
        onClose={() => setSegmentDrawer({ segment: null, loading: false, members: [], error: null })}
        onViewStudent={handleViewStudent}
        language={language}
      />
      <StudentDrawer
        state={studentDrawer}
        onClose={() => setStudentDrawer({ studentId: null, loading: false, profile: null, error: null })}
        language={language}
      />
    </div>
  );
}
