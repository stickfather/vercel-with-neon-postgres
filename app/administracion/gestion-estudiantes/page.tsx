import type { Metadata } from "next";
import { listStudentManagementEntries } from "@/features/administration/data/students";
import { StudentManagementTable } from "@/features/administration/components/student-management-table";
import { StudentManagementHeader } from "@/features/administration/components/student-management-header";

export const metadata: Metadata = {
  title: "Gestión de estudiantes · Inglés Rápido Manta",
};

export const revalidate = 0;

export default async function GestionEstudiantesPage() {
  let students = [] as Awaited<ReturnType<typeof listStudentManagementEntries>>;
  let dataError: string | null = null;

  try {
    students = await listStudentManagementEntries();
    console.log(`✅ Loaded ${students.length} students successfully`);
  } catch (error) {
    console.error("❌ Failed to load students:", error);
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    dataError =
      "No pudimos cargar la lista de estudiantes. Inténtalo nuevamente en unos minutos o contacta al equipo técnico.";
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-24 h-60 w-60 -rotate-[16deg] rounded-[38px] bg-[#ffe6d2] opacity-80" />
        <div className="absolute right-0 top-10 h-52 w-52 rotate-[12deg] rounded-[34px] bg-[#dff8f2] opacity-80" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[120%] -translate-x-1/2 rounded-t-[170px] bg-gradient-to-r from-[#ffeede] via-white to-[#c9f5ed]" />
      </div>
      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 md:px-10 lg:px-14">
        <StudentManagementHeader initialRefreshedAt={null} />

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
