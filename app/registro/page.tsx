import Link from "next/link";
import {
  getActiveAttendances,
  getLevelsWithLessons,
  getStudentDirectory,
} from "@/app/db";
import { AttendanceBoard } from "@/components/attendance-board";
import { CheckInForm } from "@/components/check-in-form";

export const revalidate = 0;

export default async function RegistroPage() {
  let students = [] as Awaited<ReturnType<typeof getStudentDirectory>>;
  let levels = [] as Awaited<ReturnType<typeof getLevelsWithLessons>>;
  let attendances = [] as Awaited<ReturnType<typeof getActiveAttendances>>;
  let formError: string | null = null;
  let boardError: string | null = null;

  const [studentsResult, levelsResult, attendanceResult] = await Promise.allSettled([
    getStudentDirectory(),
    getLevelsWithLessons(),
    getActiveAttendances(),
  ]);

  if (studentsResult.status === "fulfilled") {
    students = studentsResult.value;
  } else {
    console.error("No se pudieron cargar los estudiantes", studentsResult.reason);
    formError =
      "No pudimos cargar la lista de estudiantes. Solicita ayuda del personal para registrar tu asistencia.";
  }

  if (levelsResult.status === "fulfilled") {
    levels = levelsResult.value;
  } else {
    console.error("No se pudieron cargar los niveles", levelsResult.reason);
    formError =
      formError ??
      "Las lecciones no están disponibles ahora mismo. Habla con el personal para completar tu registro.";
  }

  if (attendanceResult.status === "fulfilled") {
    attendances = attendanceResult.value;
  } else {
    console.error("No se pudieron cargar las asistencias activas", attendanceResult.reason);
    boardError =
      "No pudimos mostrar la lista de asistentes. Revisa el panel principal para verificar tu salida.";
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-16 top-24 h-56 w-56 -rotate-12 rounded-[38px] bg-[#ffe4d0] shadow-[0_22px_60px_rgba(0,0,0,0.08)]" />
        <div className="absolute right-6 top-12 h-40 w-40 rotate-6 rounded-[30px] bg-[#f0f4ff] shadow-[0_16px_40px_rgba(0,0,0,0.08)]" />
        <div className="absolute bottom-0 left-1/2 h-64 w-[130%] -translate-x-1/2 rounded-t-[120px] bg-gradient-to-r from-[#ffe8b5] via-white to-[#c9f8f2]" />
        <div className="absolute bottom-32 left-10 h-24 w-24 rotate-12 rounded-full border-8 border-[#ff7a23]/25" />
        <div className="absolute bottom-20 right-20 h-16 w-40 -rotate-6 rounded-[22px] bg-[#ffdde9]" />
      </div>
      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-12 px-6 py-14 md:px-10 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-white/90 px-4 py-2 text-sm font-semibold text-brand-deep shadow-sm backdrop-blur transition hover:border-brand-teal hover:text-brand-teal"
          >
            ← Volver a bienvenida
          </Link>
          <Link
            href="/administracion"
            className="inline-flex items-center justify-center rounded-full bg-brand-teal px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow transition hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ff7a23]"
          >
            Acceso del personal
          </Link>
        </div>

        <div className="grid gap-12 xl:grid-cols-[1.55fr_1.45fr]">
          <CheckInForm
            students={students}
            levels={levels}
            disabled={!levels.length || !students.length}
            initialError={formError}
          />
          <section className="relative flex min-h-[560px] flex-col gap-6 rounded-[48px] border-2 border-[#d6dcff] bg-gradient-to-br from-white via-[#f4f6ff] to-[#ffe9de] px-10 py-14 shadow-[0_28px_64px_rgba(15,23,42,0.16)]">
            <div className="pointer-events-none absolute -top-6 left-10 hidden h-20 w-20 rotate-12 rounded-full bg-[#ffb15c]/35 blur-2xl xl:block" />
            <div className="pointer-events-none absolute -bottom-8 right-16 hidden h-24 w-24 -rotate-6 rounded-full bg-[#59d4c3]/35 blur-2xl xl:block" />
            <header className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 text-left">
                <h2 className="text-3xl font-black text-brand-deep">Estudiantes en clase</h2>
                <p className="text-sm text-brand-ink-muted">
                  Celebra el progreso de tus compañeros.
                </p>
              </div>
              <span className="inline-flex items-center justify-center rounded-full bg-[#e6fbf7] px-5 py-2 text-base font-semibold text-brand-teal">
                {attendances.length}
              </span>
            </header>
            <div className="flex-1">
              {boardError ? (
                <p className="rounded-3xl border border-brand-orange bg-[#fff4ec] px-5 py-3 text-sm font-medium text-brand-ink">
                  {boardError}
                </p>
              ) : (
                <AttendanceBoard attendances={attendances} />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
