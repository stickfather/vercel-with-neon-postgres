"use client";

import { useCallback, useState } from "react";

import {
  FullScreenCelebration,
  type FullScreenCelebrationAccent,
} from "@/components/ui/full-screen-celebration";
import type {
  ActiveAttendance,
  LevelLessons,
} from "@/features/student-checkin/data/queries";

import { AttendanceBoard } from "./attendance-board";
import { CheckInForm } from "./check-in-form";

export type CheckInCelebrationMessage = {
  tone: "success" | "error";
  headline: string;
  body?: string;
  accent?: FullScreenCelebrationAccent;
  autoDismissAfterMs?: number | null;
};

type Props = {
  levels: LevelLessons[];
  attendances: ActiveAttendance[];
  formError: string | null;
  lessonsError: string | null;
  attendanceError: string | null;
};

export function CheckInExperience({
  levels,
  attendances,
  formError,
  lessonsError,
  attendanceError,
}: Props) {
  const [celebration, setCelebration] = useState<CheckInCelebrationMessage | null>(
    null,
  );

  const handleCelebration = useCallback(
    (message: CheckInCelebrationMessage | null) => {
      setCelebration(message);
    },
    [],
  );

  return (
    <>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.05fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)]">
        <CheckInForm
          levels={levels}
          disabled={Boolean(formError)}
          initialError={formError}
          lessonsError={lessonsError}
          onShowCelebration={handleCelebration}
        />
        <aside className="flex flex-col gap-5 rounded-[36px] border border-white/70 bg-white/94 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col text-left">
              <h2 className="text-xl font-bold text-brand-deep">Estudiantes en clase</h2>
              <p className="text-xs uppercase tracking-wide text-brand-ink-muted">
                Toca tu burbuja para salir
              </p>
            </div>
            <span className="rounded-full bg-brand-teal-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal">
              {attendances.length}
            </span>
          </div>
          {attendanceError && (
            <p className="rounded-3xl border border-brand-orange bg-white/85 px-4 py-3 text-xs font-medium text-brand-ink">
              {attendanceError}
            </p>
          )}
          <AttendanceBoard
            attendances={attendances}
            onShowCelebration={handleCelebration}
          />
        </aside>
      </div>
      {celebration ? (
        <FullScreenCelebration
          tone={celebration.tone}
          headline={celebration.headline}
          body={celebration.body}
          accent={celebration.accent}
          autoDismissAfterMs={celebration.autoDismissAfterMs ?? null}
        />
      ) : null}
    </>
  );
}
