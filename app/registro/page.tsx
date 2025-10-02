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
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-14 md:px-10 lg:px-12">
        <div className="flex w-full flex-col gap-4 rounded-[30px] bg-white/80 px-6 py-6 shadow-2xl backdrop-blur md:flex-row md:items-center md:justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-deep-soft">
            Registro de estudiantes
          </span>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-5 py-2 text-sm font-semibold text-brand-deep shadow-sm transition hover:border-brand-teal hover:text-brand-teal"
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
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col gap-6">
            <CheckInForm
              students={students}
              levels={levels}
              disabled={!levels.length || !students.length}
              initialError={formError}
            />
            <div className="rounded-[28px] bg-white/75 px-7 py-6 text-sm text-brand-ink-muted shadow-2xl backdrop-blur">
              <h2 className="mb-2 text-base font-semibold uppercase tracking-wide text-brand-deep">
                Pasos rápidos
              </h2>
              <ol className="flex list-decimal flex-col gap-2 pl-5">
                <li>Escribe tu nombre y selecciónalo de la lista desplegable.</li>
                <li>Elige el nivel de tu curso.</li>
                <li>Selecciona la lección programada.</li>
                <li>Confirma tu asistencia y dirígete al aula.</li>
              </ol>
            </div>
          </div>
          <section className="flex flex-col gap-5 rounded-[34px] bg-white/85 px-7 py-8 shadow-2xl backdrop-blur">
            <header className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 text-left">
                <h2 className="text-2xl font-bold text-brand-deep">
                  Estudiantes en clase
                </h2>
                <p className="text-sm text-brand-ink-muted">
                  Toca tu nombre cuando termines para registrar tu salida.
                </p>
              </div>
              <span className="inline-flex items-center justify-center rounded-full bg-[#e6fbf7] px-4 py-1 text-sm font-semibold text-brand-teal">
                {attendances.length}
              </span>
            </header>
            {boardError ? (
              <p className="rounded-3xl border border-brand-orange bg-[#fff4ec] px-5 py-3 text-sm font-medium text-brand-ink">
                {boardError}
              </p>
            ) : (
              <AttendanceBoard attendances={attendances} />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
