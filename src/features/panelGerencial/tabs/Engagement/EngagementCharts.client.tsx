"use client";

import { useMemo, useState } from "react";
import type { DauWauRow } from "../../data/engagement.read";

const numberFormatter = new Intl.NumberFormat("es-EC");
const dateFormatter = new Intl.DateTimeFormat("es-EC", {
  month: "short",
  day: "numeric",
});
const fullDateFormatter = new Intl.DateTimeFormat("es-EC", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function buildLinePath(values: Array<{ x: number; y: number }>, height: number, padding: number) {
  if (!values.length) return "";
  return values
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${point.x.toFixed(2)},${(height - padding - point.y).toFixed(2)}`;
    })
    .join(" ");
}

type DauWauTrendChartProps = {
  data: DauWauRow[];
};

type LegendKey = "dau" | "wau";

const LINE_CONFIG: Record<LegendKey, { color: string; label: string }> = {
  dau: { color: "#0ea5e9", label: "DAU" },
  wau: { color: "#6366f1", label: "WAU" },
};

export default function DauWauTrendChart({ data }: DauWauTrendChartProps) {
  const usable = useMemo(() => data.filter((row) => row.dau !== null || row.wau !== null), [data]);
  const [active, setActive] = useState<Record<LegendKey, boolean>>({ dau: true, wau: true });

  const { timeline, maxValue, span } = useMemo(() => {
    if (!usable.length) {
      return { timeline: [] as TimelineEntry[], maxValue: 0, span: 1 };
    }

    const values: number[] = [];
    usable.forEach((row) => {
      if (row.dau !== null) values.push(Number(row.dau));
      if (row.wau !== null) values.push(Number(row.wau));
    });
    const maxVal = Math.max(...values, 0);
    const computedSpan = usable.length > 1 ? usable.length - 1 : 1;
    const timelineEntries = usable.map((row, index) => buildTimelineEntry(row, index));
    return { timeline: timelineEntries, maxValue: maxVal, span: computedSpan };
  }, [usable]);

  if (!timeline.length) {
    return (
      <p className="rounded-2xl border border-dashed border-brand-ink/20 bg-white/80 px-4 py-10 text-center text-sm text-brand-ink-muted">
        Sin datos disponibles.
      </p>
    );
  }

  const width = 360;
  const height = 240;
  const paddingX = 32;
  const paddingY = 36;

  const dauPath = buildLinePath(
    timeline
      .filter((entry) => entry.dauValue !== null)
      .map((entry) => ({
        x: paddingX + (entry.index / span) * (width - paddingX * 2),
        y: ((entry.dauValue ?? 0) / (maxValue || 1)) * (height - paddingY * 2),
      })),
    height,
    paddingY,
  );

  const wauPath = buildLinePath(
    timeline
      .filter((entry) => entry.wauValue !== null)
      .map((entry) => ({
        x: paddingX + (entry.index / span) * (width - paddingX * 2),
        y: ((entry.wauValue ?? 0) / (maxValue || 1)) * (height - paddingY * 2),
      })),
    height,
    paddingY,
  );

  const handleToggle = (key: LegendKey) => {
    setActive((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.dau && !next.wau) {
        next[key === "dau" ? "wau" : "dau"] = true;
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        {(Object.keys(LINE_CONFIG) as LegendKey[]).map((key) => {
          const config = LINE_CONFIG[key];
          const isActive = active[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleToggle(key)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition ${
                isActive
                  ? "border-transparent bg-brand-deep text-white shadow"
                  : "border-brand-ink/20 bg-white text-brand-ink-muted hover:border-brand-ink/40"
              }`}
            >
              <span
                className="h-2 w-6 rounded-full"
                style={{ backgroundColor: config.color, opacity: isActive ? 1 : 0.35 }}
              />
              {config.label}
            </button>
          );
        })}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
        <rect
          x={24}
          y={28}
          width={width - 48}
          height={height - 64}
          fill="#f5f3ff"
          rx={18}
          ry={18}
        />
        {active.dau ? (
          <path d={dauPath} fill="none" stroke={LINE_CONFIG.dau.color} strokeWidth={4} strokeLinecap="round" />
        ) : null}
        {active.wau ? (
          <path d={wauPath} fill="none" stroke={LINE_CONFIG.wau.color} strokeWidth={4} strokeLinecap="round" />
        ) : null}
        {timeline.map((entry) => {
          const x = paddingX + (entry.index / span) * (width - paddingX * 2);
          const dauY = ((entry.dauValue ?? 0) / (maxValue || 1)) * (height - paddingY * 2);
          const wauY = ((entry.wauValue ?? 0) / (maxValue || 1)) * (height - paddingY * 2);
          return (
            <g key={entry.date}>
              {active.dau && entry.dauValue !== null ? (
                <circle
                  cx={x}
                  cy={height - paddingY - dauY}
                  r={3.5}
                  fill={LINE_CONFIG.dau.color}
                />
              ) : null}
              {active.wau && entry.wauValue !== null ? (
                <rect
                  x={x - 3}
                  y={height - paddingY - wauY - 3}
                  width={6}
                  height={6}
                  rx={1.5}
                  fill={LINE_CONFIG.wau.color}
                />
              ) : null}
              <title>
                {`${fullDateFormatter.format(new Date(entry.date))} | DAU: ${
                  entry.dauValue !== null ? numberFormatter.format(entry.dauValue) : "--"
                } | WAU: ${entry.wauValue !== null ? numberFormatter.format(entry.wauValue) : "--"}`}
              </title>
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-brand-ink-muted">
        <span>{dateFormatter.format(new Date(timeline[0].date))}</span>
        <span>{dateFormatter.format(new Date(timeline[timeline.length - 1].date))}</span>
      </div>
    </div>
  );
}

type TimelineEntry = {
  date: string;
  index: number;
  dauValue: number | null;
  wauValue: number | null;
};

function buildTimelineEntry(row: DauWauRow, index: number): TimelineEntry {
  return {
    date: row.d,
    index,
    dauValue: row.dau === null ? null : Number(row.dau),
    wauValue: row.wau === null ? null : Number(row.wau),
  };
}
