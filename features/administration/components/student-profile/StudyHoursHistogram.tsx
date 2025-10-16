"use client";

import { useMemo } from "react";

import type {
  HourlyHistogramRow,
  StudyActivity30dSummary,
} from "@/features/administration/data/student-profile";

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const BAR_COLOR = "#5eead4";
const BAR_HIGHLIGHT_COLOR = "#14b8a6";

function formatHourLabel(value: number): string {
  const normalized = Math.min(23, Math.max(0, Math.trunc(value)));
  return `${normalized.toString().padStart(2, "0")}:00`;
}

function formatMinutes(value: number): string {
  return `${value} min`;
}

function formatSessions(value: number): string {
  const safe = Math.max(0, Math.round(value));
  return `${safe} ${safe === 1 ? "sesión" : "sesiones"}`;
}

export type StudyHoursHistogramProps = {
  data: HourlyHistogramRow[];
  summary: StudyActivity30dSummary;
};

export function StudyHoursHistogram({ data, summary }: StudyHoursHistogramProps) {
  const { dataset, highlightSet, maxMinutes, totalMinutes } = useMemo(() => {
    const map = new Map<number, HourlyHistogramRow>();
    data.forEach((row) => {
      map.set(row.hourOfDay, row);
    });

    const completeDataset = HOURS.map((hour) => {
      const row = map.get(hour);
      return {
        hourOfDay: hour,
        minutes: row?.minutes ?? 0,
        sessions: row?.sessions ?? 0,
      };
    });

    const computedMax = completeDataset.reduce(
      (max, row) => (row.minutes > max ? row.minutes : max),
      0,
    );

    const highlight = new Set<number>();
    if (computedMax > 0) {
      completeDataset.forEach((row) => {
        if (row.minutes === computedMax) {
          highlight.add(row.hourOfDay);
        }
      });
    }

    const minutesTotal =
      summary.totalMinutes ?? completeDataset.reduce((sum, row) => sum + row.minutes, 0);

    return {
      dataset: completeDataset,
      highlightSet: highlight,
      maxMinutes: computedMax,
      totalMinutes: minutesTotal,
    };
  }, [data, summary.totalMinutes, summary.activeDays, summary.activeSessions]);

  if (!dataset.length || maxMinutes === 0) {
    return (
      <div className="flex h-52 flex-col items-center justify-center gap-2 text-center text-sm text-brand-ink-muted">
        <span className="font-medium text-brand-deep">Sin registros recientes</span>
        <span>No hay minutos de práctica en los últimos 30 días.</span>
      </div>
    );
  }

  const activeDaysLabel = summary.activeDays ?? summary.activeSessions ?? null;
  const totalHours = totalMinutes != null ? totalMinutes / 60 : null;
  const activeDaysText = (() => {
    if (activeDaysLabel == null) {
      return "";
    }
    const value = Math.max(0, Math.round(activeDaysLabel));
    const suffix = value === 1 ? "día activo" : "días activos";
    return ` / ${value} ${suffix}`;
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-brand-ink-muted">
        <span>Distribución de minutos de práctica por hora local.</span>
        {totalHours != null || activeDaysLabel != null ? (
          <span className="rounded-full bg-brand-teal-soft px-3 py-1 font-medium text-brand-teal">
            Total: {totalHours != null ? `${totalHours.toFixed(1)} h` : "—"}
            {activeDaysText}
          </span>
        ) : null}
      </div>
      <div className="space-y-3">
        <div className="relative h-48">
          <div className="absolute inset-0 grid grid-rows-4">
            <div className="border-t border-dashed border-brand-ink-muted/20" />
            <div className="border-t border-dashed border-brand-ink-muted/20" />
            <div className="border-t border-dashed border-brand-ink-muted/20" />
            <div className="border-t border-dashed border-brand-ink-muted/20" />
            <div className="border-t border-brand-ink-muted/30" />
          </div>
          <div className="relative flex h-full items-end justify-between gap-1">
            {dataset.map((row) => {
              const heightPercent = maxMinutes > 0 ? (row.minutes / maxMinutes) * 100 : 0;
              const tone = highlightSet.has(row.hourOfDay) ? BAR_HIGHLIGHT_COLOR : BAR_COLOR;
              return (
                <div
                  key={row.hourOfDay}
                  className="group flex h-full flex-1 flex-col items-center justify-end"
                  title={`${formatMinutes(row.minutes)} • ${formatSessions(row.sessions)}`}
                >
                  <div className="flex h-full w-full items-end justify-center">
                    <div
                      className="w-full rounded-t-md transition-colors duration-150 ease-in-out group-hover:bg-brand-teal"
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: tone,
                      }}
                    >
                      <span className="sr-only">
                        {formatHourLabel(row.hourOfDay)}: {formatMinutes(row.minutes)} • {formatSessions(row.sessions)}
                      </span>
                    </div>
                  </div>
                  <span className="mt-2 block text-[10px] font-medium uppercase tracking-wide text-brand-ink-muted">
                    {formatHourLabel(row.hourOfDay)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
