import { PersonnelPanelClient } from "@/components/reports/personnel/PersonnelPanelClient";

export const revalidate = 300;

export default function PersonnelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3f9ff] via-white to-[#ebfdf5]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
              Informes de gestión
            </span>
            <h1 className="text-3xl font-black text-slate-900 sm:text-[40px]">
              Reporte de Cobertura y Carga de Personal
            </h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Análisis integral de cobertura de personal, ratios de carga docente y capacidad operativa en todas las horas.
            </p>
          </div>
        </header>
        <PersonnelPanelClient />
      </main>
    </div>
  );
}
