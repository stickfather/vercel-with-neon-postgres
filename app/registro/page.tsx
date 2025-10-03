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
  let rosterError: string | null = null;
  let lessonsError: string | null = null;
  let attendanceError: string | null = null;

  const [studentsResult, levelsResult] = await Promise.allSettled([
    getStudentDirectory(),
    getLevelsWithLessons(),
  ]);

  if (studentsResult.status === "fulfilled") {
    students = studentsResult.value;
  } else {
    console.error(
      "No se pudo cargar el directorio de estudiantes para el registro",
      studentsResult.reason,
    );
    rosterError =
      "No pudimos conectar con la base de datos. Completa tu registro con ayuda del equipo.";
  }

  if (levelsResult.status === "fulfilled") {
    levels = levelsResult.value;
  } else {
    console.error(
      "No se pudieron cargar los niveles y lecciones disponibles",
      levelsResult.reason,
    );
    lessonsError =
      "No pudimos cargar la lista de niveles y lecciones. Nuestro equipo ya está trabajando en ello.";
  }

  try {
    attendances = await getActiveAttendances();
  } catch (error) {
    console.error("No se pudieron cargar las asistencias activas", error);
    attendanceError =
      "No pudimos cargar la lista de estudiantes en clase. Consulta el panel principal.";
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-16 h-60 w-60 -rotate-[14deg] rounded-[42px] bg-[#ffe3cd] opacity-80" />
        <div className="absolute right-4 top-24 h-52 w-52 rotate-[18deg] rounded-[36px] bg-[#ccf6f0] opacity-80" />
        <div className="absolute bottom-0 left-1/2 h-[460px] w-[120%] -translate-x-1/2 rounded-t-[180px] bg-gradient-to-r from-[#ffe7d1] via-[#ffffffef] to-[#c9f5ed]" />
      </div>
      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4 rounded-[32px] border border-white/70 bg-white/92 px-6 py-6 shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 text-left">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-teal-soft px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-brand-teal">
              Registro de estudiantes
            </span>
            <h1 className="text-2xl font-black text-brand-deep sm:text-3xl">Check-in de estudiantes</h1>
            <Link
              href="/"
              className="inline-flex w-fit items-center justify-center rounded-full border border-transparent bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow hover:border-brand-teal focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
            >
              ← Volver a bienvenida
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/administracion"
              className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow hover:border-brand-teal focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
            >
              Acceso administrativo
            </Link>
            <Link
              href="/administracion/registro-personal"
              className="inline-flex items-center justify-center rounded-full bg-brand-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ff7a23]"
            >
              Check-in del personal
            </Link>
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-[1.45fr_1fr]">
          <CheckInForm
            students={students}
            levels={levels}
            disabled={Boolean(rosterError)}
            initialError={rosterError}
            lessonsError={lessonsError}
          />
          <aside className="flex flex-col gap-5 rounded-[36px] border border-white/70 bg-white/92 p-7 shadow-[0_22px_56px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-brand-deep">Estudiantes en clase</h2>
              <span className="rounded-full bg-brand-teal-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal">
                {attendances.length}
              </span>
            </div>
            <p className="text-sm text-brand-ink-muted">
              Confirma a quiénes ya están en tu aula y verifica la hora exacta de ingreso. Los nuevos ingresos aparecerán con un distintivo.
            </p>
            {attendanceError && (
              <p className="rounded-3xl border border-brand-orange bg-white/85 px-4 py-3 text-xs font-medium text-brand-ink">
                {attendanceError}
              </p>
            )}
            <AttendanceBoard attendances={attendances} />
          </aside>
        </div>
      </main>
    </div>
  );
}
