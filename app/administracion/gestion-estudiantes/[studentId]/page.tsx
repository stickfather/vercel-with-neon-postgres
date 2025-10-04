import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";

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
  AttendancePanel,
  AttendancePanelSkeleton,
} from "@/features/administration/components/student-profile/attendance-panel";
import {
  getStudentBasicDetails,
  listStudentPaymentSchedule,
  listStudentNotes,
  listStudentExams,
  getStudentProgressStats,
  getStudentMinutesByDay,
  getStudentCumulativeHours,
  getStudentLessonTimeline,
} from "@/features/administration/data/student-profile";

const NOTES_REVALIDATE_SECONDS = 60;
const EXAMS_REVALIDATE_SECONDS = 60;

export const revalidate = 30;

function ensureDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not configured.");
  }
}

function coerceStudentId(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const integer = Math.trunc(parsed);
  return integer > 0 ? integer : null;
}

function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const getStudentNotesCached = unstable_cache(
  async (studentId: number) => listStudentNotes(studentId),
  ["student-profile", "notes"],
  { revalidate: NOTES_REVALIDATE_SECONDS },
);

const getStudentExamsCached = unstable_cache(
  async (studentId: number) => listStudentExams(studentId),
  ["student-profile", "exams"],
  { revalidate: EXAMS_REVALIDATE_SECONDS },
);

type PrimaryProfileData = {
  basicDetails: Awaited<ReturnType<typeof getStudentBasicDetails>>;
  paymentSchedule: Awaited<ReturnType<typeof listStudentPaymentSchedule>>;
  notes: Awaited<ReturnType<typeof listStudentNotes>>;
  exams: Awaited<ReturnType<typeof listStudentExams>>;
};

type AttendanceData = {
  stats: Awaited<ReturnType<typeof getStudentProgressStats>>;
  minutesByDay: Awaited<ReturnType<typeof getStudentMinutesByDay>>;
  cumulativeHours: Awaited<ReturnType<typeof getStudentCumulativeHours>>;
  lessonTimeline: Awaited<ReturnType<typeof getStudentLessonTimeline>>;
};

const PRIMARY_DATA_FALLBACK: PrimaryProfileData = {
  basicDetails: null,
  paymentSchedule: [],
  notes: [],
  exams: [],
};

const ATTENDANCE_DATA_FALLBACK: AttendanceData = {
  stats: {
    averageSessionLengthMinutes: null,
    averageDaysPerWeek: null,
    averageProgressPerWeek: null,
  },
  minutesByDay: [],
  cumulativeHours: [],
  lessonTimeline: [],
};

async function loadPrimaryProfileData(studentId: number): Promise<PrimaryProfileData> {
  try {
    ensureDatabaseUrl();
    const [basicDetails, paymentSchedule, notes, exams] = await Promise.all([
      getStudentBasicDetails(studentId),
      listStudentPaymentSchedule(studentId),
      getStudentNotesCached(studentId),
      getStudentExamsCached(studentId),
    ]);

    return {
      basicDetails,
      paymentSchedule,
      notes,
      exams,
    };
  } catch (error) {
    console.error("Failed to load student profile data", error);
    return PRIMARY_DATA_FALLBACK;
  }
}

async function loadAttendanceData(
  studentId: number,
  startDate: string,
  endDate: string,
): Promise<AttendanceData> {
  try {
    ensureDatabaseUrl();
    const [stats, minutesByDay, cumulativeHours, lessonTimeline] = await Promise.all([
      getStudentProgressStats(studentId, startDate, endDate, true),
      getStudentMinutesByDay(studentId, startDate, endDate, true),
      getStudentCumulativeHours(studentId, startDate, endDate, true),
      getStudentLessonTimeline(studentId, startDate, endDate, true),
    ]);

    return {
      stats,
      minutesByDay,
      cumulativeHours,
      lessonTimeline,
    };
  } catch (error) {
    console.error("Failed to load student attendance data", error);
    return ATTENDANCE_DATA_FALLBACK;
  }
}

async function AttendancePanelSection({
  studentId,
  startDate,
  endDate,
}: {
  studentId: number;
  startDate: string;
  endDate: string;
}) {
  const data = await loadAttendanceData(studentId, startDate, endDate);

  return (
    <AttendancePanel
      stats={data.stats}
      minutesByDay={data.minutesByDay}
      cumulativeHours={data.cumulativeHours}
      lessonTimeline={data.lessonTimeline}
      startDate={startDate}
      endDate={endDate}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ studentId: string }>;
}): Promise<Metadata> {
  const { studentId: studentIdStr } = await params;
  const studentId = coerceStudentId(studentIdStr);

  if (!studentId) {
    return { title: "Perfil de estudiante · Inglés Rápido Manta" };
  }

  try {
    ensureDatabaseUrl();
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
  const { studentId: studentIdStr } = await params;
  const studentId = coerceStudentId(studentIdStr);

  if (!studentId) {
    notFound();
  }

  const today = new Date();
  const startRange = new Date(today);
  startRange.setDate(startRange.getDate() - 29);
  const startDate = formatDateISO(startRange);
  const endDate = formatDateISO(today);

  const primaryData = await loadPrimaryProfileData(studentId);
  const studentName = primaryData.basicDetails?.fullName ?? `Estudiante ${studentId}`;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-20 h-64 w-64 -rotate-[16deg] rounded-[42px] bg-[#ffe6d2] opacity-80" />
        <div className="absolute right-0 top-10 h-56 w-56 rotate-[12deg] rounded-[38px] bg-[#dff8f2] opacity-80" />
        <div className="absolute bottom-0 left-1/2 h-[480px] w-[120%] -translate-x-1/2 rounded-t-[180px] bg-gradient-to-r from-[#ffeede] via-white to-[#c9f5ed]" />
      </div>

      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4 rounded-[32px] border border-white/70 bg-white/92 px-7 py-8 text-left shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-deep-soft px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-brand-deep">
            Perfil académico
          </span>
          <div className="flex flex-col gap-3 text-brand-deep">
            <h1 className="text-3xl font-black sm:text-4xl">{studentName}</h1>
            <p className="max-w-3xl text-base text-brand-ink-muted sm:text-lg">
              Consulta la información integral del estudiante, desde datos personales hasta progreso académico en tiempo real.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/administracion/gestion-estudiantes"
              className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
            >
              ← Volver a la gestión
            </Link>
            <Link
              href="/registro"
              className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:opacity-90 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
            >
              Abrir check-in de estudiantes
            </Link>
          </div>
        </header>

        <div className="flex flex-col gap-8 pb-10">
          <Suspense fallback={<BasicDetailsPanelSkeleton />}>
            <BasicDetailsPanel studentId={studentId} details={primaryData.basicDetails} />
          </Suspense>
          <Suspense fallback={<PaymentSchedulePanelSkeleton />}>
            <PaymentSchedulePanel studentId={studentId} entries={primaryData.paymentSchedule} />
          </Suspense>
          <Suspense fallback={<NotesPanelSkeleton />}>
            <NotesPanel studentId={studentId} notes={primaryData.notes} />
          </Suspense>
          <Suspense fallback={<ExamsPanelSkeleton />}>
            <ExamsPanel studentId={studentId} exams={primaryData.exams} />
          </Suspense>
          <Suspense fallback={<AttendancePanelSkeleton />}>
            <AttendancePanelSection studentId={studentId} startDate={startDate} endDate={endDate} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
