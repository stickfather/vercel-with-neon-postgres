import { listStaffMembers } from "@/app/db";
import { StaffSettingsPanel } from "@/components/staff-settings-panel";

export const revalidate = 0;

export default async function ConfiguracionPage() {
  let staffMembers = [] as Awaited<ReturnType<typeof listStaffMembers>>;
  let loadError: string | null = null;

  try {
    staffMembers = await listStaffMembers();
  } catch (error) {
    console.error("No se pudo cargar la configuración del personal", error);
    loadError =
      "No pudimos obtener la lista de personal. Intenta nuevamente o revisa la conexión con la base de datos.";
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-20 h-60 w-60 -rotate-6 rounded-[42px] bg-[#ffe7d4] shadow-[0_28px_70px_rgba(15,23,42,0.12)]" />
        <div className="absolute right-0 top-0 h-48 w-48 rotate-12 rounded-[32px] bg-[#e8f1ff] shadow-[0_28px_64px_rgba(15,23,42,0.1)]" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[120%] -translate-x-1/2 rounded-t-[160px] bg-gradient-to-r from-[#fff3e4] via-white to-[#dcf9f1]" />
      </div>
      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 py-16 md:px-10 lg:px-14">
        <header className="flex flex-col gap-3 text-left text-brand-deep">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#1e1b32] px-4 py-1 text-xs font-semibold uppercase tracking-[0.38em] text-white">
            Ajustes
          </span>
          <h1 className="text-4xl font-black sm:text-5xl">Configuración del personal</h1>
          <p className="max-w-3xl text-base text-brand-ink-muted sm:text-lg">
            Administra quién forma parte del equipo, sus roles y horarios de referencia. Todos los cambios se reflejan de inmediato en el registro del personal.
          </p>
        </header>

        <StaffSettingsPanel initialStaff={staffMembers} initialError={loadError} />
      </main>
    </div>
  );
}
