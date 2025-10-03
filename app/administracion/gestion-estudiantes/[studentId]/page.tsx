import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
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
import { BasicDetailsPanel } from "@/features/administration/components/student-profile/basic-details-panel";
import { PaymentSchedulePanel } from "@/features/administration/components/student-profile/payment-schedule-panel";
import { NotesPanel } from "@/features/administration/components/student-profile/notes-panel";
import { ExamsPanel } from "@/features/administration/components/student-profile/exams-panel";
import { AttendancePanel } from "@/features/administration/components/student-profile/attendance-panel";

export const revalidate = 0;

function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ studentId: string }>;
}): Promise<Metadata> {
  const { studentId: studentIdStr } = await params; // 👈 params is a Promise in Next 15
  const studentId = Number(studentIdStr);
  if (!Number.isFinite(studentId)) {
    return {
      title: "Perfil de estudiante · Inglés Rápido Manta",
    };
  }

  const details = await getStudentBasicDetails(studentId);
  const name = details?.fullName?.trim();

  return {
    title: name
      ? `${name} · Perfil de estudiante · Inglés Rápido Manta`
      : "Perfil de estudiante · Inglés Rápido Manta",
  };
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId: studentIdStr } = await params; // 👈 await here too
  const studentId = Number(studentIdStr);
  if (!Number.isFinite(studentId)) {
    notFound();
  }

  const today = new Date();
  const startRange = new Date(today);
  startRange.setDate(startRange.getDate() - 29);
  const startDate = formatDateISO(startRange);
  const endDate = formatDateISO(today);

  const [
    basicDetails,
    paymentSchedule,
    notes,
    exams,
    stats,
    minutesByDay,
    cumulativeHours,
    lessonTimeline,
  ] = await Promise.all([
    getStudentBasicDetails(studentId),
    listStudentPaymentSchedule(studentId),
    listStudentNotes(studentId),
    listStudentExams(studentId),
    getStudentProgressStats(studentId, startDate, endDate, true),
    getStudentMinutesByDay(studentId, startDate, endDate, true),
    getStudentCumulativeHours(studentId, startDate, endDate, true),
    getStudentLessonTimeline(studentId, startDate, endDate, true),
  ]);

  const studentName = basicDetails?.fullName ?? `Estudiante ${studentId}`;

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
              className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-orange px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#ff6a00] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ff7a23]"
            >
              Abrir check-in de estudiantes
            </Link>
          </div>
        </header>

        <div className="flex flex-col gap-8 pb-10">
          <BasicDetailsPanel studentId={studentId} details={basicDetails} />
          <PaymentSchedulePanel studentId={studentId} entries={paymentSchedule} />
          <NotesPanel studentId={studentId} notes={notes} />
          <ExamsPanel studentId={studentId} exams={exams} />
          <AttendancePanel
            stats={stats}
            minutesByDay={minutesByDay}
            cumulativeHours={cumulativeHours}
            lessonTimeline={lessonTimeline}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </main>
    </div>
  );
}
