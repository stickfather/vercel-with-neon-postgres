"use client";

import { useMemo, useState } from "react";
import type {
  PeakLoadWindowRow,
  StaffByHourRow,
  StudentStaffRatioRow,
  StudentsByHourRow,
} from "../../data/ops.read";
import {
  clampRatio,
  createHeatmapLookup,
  filterRowsByHourRange,
  formatHourLabel,
  getDowLabel,
  hasOpsData,
  normalizeRatioDisplay,
  selectHourRange,
  sortPeakWindows,
} from "./transform";

const integerFormatter = new Intl.NumberFormat("es-EC");
const decimalFormatter = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 });

const ratioFormatter = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 });

function buildHours(range: { start: number; end: number }) {
  const hours: number[] = [];
  for (let hour = range.start; hour <= range.end; hour += 1) {
    hours.push(hour);
  }
  return hours;
}

type OpsContentProps = {
  students: StudentsByHourRow[];
  staff: StaffByHourRow[];
  ratios: StudentStaffRatioRow[];
  peaks: PeakLoadWindowRow[];
};

export default function OpsContent({ students, staff, ratios, peaks }: OpsContentProps) {
  const [showAllHours, setShowAllHours] = useState(false);
  const [metric, setMetric] = useState<"avg" | "p95">("avg");

  const hourRange = useMemo(() => selectHourRange(showAllHours), [showAllHours]);
  const hours = useMemo(() => buildHours(hourRange), [hourRange]);

  const filteredStudents = useMemo(() => filterRowsByHourRange(students, hourRange), [students, hourRange]);
  const filteredStaff = useMemo(() => filterRowsByHourRange(staff, hourRange), [staff, hourRange]);
  const filteredRatios = useMemo(() => filterRowsByHourRange(ratios, hourRange), [ratios, hourRange]);

  const studentLookup = useMemo(() => createHeatmapLookup(filteredStudents), [filteredStudents]);
  const staffLookup = useMemo(() => createHeatmapLookup(filteredStaff), [filteredStaff]);
  const ratioLookup = useMemo(() => createHeatmapLookup(filteredRatios), [filteredRatios]);

  const metricKeyStudents = metric === "avg" ? "avg_students" : "p95_students";
  const metricKeyStaff = metric === "avg" ? "avg_staff" : "p95_staff";

  const studentsMax = useMemo(
    () =>
      filteredStudents.reduce((max, row) => {
        const value = row[metricKeyStudents];
        if (value === null || value === undefined) return max;
        return Math.max(max, Number(value));
      }, 0),
    [filteredStudents, metricKeyStudents],
  );
  const staffMax = useMemo(
    () =>
      filteredStaff.reduce((max, row) => {
        const value = row[metricKeyStaff as keyof StaffByHourRow] as number | null | undefined;
        if (value === null || value === undefined) return max;
        return Math.max(max, Number(value));
      }, 0),
    [filteredStaff, metricKeyStaff],
  );

  const heatmapMax = useMemo(() => Math.max(studentsMax, staffMax, 0), [studentsMax, staffMax]);

  const ratioMax = useMemo(() => {
    return filteredRatios.reduce((max, row) => {
      const normalized = clampRatio(row.avg_student_staff_ratio);
      if (normalized === null) return max;
      return Math.max(max, normalized);
    }, 0);
  }, [filteredRatios]);

  const topPeaks = useMemo(() => sortPeakWindows(peaks, hourRange, 24), [peaks, hourRange]);

  const hasData = useMemo(() => hasOpsData(students, staff, ratios, peaks), [students, staff, ratios, peaks]);

  if (!hasData) {
    return (
      <p className="rounded-2xl border border-dashed border-brand-ink/20 bg-white/80 px-4 py-10 text-center text-sm text-brand-ink-muted">
        Sin datos operativos en los últimos 30 días.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4">
        <fieldset className="flex items-center gap-3">
          <legend className="text-sm font-semibold text-brand-deep">Horas</legend>
          <div className="inline-flex overflow-hidden rounded-full border border-brand-ink/20 bg-white">
            <button
              type="button"
              className={`px-4 py-1 text-sm font-medium transition ${
                showAllHours ? "text-brand-ink-muted" : "bg-brand-deep text-white"
              }`}
              onClick={() => setShowAllHours(false)}
              aria-pressed={!showAllHours}
            >
              08–20
            </button>
            <button
              type="button"
              className={`px-4 py-1 text-sm font-medium transition ${
                showAllHours ? "bg-brand-deep text-white" : "text-brand-ink-muted"
              }`}
              onClick={() => setShowAllHours(true)}
              aria-pressed={showAllHours}
            >
              0–23
            </button>
          </div>
        </fieldset>

        <fieldset className="flex items-center gap-3">
          <legend className="text-sm font-semibold text-brand-deep">Métrica</legend>
          <div className="inline-flex overflow-hidden rounded-full border border-brand-ink/20 bg-white">
            <button
              type="button"
              className={`px-4 py-1 text-sm font-medium transition ${
                metric === "avg" ? "bg-brand-emerald text-white" : "text-brand-ink-muted"
              }`}
              onClick={() => setMetric("avg")}
              aria-pressed={metric === "avg"}
            >
              Promedio
            </button>
            <button
              type="button"
              className={`px-4 py-1 text-sm font-medium transition ${
                metric === "p95" ? "bg-brand-emerald text-white" : "text-brand-ink-muted"
              }`}
              onClick={() => setMetric("p95")}
              aria-pressed={metric === "p95"}
            >
              P95
            </button>
          </div>
        </fieldset>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Heatmap
          title="Alumnos por franja"
          description="Promedio de alumnos activos por día y hora"
          hours={hours}
          lookup={studentLookup}
          metricKey={metricKeyStudents}
          heatmapMax={heatmapMax}
          metric={metric}
        />
        <Heatmap
          title="Staff por franja"
          description="Dotación de coaches por día y hora"
          hours={hours}
          lookup={staffLookup}
          metricKey={metricKeyStaff}
          heatmapMax={heatmapMax}
          metric={metric}
          isStaff
        />
      </div>

      <RatioHeatmap
        hours={hours}
        lookup={ratioLookup}
        ratioMax={Math.max(ratioMax, 6)}
      />

      <PeakTable rows={topPeaks} />
    </div>
  );
}

type HeatmapProps = {
  title: string;
  description: string;
  hours: number[];
  lookup: Map<string, StudentsByHourRow | StaffByHourRow>;
  metricKey: "avg_students" | "p95_students" | "avg_staff" | "p95_staff";
  heatmapMax: number;
  metric: "avg" | "p95";
  isStaff?: boolean;
};

function Heatmap({ title, description, hours, lookup, metricKey, heatmapMax, metric, isStaff }: HeatmapProps) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-brand-ink/5 bg-white/95 p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-brand-deep">{title}</h3>
        <p className="text-sm text-brand-ink-muted">{description}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-2 py-1 text-left text-xs font-medium text-brand-ink-muted">Día</th>
              {hours.map((hour) => (
                <th key={hour} className="px-2 py-1 text-xs font-medium text-brand-ink-muted">
                  {formatHourLabel(hour)}h
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 7 }).map((_, dow) => (
              <tr key={dow}>
                <th className="sticky left-0 bg-white px-2 py-1 text-left text-xs font-semibold text-brand-deep">
                  {getDowLabel(dow)}
                </th>
                {hours.map((hour) => {
                  const key = `${dow}-${hour}`;
                  const row = lookup.get(key) as StudentsByHourRow & StaffByHourRow | undefined;
                  const rawValue = row ? (row as any)[metricKey] : null;
                  const value = rawValue === null || rawValue === undefined ? null : Number(rawValue);
                  const background = getHeatmapColor(value, heatmapMax, isStaff);
                  const avgValue = (row as any)?.avg_students ?? (row as any)?.avg_staff ?? value;
                  const p95Value = (row as any)?.p95_students ?? (row as any)?.p95_staff ?? null;
                  const tooltipValue = buildHeatmapTooltip(dow, hour, avgValue, p95Value, metric);
                  return (
                    <td
                      key={hour}
                      title={tooltipValue}
                      className="h-12 min-w-[48px] rounded-xl text-center text-sm font-semibold text-brand-deep"
                      style={{ background }}
                    >
                      {value !== null ? integerFormatter.format(Math.round(value)) : "--"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type RatioHeatmapProps = {
  hours: number[];
  lookup: Map<string, StudentStaffRatioRow>;
  ratioMax: number;
};

function RatioHeatmap({ hours, lookup, ratioMax }: RatioHeatmapProps) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-brand-ink/5 bg-white/95 p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-brand-deep">Ratio alumno/coach</h3>
        <p className="text-sm text-brand-ink-muted">Relación promedio entre alumnos y coaches por franja</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-2 py-1 text-left text-xs font-medium text-brand-ink-muted">Día</th>
              {hours.map((hour) => (
                <th key={hour} className="px-2 py-1 text-xs font-medium text-brand-ink-muted">
                  {formatHourLabel(hour)}h
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 7 }).map((_, dow) => (
              <tr key={dow}>
                <th className="sticky left-0 bg-white px-2 py-1 text-left text-xs font-semibold text-brand-deep">
                  {getDowLabel(dow)}
                </th>
                {hours.map((hour) => {
                  const key = `${dow}-${hour}`;
                  const row = lookup.get(key);
                  const { ratio, avgStudents, avgStaff } = row ? normalizeRatioDisplay(row) : { ratio: null, avgStudents: null, avgStaff: null };
                  const clamped = clampRatio(ratio);
                  const background = getRatioColor(clamped, ratioMax);
                  const title = buildRatioTooltip(dow, hour, avgStudents, avgStaff, ratio);
                  return (
                    <td
                      key={hour}
                      title={title}
                      className="h-12 min-w-[48px] rounded-xl text-center text-sm font-semibold text-brand-deep"
                      style={{ background }}
                    >
                      {clamped !== null ? ratioFormatter.format(clamped) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type PeakTableProps = {
  rows: PeakLoadWindowRow[];
};

function PeakTable({ rows }: PeakTableProps) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-brand-ink/5 bg-white/95 p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-brand-deep">Ventanas pico (Top 24)</h3>
        <p className="text-sm text-brand-ink-muted">Mayor demanda de alumnos en los últimos 30 días</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-brand-ink/10 text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-brand-ink-muted">
            <tr>
              <th className="px-3 py-2">Día</th>
              <th className="px-3 py-2">Hora</th>
              <th className="px-3 py-2">Avg alumnos</th>
              <th className="px-3 py-2">P95 alumnos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-ink/10">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-brand-ink-muted">
                  Sin datos operativos en los últimos 30 días.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.dow}-${row.hour}-${index}`} className="hover:bg-brand-ink/5">
                  <td className="px-3 py-2 font-medium text-brand-deep">{getDowLabel(row.dow)}</td>
                  <td className="px-3 py-2 text-brand-ink-muted">{formatHourLabel(row.hour)}:00</td>
                  <td className="px-3 py-2 font-semibold text-brand-deep">
                    {row.avg_students !== null ? integerFormatter.format(Math.round(row.avg_students)) : "--"}
                  </td>
                  <td className="px-3 py-2 font-semibold text-brand-deep">
                    {row.p95_students !== null ? integerFormatter.format(Math.round(row.p95_students)) : "--"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function getHeatmapColor(value: number | null, max: number, isStaff = false) {
  if (value === null || !Number.isFinite(value) || max <= 0) {
    return "rgba(15, 23, 42, 0.06)";
  }
  const ratio = Math.min(value / max, 1);
  const baseColor = isStaff ? [99, 102, 241] : [14, 165, 233];
  const alpha = 0.2 + ratio * 0.6;
  return `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${alpha.toFixed(3)})`;
}

function getRatioColor(value: number | null, max: number) {
  if (value === null || !Number.isFinite(value) || max <= 0) {
    return "rgba(15, 23, 42, 0.06)";
  }
  const ratio = Math.min(value / max, 1);
  const alpha = 0.2 + ratio * 0.6;
  return `rgba(16, 185, 129, ${alpha.toFixed(3)})`;
}

function buildHeatmapTooltip(
  dow: number,
  hour: number,
  avgValue: number | null | undefined,
  p95Value: number | null | undefined,
  metric: "avg" | "p95",
) {
  const dayLabel = getDowLabel(dow);
  const hourLabel = `${formatHourLabel(hour)}:00`;
  const avg = avgValue !== null && avgValue !== undefined ? integerFormatter.format(Math.round(avgValue)) : "--";
  const p95 = p95Value !== null && p95Value !== undefined ? integerFormatter.format(Math.round(p95Value)) : "--";
  const highlight = metric === "p95" ? `P95: ${p95}` : `Prom: ${avg}`;
  return `${dayLabel} ${hourLabel}\n${highlight}\nProm: ${avg} | P95: ${p95}`;
}

function buildRatioTooltip(
  dow: number,
  hour: number,
  avgStudents: number | null,
  avgStaff: number | null,
  ratio: number | null | undefined,
) {
  const dayLabel = getDowLabel(dow);
  const hourLabel = `${formatHourLabel(hour)}:00`;
  const studentsText = avgStudents !== null ? integerFormatter.format(Math.round(avgStudents)) : "--";
  const staffText = avgStaff !== null ? integerFormatter.format(Math.round(avgStaff)) : "--";
  const ratioText = ratio !== null && ratio !== undefined ? decimalFormatter.format(ratio) : "—";
  return `${dayLabel} ${hourLabel}\nAlumnos prom: ${studentsText}\nStaff prom: ${staffText}\nRatio: ${ratioText}`;
}
