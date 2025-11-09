"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3f9ff] via-white to-[#ebfdf5]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
            Informes de gestión
          </span>
          <h1 className="text-3xl font-black text-slate-900 sm:text-[40px]">
            Exámenes
          </h1>
        </header>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <h2 className="mb-2 text-lg font-semibold text-rose-900">
            Error al cargar los datos
          </h2>
          <p className="mb-4 text-sm text-rose-700">
            No pudimos cargar los indicadores de exámenes. Intenta nuevamente.
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
          >
            Reintentar
          </button>
        </div>
      </main>
    </div>
  );
}
