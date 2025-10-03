import Link from "next/link";
import {
  getActiveStaffAttendances,
  getStaffDirectory,
} from "@/app/db";
import { StaffAttendanceBoard } from "@/components/staff-attendance-board";
import { StaffCheckInForm } from "@/components/staff-check-in-form";

export const revalidate = 0;

export default async function RegistroPersonalPage() {
  let staffMembers = [] as Awaited<ReturnType<typeof getStaffDirectory>>;
  let attendances = [] as Awaited<ReturnType<typeof getActiveStaffAttendances>>;
  let formError: string | null = null;
  let boardError: string | null = null;

  const [staffResult, attendanceResult] = await Promise.allSettled([
    getStaffDirectory(),
    getActiveStaffAttendances(),
  ]);

  if (staffResult.status === "fulfilled") {
    staffMembers = staffResult.value;
  } else {
    console.error("No se pudo cargar el personal", staffResult.reason);
    formError =
      "No pudimos cargar la lista de personal. Contacta a coordinación para registrar tu asistencia.";
  }

  if (attendanceResult.status === "fulfilled") {
    attendances = attendanceResult.value;
  } else {
    console.error(
      "No se pudieron cargar las asistencias del personal",
      attendanceResult.reason,
    );
    boardError =
      "No pudimos mostrar quién está presente. Verifica manualmente en el panel principal.";
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-24 h-56 w-56 -rotate-6 rounded-[38px] bg-[#ffe4d0] shadow-[0_22px_60px_rgba(0,0,0,0.08)]" />
        <div className="absolute right-10 top-16 h-44 w-44 rotate-8 rounded-[32px] bg-[#f0f4ff] shadow-[0_18px_48px_rgba(0,0,0,0.08)]" />
        <div className="absolute bottom-0 left-1/2 h-64 w-[130%] -translate-x-1/2 rounded-t-[140px] bg-gradient-to-r from-[#ffe7b8] via-white to-[#c9f8f2]" />
        <div className="absolute bottom-36 left-16 h-20 w-20 rotate-12 rounded-full border-8 border-[#ff7a23]/25" />
        <div className="absolute bottom-16 right-24 h-14 w-40 -rotate-6 rounded-[22px] bg-[#ffdde9]" />
      </div>
      <main className="relative mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-12 px-6 py-14 md:px-10 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/administracion"
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-white/90 px-4 py-2 text-sm font-semibold text-brand-deep shadow-sm backdrop-blur transition hover:border-brand-teal hover:text-brand-teal"
          >
            ← Volver al panel
          </Link>
          <Link
            href="/registro"
            className="inline-flex items-center justify-center rounded-full bg-brand-teal px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow transition hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ff7a23]"
          >
            Registro de estudiantes
          </Link>
        </div>

        <div className="grid gap-12 xl:grid-cols-[1.3fr_1.7fr]">
          <StaffCheckInForm
            staffMembers={staffMembers}
            disabled={!staffMembers.length}
            initialError={formError}
          />
          <section className="relative flex min-h-[520px] flex-col gap-6 rounded-[48px] border-2 border-[#d6dcff] bg-gradient-to-br from-white via-[#f4f6ff] to-[#ffe9de] px-12 py-14 shadow-[0_32px_72px_rgba(15,23,42,0.16)]">
            <div className="pointer-events-none absolute -top-10 left-16 hidden h-24 w-24 rotate-[18deg] rounded-[32px] bg-[#ffb15c]/40 blur-2xl xl:block" />
            <div className="pointer-events-none absolute -bottom-12 right-20 hidden h-28 w-28 -rotate-[14deg] rounded-[34px] bg-[#59d4c3]/40 blur-2xl xl:block" />
            <div className="pointer-events-none absolute inset-x-12 top-1/3 hidden h-16 rotate-3 bg-[repeating-linear-gradient(90deg,rgba(30,27,50,0.06),rgba(30,27,50,0.06)_12px,rgba(255,255,255,0)_12px,rgba(255,255,255,0)_30px)] opacity-60 blur-sm xl:block" />
            <header className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 text-left">
                <h2 className="text-3xl font-black text-brand-deep">Equipo en sede</h2>
                <p className="text-sm text-brand-ink-muted">
                  Coordina la entrada y salida del staff.
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
                <StaffAttendanceBoard attendances={attendances} />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
