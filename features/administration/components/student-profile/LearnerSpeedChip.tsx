"use client";

import { useMemo, type ReactElement } from "react";

import type { LearnerSpeed } from "@/features/administration/data/student-profile";

function toneFor(label: LearnerSpeed["learner_speed_label"] | "Insufficient data"): string {
  switch (label) {
    case "Fast":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "Slow":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    case "Normal":
      return "bg-slate-50 text-slate-700 border border-slate-200";
    default:
      return "bg-slate-50 text-slate-400 border border-slate-200";
  }
}

function formatNullable(value: number | null | undefined, fractionDigits = 2): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return value.toFixed(fractionDigits);
}

export function LearnerSpeedChip({ s }: { s: LearnerSpeed }): ReactElement {
  const label = s.learner_speed_label ?? "Insufficient data";
  const tone = toneFor(label);

  const tooltip = useMemo(() => {
    if (!s.learner_speed_label) {
      return "Needs ≥120 minutes in the last 30 days";
    }
    const parts = [] as string[];
    if (s.p25 != null && s.p75 != null) {
      parts.push(`Cohort p25=${formatNullable(s.p25)}, p75=${formatNullable(s.p75)}`);
    }
    if (s.speed_index_iqr != null && Number.isFinite(s.speed_index_iqr)) {
      parts.push(`IQR index=${s.speed_index_iqr.toFixed(1)}%`);
    }
    return parts.join(" • ") || undefined;
  }, [s.learner_speed_label, s.p25, s.p75, s.speed_index_iqr]);

  const leiLabel = formatNullable(s.lei_30d_plan);
  const cohortRange =
    s.p25 != null && s.p75 != null
      ? `${formatNullable(s.p25)}/${formatNullable(s.p75)}`
      : null;

  return (
    <div className="flex flex-col items-start text-left">
      <div
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${tone}`}
        title={tooltip}
      >
        {label}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        LEI 30d: {leiLabel}
        {cohortRange ? ` • p25/p75: ${cohortRange}` : ""}
        {s.cohort_n != null ? ` • Cohorte: ${s.cohort_n}` : ""}
      </div>
    </div>
  );
}
