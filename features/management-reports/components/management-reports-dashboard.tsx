"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { PinPrompt } from "@/features/security/components/PinPrompt";
import { EphemeralToast } from "@/components/ui/ephemeral-toast";

const reports = [
  {
    href: "/reports/aprendizaje",
    title: "Reporte de Aprendizaje",
    description: "Progreso, velocidad y niveles.",
    requiresPin: false,
  },
  {
    href: "/reports/engagement",
    title: "Reporte de Compromiso",
    description: "Actividad, retención y minutos.",
    requiresPin: false,
  },
  {
    href: "/reports/examenes",
    title: "Reporte de Exámenes",
    description: "Resultados, citas y logística.",
    requiresPin: false,
  },
  {
    href: "/reports/finanzas",
    title: "Reporte de Finanzas",
    description: "Ingresos, pagos y cartera.",
    requiresPin: true,
  },
  {
    href: "/reports/personal",
    title: "Reporte de Cobertura y Carga de Personal",
    description: "Asistencia, cargas y nómina.",
    requiresPin: false,
  },
];

export function ManagementReportsDashboard() {
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const handleReportClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, report: typeof reports[0]) => {
    if (report.requiresPin) {
      e.preventDefault();
      setTargetHref(report.href);
      setShowPinPrompt(true);
    }
  }, []);

  const handlePinSuccess = useCallback(() => {
    setShowPinPrompt(false);
    if (targetHref) {
      window.location.href = targetHref;
    }
  }, [targetHref]);

  const handlePinClose = useCallback(() => {
    setShowPinPrompt(false);
    setTargetHref(null);
  }, []);

  const handleRefreshNow = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Set a longer timeout for the refresh operation (5 minutes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

      const response = await fetch("/api/refresh-mvs", {
        method: "POST",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to refresh data");
      }

      const result = await response.json();
      
      setToastMessage({
        message: "✅ Datos gerenciales actualizados exitosamente.",
        tone: "success",
      });
    } catch (error) {
      console.error("Error refreshing MVs:", error);
      
      let errorMessage = "❌ Error al actualizar — por favor intenta de nuevo más tarde.";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "❌ La actualización está tomando más tiempo del esperado. Por favor espera unos minutos.";
        } else if (error.message) {
          console.error("Detailed error:", error.message);
        }
      }
      
      setToastMessage({
        message: errorMessage,
        tone: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3f9ff] via-white to-[#ebfdf5]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
              Informes de gestión
            </span>
            <h1 className="text-3xl font-black text-slate-900 sm:text-[40px]">
              Reportes gerenciales
            </h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Reportes clave para análisis del centro: aprendizaje, engagement, exámenes, finanzas y personal.
            </p>
          </div>
          <Link
            href="/administracion"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            ← Volver al panel
          </Link>
        </header>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-blue-900">
                Los datos gerenciales se actualizan automáticamente todos los días a las 8:10 PM.
              </p>
              <p className="text-sm text-blue-700">
                Haz clic en "Actualizar Ahora" para actualizar todos los datos gerenciales inmediatamente.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefreshNow}
              disabled={isRefreshing}
              className="inline-flex w-fit items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRefreshing ? "Actualizando..." : "Actualizar Ahora"}
            </button>
          </div>
        </div>

        <section className="flex flex-col gap-4">
          {reports.map((report) => (
            <Link
              key={report.href}
              href={report.href}
              onClick={(e) => handleReportClick(e, report)}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-slate-900 group-hover:text-slate-700">
                  {report.title}
                  {report.requiresPin && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      🔒 PIN requerido
                    </span>
                  )}
                </h2>
                <p className="text-sm text-slate-600">{report.description}</p>
              </div>
              <span className="text-slate-400 transition-transform group-hover:translate-x-1" aria-hidden>
                →
              </span>
            </Link>
          ))}
        </section>
      </main>

      {showPinPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8">
          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            <PinPrompt
              scope="manager"
              title="PIN gerencial requerido"
              description="Solo dirección tiene acceso a finanzas. Ingresa el PIN para continuar."
              ctaLabel="Validar PIN"
              onSuccess={handlePinSuccess}
              className="bg-white"
            />
            <button
              type="button"
              onClick={handlePinClose}
              className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {toastMessage && (
        <EphemeralToast
          message={toastMessage.message}
          tone={toastMessage.tone}
          duration={3000}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
