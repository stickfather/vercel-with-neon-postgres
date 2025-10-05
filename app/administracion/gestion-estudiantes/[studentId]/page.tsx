import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

import {
  BasicDetailsPanel,
  BasicDetailsPanelSkeleton,
} from "@/features/administration/components/student-profile/basic-details-panel";
import {
  PaymentSchedulePanel,
  PaymentSchedulePanelSkeleton,
} from "@/features/administration/components/student-profile/payment-schedule-panel";
import {
  NotesPanel,
  NotesPanelSkeleton,
} from "@/features/administration/components/student-profile/notes-panel";
import {
  ExamsPanel,
  ExamsPanelSkeleton,
} from "@/features/administration/components/student-profile/exams-panel";
import {
  InstructivosPanel,
  InstructivosPanelSkeleton,
} from "@/features/administration/components/student-profile/instructivos-panel";
import {
  AttendancePanel,
  AttendancePanelSkeleton,
} from "@/features/administration/components/student-profile/attendance-panel";
import {
  getStudentBasicDetails,
  listStudentPaymentSchedule,
  listStudentNotes,
  listStudentExams,
  listStudentInstructivos,
  getStudentProgressStats,
  getStudentLessonTimeline,
  getStudentAttendanceStats,
} from "@/features/administration/data/student-profile";
import { getStudentManagementEntry } from "@/features/administration/data/students";

export const dynamic = "force-dynamic";

function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type PrimaryProfileData = {
  basicDetails: Awaited<ReturnType<typeof getStudentBasicDetails>>;
  paymentSchedule: Awaited<ReturnType<typeof listStudentPaymentSchedule>>;
  notes: Awaited<ReturnType<typeof listStudentNotes>>;
  exams: Awaited<ReturnType<typeof listStudentExams>>;
  instructivos: Awaited<ReturnType<typeof listStudentInstructivos>>;
};

type AttendanceData = {
  attendanceStats: Awaited<ReturnType<typeof getStudentAttendanceStats>>;
  stats: Awaited<ReturnType<typeof getStudentProgressStats>>;
  lessonTimeline: Awaited<ReturnType<typeof getStudentLessonTimeline>>;
  excludeSundays: boolean;
  error: string | null;
};

const PRIMARY_DATA_FALLBACK: PrimaryProfileData = {
  basicDetails: null,
  paymentSchedule: [],
  notes: [],
  exams: [],
  instructivos: [],
};

const ATTENDANCE_DATA_FALLBACK: AttendanceData = {
  attendanceStats: {
    totalMinutes: null,
    totalHours: null,
    averageSessionMinutes: null,
    averageSessionsPerDay: null,
    averageMinutesPerDay: null,
    averageMinutesPerDayExcludingSundays: null,
    lessonChanges: null,
    lessonsPerWeek: null,
  },
  stats: {
    averageSessionLengthMinutes: null,
    averageDaysPerWeek: null,
    averageProgressPerWeek: null,
    lessonsPerWeek: null,
  },
  lessonTimeline: [],
  excludeSundays: true,
  error: null,
};

