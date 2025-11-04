"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  initialRefreshedAt: string | null;
};

function formatLocalTime(isoString: string | null): string {
  if (!isoString) return "Nunca";

  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("es-EC", {
      timeZone: "America/Guayaquil",
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "Desconocido";
  }
}

export function StudentManagementHeader({ initialRefreshedAt }: Props) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(initialRefreshedAt);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/refresh-mvs", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Error al refrescar datos");
      }

      setRefreshedAt(data.refreshed_at ?? null);
      setToast({ message: "Datos actualizados", tone: "success" });

      // Refresh the page data using Next.js router
      router.refresh();
    } catch (error) {
      console.error("Error refreshing data:", error);
      setToast({
        message: error instanceof Error ? error.message : "Error al refrescar datos",
        tone: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const actionButtonBaseClass =
    "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2";

  return (
    <>
      {toast ? (
        <div
          className={`fixed top-4 right-4 z-50 rounded-2xl px-6 py-3 text-sm font-semibold shadow-lg ${
            toast.tone === "success"
              ? "bg-brand-teal text-white"
              : "bg-brand-orange text-white"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
      <header className="flex flex-col gap-3 rounded-[28px] border border-white/70 bg-white/92 px-6 py-6 text-left shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-deep-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-deep">
          Gestión académica
        </span>
        <div className="flex flex-col gap-2 text-brand-deep">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-black sm:text-4xl">Gestión de estudiantes</h1>
              <p className="max-w-3xl text-sm text-brand-ink-muted sm:text-base">
                Visualiza el estado general de cada estudiante y utiliza los gráficos interactivos para filtrar por prioridades.
              </p>
            </div>
            {refreshedAt ? (
              <div className="text-xs text-brand-ink-muted whitespace-nowrap">
                Última actualización: {formatLocalTime(refreshedAt)}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/administracion"
            className={`${actionButtonBaseClass} border border-transparent bg-white text-brand-deep shadow hover:border-brand-teal hover:bg-brand-teal-soft/60 focus-visible:outline-[#00bfa6]`}
          >
            ← Volver al panel
          </Link>
          <Link
            href="/registro"
            className={`${actionButtonBaseClass} border border-brand-ink-muted/20 bg-white text-brand-deep shadow focus-visible:outline-[#00bfa6]`}
          >
            Abrir check-in de estudiantes
          </Link>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`${actionButtonBaseClass} border border-transparent bg-brand-teal text-white shadow hover:bg-[#04a890] focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-70`}
            title="Refrescar todos los datos"
          >
            {isRefreshing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Actualizando...
              </>
            ) : (
              "Refrescar todos los datos"
            )}
          </button>
        </div>
      </header>
    </>
  );
}
