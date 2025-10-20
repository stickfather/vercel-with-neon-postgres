import Link from "next/link";

import ResumenGeneralPanel from "@/components/reports/resumen/ResumenGeneralPanel";

export const revalidate = 300;

export default function ResumenGeneralPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3f9ff] via-white to-[#ebfdf5]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
              Informes de gestión
            </span>
            <h1 className="text-3xl font-black text-slate-900 sm:text-[40px]">Resumen general</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Visualiza los indicadores clave de salud escolar, actividad reciente y avance por nivel.
            </p>
          </div>
          <Link
            href="/management/engagement"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900/90"
          >
            Abrir panel de gestión
          </Link>
        </header>
        <ResumenGeneralPanel />
      </main>
    </div>
  );
}
