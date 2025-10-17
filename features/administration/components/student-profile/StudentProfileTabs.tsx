"use client";

import { useId, useMemo, useState, type ReactNode } from "react";

import {
  BasicDetailsPanel,
} from "@/features/administration/components/student-profile/basic-details-panel";
import { AttendanceHistoryPanel } from "@/features/administration/components/student-profile/attendance-history-panel";
import { CoachPanel } from "@/features/administration/components/student-profile/coach-panel";
import {
  ExamsPanel,
} from "@/features/administration/components/student-profile/exams-panel";
import {
  InstructivosPanel,
} from "@/features/administration/components/student-profile/instructivos-panel";
import {
  NotesPanel,
} from "@/features/administration/components/student-profile/notes-panel";
import {
  PaymentSchedulePanel,
} from "@/features/administration/components/student-profile/payment-schedule-panel";
import type {
  StudentBasicDetails,
  StudentCoachPanelSummary,
  StudentExam,
  StudentInstructivo,
  StudentNote,
  StudentAttendanceHistoryEntry,
  StudentPaymentScheduleEntry,
} from "@/features/administration/data/student-profile";

const TAB_ORDER = [
  "datos-basicos",
  "panel-del-coach",
  "historial-asistencia",
  "cronograma-de-pagos",
  "examenes",
  "instructivos",
  "notas",
] as const;

const TAB_LABELS: Record<(typeof TAB_ORDER)[number], string> = {
  "datos-basicos": "Datos básicos",
  "panel-del-coach": "Panel del coach",
  "historial-asistencia": "Historial de asistencia",
  "cronograma-de-pagos": "Cronograma de pagos",
  examenes: "Exámenes",
  instructivos: "Instructivos",
  notas: "Observaciones",
};

type StudentProfileTabsProps = {
  studentId: number;
  basicDetails: StudentBasicDetails;
  paymentSchedule: StudentPaymentScheduleEntry[];
  exams: StudentExam[];
  instructivos: StudentInstructivo[];
  notes: StudentNote[];
  coachSummary: StudentCoachPanelSummary | null;
  coachError?: string | null;
  attendanceHistory: StudentAttendanceHistoryEntry[];
  attendanceError?: string | null;
};

type TabContentConfig = {
  value: (typeof TAB_ORDER)[number];
  label: string;
  content: ReactNode;
};

export function StudentProfileTabs({
  studentId,
  basicDetails,
  paymentSchedule,
  exams,
  instructivos,
  notes,
  coachSummary,
  coachError,
  attendanceHistory,
  attendanceError,
}: StudentProfileTabsProps) {
  const baseId = useId();
  const tabConfigs = useMemo<TabContentConfig[]>(
    () => [
      {
        value: "datos-basicos",
        label: TAB_LABELS["datos-basicos"],
        content: (
          <BasicDetailsPanel
            studentId={studentId}
            details={basicDetails}
          />
        ),
      },
      {
        value: "panel-del-coach",
        label: TAB_LABELS["panel-del-coach"],
        content: <CoachPanel data={coachSummary} errorMessage={coachError} />,
      },
      {
        value: "historial-asistencia",
        label: TAB_LABELS["historial-asistencia"],
        content: (
          <AttendanceHistoryPanel
            entries={attendanceHistory}
            errorMessage={attendanceError}
          />
        ),
      },
      {
        value: "cronograma-de-pagos",
        label: TAB_LABELS["cronograma-de-pagos"],
        content: (
          <PaymentSchedulePanel
            studentId={studentId}
            entries={paymentSchedule}
          />
        ),
      },
      {
        value: "examenes",
        label: TAB_LABELS.examenes,
        content: <ExamsPanel studentId={studentId} exams={exams} />,
      },
      {
        value: "instructivos",
        label: TAB_LABELS.instructivos,
        content: (
          <InstructivosPanel
            studentId={studentId}
            instructivos={instructivos}
          />
        ),
      },
      {
        value: "notas",
        label: TAB_LABELS.notas,
        content: <NotesPanel studentId={studentId} notes={notes} />,
      },
    ],
    [
      basicDetails,
      coachError,
      coachSummary,
      attendanceError,
      attendanceHistory,
      exams,
      instructivos,
      notes,
      paymentSchedule,
      studentId,
    ],
  );

  const [activeTab, setActiveTab] = useState<(typeof TAB_ORDER)[number]>(
    tabConfigs[0]?.value ?? "datos-basicos",
  );
  const [mountedTabs, setMountedTabs] = useState(() =>
    new Set<(typeof TAB_ORDER)[number]>([activeTab]),
  );

  const handleSelect = (value: (typeof TAB_ORDER)[number]) => {
    setActiveTab(value);
    setMountedTabs((prev) => {
      if (prev.has(value)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(value);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex flex-wrap items-center gap-2 border-b border-brand-ink-muted/10 pb-2"
        role="tablist"
        aria-label="Perfil del estudiante"
      >
        {tabConfigs.map((tab) => {
          const tabId = `${baseId}-tab-${tab.value}`;
          const panelId = `${baseId}-panel-${tab.value}`;
          const isActive = tab.value === activeTab;

          return (
            <button
              key={tab.value}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleSelect(tab.value)}
              className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${
                isActive
                  ? "bg-brand-teal text-white shadow"
                  : "bg-white text-brand-ink-muted hover:bg-brand-ivory hover:text-brand-deep"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabConfigs.map((tab) => {
        const tabId = `${baseId}-tab-${tab.value}`;
        const panelId = `${baseId}-panel-${tab.value}`;
        const isActive = tab.value === activeTab;
        const isMounted = mountedTabs.has(tab.value);

        return (
          <div
            key={tab.value}
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId}
            hidden={!isActive}
            className="focus:outline-none"
          >
            {isMounted ? tab.content : null}
          </div>
        );
      })}
    </div>
  );
}
