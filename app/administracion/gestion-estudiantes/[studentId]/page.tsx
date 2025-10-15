import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { StudentAvatar } from "@/components/student/StudentAvatar";
import { StudentPhotoUploader } from "@/components/student/StudentPhotoUploader";
import { StudentProfileTabs } from "@/features/administration/components/student-profile/StudentProfileTabs";
import {
  getStudentBasicDetails,
  listStudentPaymentSchedule,
  listStudentNotes,
  listStudentExams,
  listStudentInstructivos,
  getStudentCoachPanelSummary,
  listStudentAttendanceHistory,
} from "@/features/administration/data/student-profile";
import { getStudentManagementEntry } from "@/features/administration/data/students";

export const dynamic = "force-dynamic";

type PrimaryProfileData = {
  basicDetails: Awaited<ReturnType<typeof getStudentBasicDetails>>;
  paymentSchedule: Awaited<ReturnType<typeof listStudentPaymentSchedule>>;
  notes: Awaited<ReturnType<typeof listStudentNotes>>;
  exams: Awaited<ReturnType<typeof listStudentExams>>;
  instructivos: Awaited<ReturnType<typeof listStudentInstructivos>>;
};

type CoachPanelData = {
  summary: Awaited<ReturnType<typeof getStudentCoachPanelSummary>>;
  error: string | null;
};

type AttendanceHistoryData = {
  entries: Awaited<ReturnType<typeof listStudentAttendanceHistory>>;
  error: string | null;
};

const PRIMARY_DATA_FALLBACK: PrimaryProfileData = {
  basicDetails: null,
  paymentSchedule: [],
  notes: [],
  exams: [],
  instructivos: [],
};

const COACH_PANEL_FALLBACK: CoachPanelData = {
  summary: null,
  error: null,
};

const ATTENDANCE_HISTORY_FALLBACK: AttendanceHistoryData = {
  entries: [],
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

async function loadCoachPanelData(studentId: number): Promise<CoachPanelData> {
  noStore();
  try {
    const summary = await getStudentCoachPanelSummary(studentId);
    return {
      summary,
      error: null,
    };
  } catch (error) {
    console.error("Failed to load student coach panel data", error);
    return {
      ...COACH_PANEL_FALLBACK,
      error: "No se pudo cargar la información del panel del coach. Intenta nuevamente más tarde.",
    };
  }
}

async function loadAttendanceHistory(studentId: number): Promise<AttendanceHistoryData> {
  noStore();
  try {
    const entries = await listStudentAttendanceHistory(studentId);
    return {
      entries,
      error: null,
    };
  } catch (error) {
    console.error("Failed to load student attendance history", error);
    return {
      ...ATTENDANCE_HISTORY_FALLBACK,
      error: "No se pudo cargar el historial de asistencia. Intenta nuevamente más tarde.",
    };
  }
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

  const [primaryData, coachPanelData, attendanceData] = await Promise.all([
    loadPrimaryProfileData(studentId),
    loadCoachPanelData(studentId),
    loadAttendanceHistory(studentId),
  ]);

  // If student doesn't exist, show not-found page
  if (!primaryData.basicDetails) {
    notFound();
  }

  const basicDetails = primaryData.basicDetails!;
  const studentName = basicDetails?.fullName?.trim() || "Nombre no disponible";
  const metadataItems: string[] = [];

  const statusLabel = basicDetails.status?.trim();
  if (statusLabel) {
    metadataItems.push(`Estado: ${statusLabel}`);
  }

  const currentLevel = basicDetails.currentLevel?.trim();
  if (currentLevel) {
    metadataItems.push(`Nivel actual: ${currentLevel}`);
  }

  if (basicDetails.isOnline != null) {
    metadataItems.push(
      basicDetails.isOnline ? "Modalidad: En línea" : "Modalidad: Presencial",
    );
  }

  metadataItems.push(`ID ${studentId}`);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-20 h-64 w-64 -rotate-[16deg] rounded-[42px] bg-[#ffe6d2] opacity-80" />
        <div className="absolute right-0 top-10 h-56 w-56 rotate-[12deg] rounded-[38px] bg-[#dff8f2] opacity-80" />
        <div className="absolute bottom-0 left-1/2 h-[480px] w-[120%] -translate-x-1/2 rounded-t-[180px] bg-gradient-to-r from-[#ffeede] via-white to-[#c9f5ed]" />
      </div>

      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 md:px-10 lg:px-14">
        <header className="flex flex-col gap-6 rounded-[28px] border border-white/70 bg-white/92 px-6 py-6 text-left shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
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
          <div className="flex flex-col gap-6 text-brand-deep lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <StudentAvatar
                name={studentName}
                photoUrl={basicDetails.photoUrl}
                updatedAt={basicDetails.photoUpdatedAt}
              />
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-black sm:text-4xl">{studentName}</h1>
                  <StudentPhotoUploader studentId={studentId} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-brand-ink-muted">
                  {metadataItems.map((item, index) => (
                    <span key={`${item}-${index}`} className="inline-flex items-center gap-2">
                      {item}
                      {index < metadataItems.length - 1 ? (
                        <span aria-hidden="true" className="text-brand-ink-muted/60">
                          ·
                        </span>
                      ) : null}
                    </span>
                  ))}
                </div>
                <p className="max-w-2xl text-sm text-brand-ink-muted sm:text-base">
                  Consulta la información integral del estudiante, desde datos personales hasta progreso académico en tiempo real.
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-8 pb-10">
        <StudentProfileTabs
          studentId={studentId}
          basicDetails={basicDetails}
          paymentSchedule={primaryData.paymentSchedule}
          exams={primaryData.exams}
          instructivos={primaryData.instructivos}
          notes={primaryData.notes}
          coachSummary={coachPanelData.summary}
          coachError={coachPanelData.error}
          attendanceHistory={attendanceData.entries}
          attendanceError={attendanceData.error}
        />
        </div>
      </main>
    </div>
  );
}
