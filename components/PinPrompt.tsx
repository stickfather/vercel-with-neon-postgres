"use client";

import { useState } from "react";

import { requirePin } from "@/features/security/components/local-pin-provider";

type PinRole = "manager" | "staff";

type PinPromptProps = {
  role: PinRole;
  title: string;
  onSuccess: () => void;
  description?: string;
  submitLabel?: string;
  onCancel?: () => void;
};

export default function PinPrompt({
  role,
  title,
  onSuccess,
  description,
  submitLabel = "Confirmar",
  onCancel,
}: PinPromptProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUnlock = async () => {
    setIsSubmitting(true);
    try {
      const ok = await requirePin(role);
      if (ok) {
        setError(null);
        onSuccess();
      } else {
        setError("PIN incorrecto");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="relative flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-white p-6 text-center shadow-xl">
        {onCancel ? (
          <button
            type="button"
            onClick={() => {
              if (isSubmitting) {
                return;
              }
              setError(null);
              onCancel();
            }}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-semibold text-slate-500 transition hover:-translate-y-[1px] hover:bg-slate-100"
            aria-label="Cerrar validación"
            disabled={isSubmitting}
          >
            ×
          </button>
        ) : null}
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
        <button
          type="button"
          onClick={handleUnlock}
          className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow transition hover:bg-orange-600 disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Esperando PIN…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
