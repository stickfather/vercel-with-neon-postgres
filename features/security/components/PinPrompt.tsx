"use client";

import { useState } from "react";

import type { PinScope } from "@/lib/security/pin-session";
import { requirePin } from "@/features/security/components/local-pin-provider";

type PinPromptProps = {
  scope: PinScope;
  title: string;
  description: string;
  onSuccess?: () => void;
  className?: string;
  ctaLabel?: string;
};

export function PinPrompt({
  scope,
  title,
  description,
  onSuccess,
  className = "",
  ctaLabel = "Desbloquear",
}: PinPromptProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUnlock = async () => {
    setIsSubmitting(true);
    try {
      const ok = await requirePin(scope === "manager" ? "manager" : "staff");
      if (ok) {
        setError(null);
        onSuccess?.();
      } else {
        setError("PIN incorrecto");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`flex w-full max-w-sm flex-col gap-6 rounded-[28px] border border-white/70 bg-white/95 px-8 py-9 text-left shadow-[0_26px_60px_rgba(15,23,42,0.18)] backdrop-blur ${className}`.trim()}
    >
      <header className="flex flex-col gap-2 text-left">
        <span className="inline-flex w-fit items-center rounded-full bg-brand-teal-soft/70 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-brand-teal">
          Acceso restringido
        </span>
        <h1 className="text-xl font-black text-brand-deep">{title}</h1>
        <p className="text-sm text-brand-ink-muted">{description}</p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-brand-orange bg-white/85 px-4 py-2 text-sm font-semibold text-brand-ink">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleUnlock}
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] disabled:opacity-60"
      >
        {isSubmitting ? "Esperando PIN…" : ctaLabel}
      </button>
    </div>
  );
}
