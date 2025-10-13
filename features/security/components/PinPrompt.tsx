"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { PinScope } from "@/lib/security/pin-session";

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
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pin.trim()) {
      setError("Ingresa el PIN para continuar.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/security/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: scope === "staff" ? "staff" : "manager", pin }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.valid !== true) {
        throw new Error(payload?.error ?? "El PIN no es correcto.");
      }

      setPin("");
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "No pudimos validar el PIN. Intenta nuevamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`flex w-full max-w-lg flex-col gap-6 rounded-[36px] border border-white/70 bg-white/95 px-10 py-12 text-left shadow-[0_30px_70px_rgba(15,23,42,0.18)] backdrop-blur ${className}`.trim()}
    >
      <header className="flex flex-col gap-3 text-left">
        <span className="inline-flex w-fit items-center rounded-full bg-brand-teal-soft px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-brand-teal">
          Acceso restringido
        </span>
        <h1 className="text-2xl font-black text-brand-deep">{title}</h1>
        <p className="text-sm text-brand-ink-muted">{description}</p>
      </header>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
          Código PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/[^\d]/g, ""));
              setError(null);
            }}
            className="rounded-3xl border-2 border-brand-teal-soft bg-white px-6 py-4 text-base text-brand-ink shadow-inner focus:border-brand-teal"
            maxLength={8}
            minLength={4}
            required
          />
        </label>

        {error && (
          <div className="rounded-2xl border border-brand-orange bg-white/85 px-4 py-3 text-sm font-medium text-brand-ink">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !pin.trim()}
          className="cta-ripple inline-flex items-center justify-center rounded-full bg-brand-orange px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Verificando…" : ctaLabel}
        </button>
      </form>
    </div>
  );
}
