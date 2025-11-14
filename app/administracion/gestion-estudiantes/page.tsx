import type { Metadata } from "next";
import { listStudentManagementEntries } from "@/features/administration/data/students";
import { StudentManagementTable } from "@/features/administration/components/student-management-table";
import { StudentManagementHeader } from "@/features/administration/components/student-management-header";
import { neon } from "@neondatabase/serverless";

export const metadata: Metadata = {
  title: "Gestión de estudiantes · Inglés Rápido Manta",
};

export const revalidate = 0;

async function getLastRefreshTime(): Promise<string | null> {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = (await sql`
      SELECT 
        COALESCE(refreshed_at, last_refreshed_at) AS refreshed_at
      FROM mgmt.last_refresh_v;
    `) as { refreshed_at: string }[];
    console.log("✅ Last refresh time loaded successfully:", rows[0]?.refreshed_at);
    return rows[0]?.refreshed_at ?? null;
  } catch (error) {
    console.error("❌ Error loading last refresh time:", error);
    return null;
  }
}

export default async function GestionEstudiantesPage() {
  let students = [] as Awaited<ReturnType<typeof listStudentManagementEntries>>;
  let dataError: string | null = null;
  let lastRefreshedAt: string | null = null;

  try {
    const [studentsResult, refreshTimeResult] = await Promise.allSettled([
      listStudentManagementEntries(),
      getLastRefreshTime(),
    ]);

    console.log("📊 Students query result:", studentsResult.status);
    console.log("⏰ Refresh time query result:", refreshTimeResult.status);

    if (studentsResult.status === "fulfilled") {
      students = studentsResult.value;
      console.log(`✅ Loaded ${students.length} students successfully`);
    } else {
      console.error("❌ Failed to load students:", studentsResult.reason);
      console.error("❌ Error details:", {
        message: studentsResult.reason instanceof Error ? studentsResult.reason.message : String(studentsResult.reason),
        stack: studentsResult.reason instanceof Error ? studentsResult.reason.stack : undefined,
      });
      dataError =
        "No pudimos cargar la lista de estudiantes. Inténtalo nuevamente en unos minutos o contacta al equipo técnico.";
    }

    if (refreshTimeResult.status === "fulfilled") {
      lastRefreshedAt = refreshTimeResult.value;
    } else {
      console.error("❌ Failed to load refresh time:", refreshTimeResult.reason);
    }
  } catch (error) {
    console.error("❌ Unexpected error in student management page:", error);
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
        <StudentManagementHeader initialRefreshedAt={lastRefreshedAt} />

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
