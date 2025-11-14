import { EngagementPanelClient } from "@/components/reports/engagement-panel/EngagementPanelClient";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default function EngagementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-white to-[#f0fdf4]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
            Informes de gestión
          </span>
          <h1 className="text-3xl font-black text-slate-900 sm:text-[40px]">Reporte de compromiso</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Seguimiento operativo de asistencia, estudiantes en riesgo y horas efectivas por horario.
          </p>
        </header>

        <EngagementPanelClient />
      </main>
    </div>
  );
}
