import { FinancePanelClient } from "@/components/reports/finance/FinancePanelClient";
import Link from "next/link";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export default function FinancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3f9ff] via-white to-[#ebfdf5]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
              Informes de gestión
            </span>
            <h1 className="text-3xl font-black text-slate-900 sm:text-[40px]">
              Reporte de Finanzas
            </h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Análisis financiero integral que incluye deudas pendientes, colecciones y seguimiento de pagos.
            </p>
          </div>
          <Link
            href="/admin/reportes"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            ← Volver
          </Link>
        </header>
        <FinancePanelClient />
      </main>
    </div>
  );
}
