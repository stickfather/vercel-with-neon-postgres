import Link from "next/link";
import type { Metadata } from "next";
import { listStudentManagementEntries } from "@/features/administration/data/students";
import { StudentManagementTable } from "@/features/administration/components/student-management-table";

export const metadata: Metadata = {
  title: "Gestión de estudiantes · Inglés Rápido Manta",
};

export const revalidate = 0;

export default async function GestionEstudiantesPage() {
  let students = [] as Awaited<ReturnType<typeof listStudentManagementEntries>>;
  let dataError: string | null = null;

  try {
    students = await listStudentManagementEntries();
  } catch (error) {
    console.error("No se pudieron cargar los estudiantes", error);
    dataError =
      "No pudimos cargar la lista de estudiantes. Inténtalo nuevamente en unos minutos o contacta al equipo técnico.";
  }

  const actionButtonBaseClass =
    "inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide transition hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-24 h-60 w-60 -rotate-[16deg] rounded-[38px] bg-[#ffe6d2] opacity-80" />
        <div className="absolute right-0 top-10 h-52 w-52 rotate-[12deg] rounded-[34px] bg-[#dff8f2] opacity-80" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[120%] -translate-x-1/2 rounded-t-[170px] bg-gradient-to-r from-[#ffeede] via-white to-[#c9f5ed]" />
      </div>
      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4 rounded-[32px] border border-white/70 bg-white/92 px-7 py-8 text-left shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-deep-soft px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-brand-deep">
            Gestión académica
          </span>
          <div className="flex flex-col gap-3 text-brand-deep">
            <h1 className="text-3xl font-black sm:text-4xl">Gestión de estudiantes</h1>
            <p className="max-w-3xl text-base text-brand-ink-muted sm:text-lg">
              Visualiza el estado general de cada estudiante y las banderas clave asignadas por el equipo académico. Usa los filtros para centrarte en los casos prioritarios.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/administracion"
              className={`${actionButtonBaseClass} border border-transparent bg-white text-brand-deep shadow hover:border-brand-teal hover:bg-brand-teal-soft/60 focus-visible:outline-[#00bfa6]`}
            >
              ← Volver al panel
            </Link>
            <Link
              href="/registro"
              className={`${actionButtonBaseClass} border border-transparent bg-brand-orange text-white shadow hover:bg-[#ff6a00] focus-visible:outline-[#ff7a23]`}
            >
              Abrir check-in de estudiantes
            </Link>
          </div>
        </header>

        {dataError ? (
          <div className="rounded-[32px] border border-brand-orange bg-white/85 px-6 py-5 text-sm font-medium text-brand-ink">
            {dataError}
          </div>
        ) : (
          <StudentManagementTable students={students} />
        )}
      </main>
    </div>
  );
}
