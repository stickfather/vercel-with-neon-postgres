"use client";

import { useMemo, type ReactElement } from "react";

import type { DaypartRow } from "@/features/administration/data/student-profile";

const DAYPART_ORDER: ReadonlyArray<DaypartRow["daypart"]> = [
  "Morning",
  "Afternoon",
  "Evening",
  "Night",
];

const DAYPART_COLORS: Record<DaypartRow["daypart"], string> = {
  Morning: "#60A5FA",
  Afternoon: "#34D399",
  Evening: "#F59E0B",
  Night: "#64748B",
};

const DAYPART_LABELS: Record<DaypartRow["daypart"], string> = {
  Morning: "Morning",
  Afternoon: "Afternoon",
  Evening: "Evening",
  Night: "Night",
};

type DonutSlice = {
  daypart: DaypartRow["daypart"];
  minutes: number;
  startAngle: number;
  endAngle: number;
};

function normalizeData(data: DaypartRow[]): DaypartRow[] {
  const totals = new Map<DaypartRow["daypart"], number>();
  data.forEach((entry) => {
    if (!entry) return;
    const minutes = Number.isFinite(entry.minutes)
      ? Math.max(0, Math.round(entry.minutes))
      : 0;
    totals.set(entry.daypart, minutes);
  });
  return DAYPART_ORDER.map((daypart) => ({
    daypart,
    minutes: totals.get(daypart) ?? 0,
  }));
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeSlice(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

function buildSlices(data: DaypartRow[]): DonutSlice[] {
  const normalized = normalizeData(data);
  const total = normalized.reduce((sum, item) => sum + item.minutes, 0);
  if (total <= 0) {
    return [];
  }

  let cursor = 0;
  return normalized.map((item) => {
    const startAngle = (cursor / total) * 360;
    const endAngle = ((cursor + item.minutes) / total) * 360;
    cursor += item.minutes;
    return {
      daypart: item.daypart,
      minutes: item.minutes,
      startAngle,
      endAngle,
    } satisfies DonutSlice;
  });
}

function formatTotal(minutes: number): string {
  if (minutes <= 0) {
    return "0 min";
  }
  const hours = minutes / 60;
  if (hours >= 1) {
    return `${Math.round(hours)} h`;
  }
  return `${minutes} min`;
}

export function DonutDaypart({ data }: { data: DaypartRow[] }): ReactElement {
  const normalizedData = useMemo(() => normalizeData(data), [data]);
  const totalMinutes = useMemo(
    () => normalizedData.reduce((sum, entry) => sum + entry.minutes, 0),
    [normalizedData],
  );
  const slices = useMemo(() => buildSlices(normalizedData), [normalizedData]);

  if (totalMinutes <= 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-500">
        No study time in the last 30 days.
      </div>
    );
  }

  const centerLabel = formatTotal(totalMinutes);
  const viewBoxSize = 200;
  const outerRadius = 90;
  const innerRadius = 54;

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <div className="relative md:col-span-3">
        <svg
          className="h-56 w-full"
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          role="img"
          aria-label="Distribución de minutos por franja horaria"
        >
          {slices.map((slice) => (
            <path
              key={slice.daypart}
              d={describeSlice(viewBoxSize / 2, viewBoxSize / 2, outerRadius, innerRadius, slice.startAngle, slice.endAngle)}
              fill={DAYPART_COLORS[slice.daypart]}
              stroke="white"
              strokeWidth={1}
            >
              <title>{`${slice.minutes} min in ${slice.daypart}`}</title>
            </path>
          ))}
          <circle
            cx={viewBoxSize / 2}
            cy={viewBoxSize / 2}
            r={innerRadius - 1}
            fill="white"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
          <span className="text-xs uppercase tracking-[0.28em] text-slate-500">Total (30 días)</span>
          <span className="text-2xl font-semibold text-brand-deep">{centerLabel}</span>
          <span className="text-xs text-slate-500">{totalMinutes} min</span>
        </div>
      </div>
      <ul className="md:col-span-2 space-y-2 self-center">
        {normalizedData.map((entry) => (
          <li key={entry.daypart} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-3 w-3 rounded"
              style={{ backgroundColor: DAYPART_COLORS[entry.daypart] }}
            />
            <span className="text-slate-700">{DAYPART_LABELS[entry.daypart]}</span>
            <span className="ml-auto text-slate-600">{entry.minutes} min</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
