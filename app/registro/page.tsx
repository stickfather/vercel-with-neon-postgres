import Link from "next/link";
import {
  getActiveAttendances,
  getLevelsWithLessons,
} from "@/features/student-checkin/data/queries";
import { getActiveStaffAttendances } from "@/features/staff/data/queries";
import { AttendanceBoard } from "@/features/student-checkin/components/attendance-board";
import { CheckInForm } from "@/features/student-checkin/components/check-in-form";

export const revalidate = 0;

export default async function RegistroPage() {
  let levels = [] as Awaited<ReturnType<typeof getLevelsWithLessons>>;
  let attendances = [] as Awaited<ReturnType<typeof getActiveAttendances>>;
  let staffAttendances = [] as Awaited<ReturnType<typeof getActiveStaffAttendances>>;
  let formError: string | null = null;
  let lessonsError: string | null = null;
  let attendanceError: string | null = null;
  let staffAttendanceError: string | null = null;

  try {
    levels = await getLevelsWithLessons();
    if (!levels.length) {
      lessonsError =
        "Aún no hay lecciones disponibles para seleccionar. Nuestro equipo lo resolverá en breve.";
    }
  } catch (error) {
    console.error(
      "No se pudieron cargar los niveles y lecciones disponibles",
      error,
    );
    formError =
      "No pudimos cargar la lista de niveles. Contacta a un asesor para registrar tu asistencia.";
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

  try {
    staffAttendances = await getActiveStaffAttendances();
  } catch (error) {
    console.error("No se pudieron cargar las asistencias del personal", error);
    staffAttendanceError =
      "No pudimos cargar la lista del personal registrado. Consulta el panel de administración.";
  }

  const headerButtonBaseClass =
    "inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2";
  const staffTimeFormatter = new Intl.DateTimeFormat("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-16 h-60 w-60 -rotate-[14deg] rounded-[42px] bg-[#ffe3cd] opacity-80" />
        <div className="absolute right-4 top-24 h-52 w-52 rotate-[18deg] rounded-[36px] bg-[#ccf6f0] opacity-80" />
        <div className="absolute bottom-0 left-1/2 h-[460px] w-[120%] -translate-x-1/2 rounded-t-[180px] bg-gradient-to-r from-[#ffe7d1] via-[#ffffffef] to-[#c9f5ed]" />
      </div>
      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-3 rounded-[28px] border border-white/70 bg-white/92 px-5 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 text-left">
            <h1 className="text-2xl font-black text-brand-deep sm:text-[28px]">Check-in de estudiantes</h1>
            <Link
              href="/"
              className="inline-flex w-fit items-center justify-center rounded-full border border-transparent bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow hover:border-brand-teal focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
            >
              ← Volver a bienvenida
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/administracion"
              className={`${headerButtonBaseClass} border border-transparent bg-white text-brand-deep shadow hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/60 focus-visible:outline-[#00bfa6]`}
            >
              Acceso administrativo
            </Link>
            <Link
              href="/administracion/registro-personal"
              className={`${headerButtonBaseClass} border border-transparent bg-brand-teal text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline-[#ff7a23]`}
            >
              Check-in del personal
            </Link>
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-[1fr_1.35fr]">
          <CheckInForm
            levels={levels}
            disabled={Boolean(formError)}
            initialError={formError}
            lessonsError={lessonsError}
          />
          <aside className="flex flex-col gap-5 rounded-[36px] border border-white/70 bg-white/92 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-brand-deep">Estudiantes en clase</h2>
              <span className="rounded-full bg-brand-teal-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal">
                {attendances.length}
              </span>
            </div>
            <p className="text-sm text-brand-ink-muted">Haz clic en tu burbuja para registrar tu salida.</p>
            {attendanceError && (
              <p className="rounded-3xl border border-brand-orange bg-white/85 px-4 py-3 text-xs font-medium text-brand-ink">
                {attendanceError}
              </p>
            )}
            <AttendanceBoard attendances={attendances} />
            <section className="flex flex-col gap-3 rounded-[28px] border border-dashed border-brand-teal/60 bg-white/80 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-deep">
                  Personal registrado
                </h3>
                <span className="rounded-full bg-brand-deep-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-deep">
                  {staffAttendances.length}
                </span>
              </div>
              {staffAttendanceError ? (
                <p className="text-xs text-brand-ink">{staffAttendanceError}</p>
              ) : staffAttendances.length ? (
                <ul className="flex flex-col gap-2">
                  {staffAttendances.map((staff) => {
                    const checkIn = staff.checkInTime ? new Date(staff.checkInTime) : null;
                    const formatted = checkIn ? staffTimeFormatter.format(checkIn) : null;
                    return (
                      <li
                        key={staff.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-white/90 px-4 py-2 text-xs text-brand-ink"
                      >
                        <span className="font-semibold text-brand-deep">{staff.fullName}</span>
                        {formatted && (
                          <span className="rounded-full bg-brand-teal-soft px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-teal">
                            {formatted}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-brand-ink-muted">
                  Aún no hay registros del personal en esta jornada.
                </p>
              )}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