async function loadPrimaryProfileData(studentId: number): Promise<PrimaryProfileData> {
  noStore();

  let basicDetails: Awaited<ReturnType<typeof getStudentBasicDetails>>;
  try {
    basicDetails = await getStudentBasicDetails(studentId);
  } catch (error) {
    console.error("Failed to load student basic details", error);
    throw error;
  }

  if (!basicDetails) {
    return PRIMARY_DATA_FALLBACK;
  }

  try {
    const managementEntry = await getStudentManagementEntry(studentId);
    if (managementEntry && basicDetails) {
      basicDetails = {
        ...basicDetails,
        isNewStudent: managementEntry.isNewStudent,
        isExamApproaching: managementEntry.isExamApproaching,
        isExamPreparation: managementEntry.isExamPreparation,
        isAbsent7d: managementEntry.isAbsent7Days,
        isAbsent7Days: managementEntry.isAbsent7Days,
        isSlowProgress14d: managementEntry.isSlowProgress14Days,
        isSlowProgress14Days: managementEntry.isSlowProgress14Days,
        instructivoActive: managementEntry.hasActiveInstructive,
        hasActiveInstructive: managementEntry.hasActiveInstructive,
        instructivoOverdue: managementEntry.hasOverdueInstructive,
        hasOverdueInstructive: managementEntry.hasOverdueInstructive,
      };
    }
  } catch (error) {
    console.error("Failed to load student management flags", error);
  }

  const [paymentScheduleResult, notesResult, examsResult, instructivosResult] =
    await Promise.allSettled([
      listStudentPaymentSchedule(studentId),
      listStudentNotes(studentId),
      listStudentExams(studentId),
      listStudentInstructivos(studentId),
    ]);

  const paymentSchedule =
    paymentScheduleResult.status === "fulfilled"
      ? paymentScheduleResult.value
      : (console.error("Failed to load payment schedule", paymentScheduleResult.reason),
        PRIMARY_DATA_FALLBACK.paymentSchedule);

  const notes =
    notesResult.status === "fulfilled"
      ? notesResult.value
      : (console.error("Failed to load student notes", notesResult.reason),
        PRIMARY_DATA_FALLBACK.notes);

  const exams =
    examsResult.status === "fulfilled"
      ? examsResult.value
      : (console.error("Failed to load student exams", examsResult.reason),
        PRIMARY_DATA_FALLBACK.exams);

  const instructivos =
    instructivosResult.status === "fulfilled"
      ? instructivosResult.value
      : (console.error("Failed to load student instructivos", instructivosResult.reason),
        PRIMARY_DATA_FALLBACK.instructivos);

  return {
    basicDetails,
    paymentSchedule,
    notes,
    exams,
    instructivos,
  };
}

async function loadAttendanceData(
  studentId: number,
  startDate: string,
  endDate: string,
): Promise<AttendanceData> {
  noStore();
  try {
    const excludeSundays = true;
    const results = await Promise.allSettled([
      getStudentAttendanceStats(studentId, startDate, endDate),
      getStudentProgressStats(studentId, startDate, endDate, excludeSundays),
      getStudentLessonTimeline(studentId, startDate, endDate),
    ]);

    const [attendanceStatsResult, progressStatsResult, lessonTimelineResult] = results;

    const errors: string[] = [];

    const attendanceStats =
      attendanceStatsResult.status === "fulfilled"
        ? attendanceStatsResult.value
        : (errors.push("No se pudo cargar el resumen de asistencia."), ATTENDANCE_DATA_FALLBACK.attendanceStats);
    const stats =
      progressStatsResult.status === "fulfilled"
        ? progressStatsResult.value
        : (errors.push("No se pudieron cargar los promedios de progreso."), ATTENDANCE_DATA_FALLBACK.stats);
    const lessonTimeline =
      lessonTimelineResult.status === "fulfilled"
        ? lessonTimelineResult.value
        : (errors.push("No se pudo cargar la línea de lecciones."), ATTENDANCE_DATA_FALLBACK.lessonTimeline);

    return {
      attendanceStats,
      stats,
      lessonTimeline,
      excludeSundays,
      error: errors.length ? errors.join(" ") : null,
    };
  } catch (error) {
    console.error("Failed to load student attendance data", error);
    return {
      ...ATTENDANCE_DATA_FALLBACK,
      attendanceStats: { ...ATTENDANCE_DATA_FALLBACK.attendanceStats },
      stats: { ...ATTENDANCE_DATA_FALLBACK.stats },
      lessonTimeline: [...ATTENDANCE_DATA_FALLBACK.lessonTimeline],
      error: "No se pudo cargar la información de asistencia. Intenta nuevamente más tarde.",
    };
  }
}

