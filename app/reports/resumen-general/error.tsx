"use client";

import { useEffect } from "react";

export default function ResumenGeneralError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Error al cargar el resumen general", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#f3f9ff] via-white to-[#ebfdf5] px-6 text-center">
      <div className="max-w-md rounded-3xl border border-rose-200/60 bg-white/95 p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-rose-600">Error al cargar el resumen</h1>
        <p className="mt-2 text-sm text-slate-600">
          No pudimos obtener los datos del resumen general. Intenta recargar la página o vuelve más tarde.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-slate-900/90"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
