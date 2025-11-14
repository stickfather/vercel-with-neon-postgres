"use client";

export default function EngagementError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-white to-[#f0fdf4]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Informes de gestión</span>
          <h1 className="text-3xl font-black text-slate-900 sm:text-[40px]">Reporte de compromiso</h1>
        </header>

        <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-rose-200/70 bg-rose-50 p-12 text-center">
          <div className="text-6xl">⚠️</div>
          <div>
            <h2 className="text-2xl font-bold text-rose-900">Error al cargar el reporte</h2>
            <p className="mt-2 text-sm text-rose-700">
              {error.message || "Ocurrió un error inesperado al cargar los datos del panel de engagement."}
            </p>
          </div>
          <button
            onClick={reset}
            className="rounded-lg bg-rose-600 px-6 py-3 font-semibold text-white transition hover:bg-rose-700"
          >
            Reintentar
          </button>
        </div>
      </main>
    </div>
  );
}