async function AttendancePanelSection({
  studentId,
  startDate,
  endDate,
  contractStart,
}: {
  studentId: number;
  startDate: string;
  endDate: string;
  contractStart: string | null;
}) {
  const data = await loadAttendanceData(studentId, startDate, endDate);

  return (
    <AttendancePanel
      attendanceStats={data.attendanceStats}
      stats={data.stats}
      lessonTimeline={data.lessonTimeline}
      excludeSundays={data.excludeSundays}
      errorMessage={data.error}
      startDate={startDate}
      endDate={endDate}
      contractStart={contractStart}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ studentId: string }>;
}): Promise<Metadata> {
  noStore();
  const resolvedParams = await params;
  const studentId = Number(resolvedParams.studentId);

  if (!Number.isFinite(studentId)) {
    return { title: "Perfil de estudiante · Inglés Rápido Manta" };
  }

  try {
    const details = await getStudentBasicDetails(studentId);
    const name = details?.fullName?.trim();

    return {
      title: name
        ? `${name} · Perfil de estudiante · Inglés Rápido Manta`
        : "Perfil de estudiante · Inglés Rápido Manta",
    };
  } catch (error) {
    console.error("Failed to generate student metadata", error);
    return { title: "Perfil de estudiante · Inglés Rápido Manta" };
  }
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const resolvedParams = await params;
  const studentId = Number(resolvedParams.studentId);

  if (!Number.isFinite(studentId)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-lg font-semibold text-brand-deep">
        ID inválido
      </div>
    );
  }

  const today = new Date();
  const startRange = new Date(today);
  startRange.setDate(startRange.getDate() - 29);
  const startDate = formatDateISO(startRange);
  const endDate = formatDateISO(today);

  const primaryData = await loadPrimaryProfileData(studentId);
  
  // If student doesn't exist, show not-found page
  if (!primaryData.basicDetails) {
    notFound();
  }
  
  const studentName = primaryData.basicDetails?.fullName?.trim() || "Nombre no disponible";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-20 h-64 w-64 -rotate-[16deg] rounded-[42px] bg-[#ffe6d2] opacity-80" />
        <div className="absolute right-0 top-10 h-56 w-56 rotate-[12deg] rounded-[38px] bg-[#dff8f2] opacity-80" />
        <div className="absolute bottom-0 left-1/2 h-[480px] w-[120%] -translate-x-1/2 rounded-t-[180px] bg-gradient-to-r from-[#ffeede] via-white to-[#c9f5ed]" />
      </div>

      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 md:px-10 lg:px-14">
        <header className="flex flex-col gap-3 rounded-[28px] border border-white/70 bg-white/92 px-6 py-6 text-left shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-brand-ink-muted">
            <div className="flex flex-col gap-1">
              <Link href="/administracion" className="text-brand-teal hover:underline">
                ← Volver a administración
              </Link>
              <Link href="/administracion/gestion-estudiantes" className="text-brand-teal hover:underline">
                ← Volver a gestión de estudiantes
              </Link>
            </div>
            <Link
              href="/registro"
              className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
            >
              Abrir check-in de estudiantes
            </Link>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-deep-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-deep">
            Perfil académico
          </span>
          <div className="flex flex-col gap-2 text-brand-deep">
            <h1 className="text-3xl font-black sm:text-4xl">{studentName}</h1>
            <p className="max-w-3xl text-sm text-brand-ink-muted sm:text-base">
              Consulta la información integral del estudiante, desde datos personales hasta progreso académico en tiempo real.
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-8 pb-10">
          <Suspense fallback={<BasicDetailsPanelSkeleton />}>
            <BasicDetailsPanel studentId={studentId} details={primaryData.basicDetails} />
          </Suspense>
          <Suspense fallback={<PaymentSchedulePanelSkeleton />}>
            <PaymentSchedulePanel studentId={studentId} entries={primaryData.paymentSchedule} />
          </Suspense>
          <Suspense fallback={<ExamsPanelSkeleton />}>
            <ExamsPanel studentId={studentId} exams={primaryData.exams} />
          </Suspense>
          <Suspense fallback={<InstructivosPanelSkeleton />}>
            <InstructivosPanel studentId={studentId} instructivos={primaryData.instructivos} />
          </Suspense>
          <div className="grid gap-8 lg:grid-cols-2">
            <Suspense fallback={<AttendancePanelSkeleton />}>
              <AttendancePanelSection
                studentId={studentId}
                startDate={startDate}
                endDate={endDate}
                contractStart={primaryData.basicDetails?.contractStart ?? null}
              />
            </Suspense>
            <Suspense fallback={<NotesPanelSkeleton />}>
              <NotesPanel studentId={studentId} notes={primaryData.notes} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
