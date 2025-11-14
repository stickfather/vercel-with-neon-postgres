"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { PinPrompt } from "@/features/security/components/PinPrompt";
import { EphemeralToast } from "@/components/ui/ephemeral-toast";

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
import { AddExamModal } from "@/features/administration/components/student-profile/modals/add-exam-modal";
import { AddInstructivoModal } from "@/features/administration/components/student-profile/modals/add-instructivo-modal";
import { AddNoteModal } from "@/features/administration/components/student-profile/modals/add-note-modal";
import { AddPaymentModal } from "@/features/administration/components/student-profile/modals/add-payment-modal";
import type {
  StudentBasicDetails,
  StudentCoachPanelSummary,
  StudentExam,
  StudentInstructivo,
  StudentNote,
  StudentAttendanceHistoryEntry,
  StudentPaymentScheduleEntry,
} from "@/features/administration/data/student-profile";
import type { LevelLessons } from "@/features/student-checkin/data/queries";
import type { InstructivosStatus } from "@/src/features/reports/coach-panel/types";

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
  lessonCatalog: LevelLessons[];
};

type TabContentConfig = {
  value: (typeof TAB_ORDER)[number];
  label: ReactNode;
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
  lessonCatalog,
}: StudentProfileTabsProps) {
  const baseId = useId();
  const [paymentEntries, setPaymentEntries] = useState(paymentSchedule);
  const [examEntries, setExamEntries] = useState(exams);
  const [instructivoEntries, setInstructivoEntries] = useState(instructivos);
  const [noteEntries, setNoteEntries] = useState(notes);
  const [coachPanelInstructivoBadge, setCoachPanelInstructivoBadge] =
    useState<InstructivosStatus | null>(null);

  useEffect(() => {
    setPaymentEntries(paymentSchedule);
  }, [paymentSchedule]);

  useEffect(() => {
    setExamEntries(exams);
  }, [exams]);

  useEffect(() => {
    setInstructivoEntries(instructivos);
  }, [instructivos]);

  useEffect(() => {
    setNoteEntries(notes);
  }, [notes]);

  const [activeModal, setActiveModal] = useState<
    "payment" | "exam" | "instructivo" | "note" | null
  >(null);

  const [isPaymentScheduleUnlocked, setIsPaymentScheduleUnlocked] = useState(false);
  const [showPaymentPinPrompt, setShowPaymentPinPrompt] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; tone: "success" | "error" } | null>(null);

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
        content: (
          <CoachPanel
            studentId={studentId}
            data={coachSummary}
            errorMessage={coachError}
            onInstructivoStatusChange={setCoachPanelInstructivoBadge}
          />
        ),
      },
      {
        value: "historial-asistencia",
        label: TAB_LABELS["historial-asistencia"],
        content: (
          <AttendanceHistoryPanel
            studentId={studentId}
            entries={attendanceHistory}
            lessonCatalog={lessonCatalog}
            errorMessage={attendanceError}
          />
        ),
      },
      {
        value: "cronograma-de-pagos",
        label: TAB_LABELS["cronograma-de-pagos"],
        content: isPaymentScheduleUnlocked ? (
          <PaymentSchedulePanel
            studentId={studentId}
            entries={paymentEntries}
            onEntriesChange={setPaymentEntries}
            onRequestAdd={() => setActiveModal("payment")}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-12 text-center">
            <div className="flex flex-col gap-3">
              <span className="text-5xl" aria-hidden="true">
                🔒
              </span>
              <h3 className="text-xl font-bold text-slate-900">
                PIN Gerencial Requerido
              </h3>
              <p className="max-w-md text-sm text-slate-600">
                Por favor ingresa el PIN gerencial para ver este cronograma de pagos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPaymentPinPrompt(true)}
              className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              Desbloquear Cronograma de Pagos
            </button>
          </div>
        ),
      },
      {
        value: "examenes",
        label: TAB_LABELS.examenes,
        content: (
          <ExamsPanel
            studentId={studentId}
            exams={examEntries}
            onEntriesChange={setExamEntries}
            onRequestAdd={() => setActiveModal("exam")}
          />
        ),
      },
      {
        value: "instructivos",
        label: (
          <span className="inline-flex items-center gap-2">
            {TAB_LABELS.instructivos}
            {coachPanelInstructivoBadge ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  coachPanelInstructivoBadge.overdue
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {coachPanelInstructivoBadge.pendientes}
              </span>
            ) : null}
          </span>
        ),
        content: (
          <InstructivosPanel
            studentId={studentId}
            instructivos={instructivoEntries}
            onEntriesChange={setInstructivoEntries}
            onRequestAdd={() => setActiveModal("instructivo")}
          />
        ),
      },
      {
        value: "notas",
        label: TAB_LABELS.notas,
        content: (
          <NotesPanel
            studentId={studentId}
            notes={noteEntries}
            onEntriesChange={setNoteEntries}
            onRequestAdd={() => setActiveModal("note")}
          />
        ),
      },
    ],
    [
      paymentEntries,
      examEntries,
      instructivoEntries,
      noteEntries,
      basicDetails,
      coachError,
      coachSummary,
      attendanceError,
      attendanceHistory,
      lessonCatalog,
      studentId,
      isPaymentScheduleUnlocked,
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

      <AddPaymentModal
        open={activeModal === "payment"}
        studentId={studentId}
        onClose={() => setActiveModal(null)}
        onCreated={(entry) =>
          setPaymentEntries((previous) => [...previous, entry])
        }
      />
      <AddExamModal
        open={activeModal === "exam"}
        studentId={studentId}
        onClose={() => setActiveModal(null)}
        onCreated={(entry) =>
          setExamEntries((previous) => [entry, ...previous])
        }
      />
      <AddInstructivoModal
        open={activeModal === "instructivo"}
        studentId={studentId}
        onClose={() => setActiveModal(null)}
        onCreated={(entry) =>
          setInstructivoEntries((previous) => [entry, ...previous])
        }
      />
      <AddNoteModal
        open={activeModal === "note"}
        studentId={studentId}
        onClose={() => setActiveModal(null)}
        onCreated={(entry) =>
          setNoteEntries((previous) => [entry, ...previous])
        }
      />

      {showPaymentPinPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8">
          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            <PinPrompt
              scope="manager"
              title="🔐 PIN Gerencial Requerido"
              description="Por favor ingresa el PIN gerencial para ver este cronograma de pagos."
              ctaLabel="Confirmar"
              onSuccess={() => {
                setShowPaymentPinPrompt(false);
                setIsPaymentScheduleUnlocked(true);
                setToastMessage({
                  message: "✅ Cronograma de pagos desbloqueado",
                  tone: "success",
                });
              }}
              className="bg-white"
            />
            <button
              type="button"
              onClick={() => {
                setShowPaymentPinPrompt(false);
                setToastMessage({
                  message: "PIN inválido",
                  tone: "error",
                });
              }}
              className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {toastMessage && (
        <EphemeralToast
          message={toastMessage.message}
          tone={toastMessage.tone}
          duration={3000}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
