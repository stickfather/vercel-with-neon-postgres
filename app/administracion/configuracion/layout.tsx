"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { requirePin } from "@/features/security/components/local-pin-provider";

type LayoutProps = {
  children: ReactNode;
};

export default function ConfiguracionLayout({ children }: LayoutProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const requestAccess = useCallback(async () => {
    setRequesting(true);
    try {
      const ok = await requirePin("manager");
      if (ok) {
        setUnlocked(true);
        setError(null);
      } else {
        setError("PIN incorrecto");
      }
    } finally {
      setRequesting(false);
    }
  }, []);

  useEffect(() => {
    if (!unlocked) {
      void requestAccess();
    }
  }, [requestAccess, unlocked]);

  return (
    <div className="relative min-h-screen">
      {!unlocked ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.7)] px-4">
          <div className="w-full max-w-sm rounded-3xl border border-white/80 bg-white/95 p-6 text-center text-brand-deep shadow-[0_32px_70px_rgba(15,23,42,0.22)]">
            <span className="inline-flex items-center justify-center rounded-full bg-brand-orange/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-brand-orange">
              Gerencia
            </span>
            <h2 className="mt-3 text-xl font-semibold">Área de configuración protegida</h2>
            <p className="mt-2 text-sm text-brand-ink-muted">
              Necesitas el PIN de gerencia para administrar horarios, accesos y preferencias sensibles.
            </p>
            {error ? (
              <p className="mt-3 text-sm font-semibold text-brand-orange">{error}</p>
            ) : null}
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={requestAccess}
                disabled={requesting}
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-deep px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#1b1a3b] disabled:opacity-70"
              >
                {requesting ? "Esperando PIN…" : "Desbloquear"}
              </button>
              <p className="text-xs text-brand-ink-muted">
                Si olvidaste el PIN, solicita ayuda a dirección.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {unlocked ? children : null}
    </div>
  );
}
