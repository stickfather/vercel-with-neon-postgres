"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { PinScope } from "@/lib/security/pin-session";

type KeypadButton =
  | { label: string; value: string }
  | { label: string; action: "backspace" | "clear" };

type PinPromptProps = {
  scope: PinScope;
  title: string;
  description: string;
  onSuccess?: () => void;
  className?: string;
  ctaLabel?: string;
};

const MAX_PIN_LENGTH = 4;

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
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    hiddenInputRef.current?.focus();
  }, []);

  const keypadButtons = useMemo<KeypadButton[]>(
    () => [
      { label: "1", value: "1" },
      { label: "2", value: "2" },
      { label: "3", value: "3" },
      { label: "4", value: "4" },
      { label: "5", value: "5" },
      { label: "6", value: "6" },
      { label: "7", value: "7" },
      { label: "8", value: "8" },
      { label: "9", value: "9" },
      { label: "⌫", action: "backspace" },
      { label: "0", value: "0" },
      { label: "Limpiar", action: "clear" },
    ],
    [],
  );

  const handlePinChange = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, "").slice(0, MAX_PIN_LENGTH);
    setPin(numericValue);
    setError(null);
  };

  const handleDigitPress = (digit: string) => {
    setPin((previous) => {
      if (previous.length >= MAX_PIN_LENGTH) {
        return previous;
      }
      const nextValue = `${previous}${digit}`;
      setError(null);
      return nextValue;
    });
  };

  const handleBackspace = () => {
    setPin((previous) => previous.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin("");
    setError(null);
    hiddenInputRef.current?.focus();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPin = pin.trim();
    if (!/^\d{4}$/.test(trimmedPin)) {
      setError("El PIN debe tener exactamente 4 dígitos.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/security/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: scope === "staff" ? "staff" : "manager", pin: trimmedPin }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.valid !== true) {
        throw new Error(payload?.error ?? "PIN incorrecto.");
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
      className={`flex w-full max-w-sm flex-col gap-6 rounded-[28px] border border-white/70 bg-white/95 px-8 py-9 text-left shadow-[0_26px_60px_rgba(15,23,42,0.18)] backdrop-blur ${className}`.trim()}
    >
      <header className="flex flex-col gap-2 text-left">
        <span className="inline-flex w-fit items-center rounded-full bg-brand-teal-soft/70 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-brand-teal">
          Acceso restringido
        </span>
        <h1 className="text-xl font-black text-brand-deep">{title}</h1>
        <p className="text-sm text-brand-ink-muted">{description}</p>
      </header>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <input
          ref={hiddenInputRef}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={pin}
          onChange={(event) => handlePinChange(event.target.value)}
          className="sr-only"
          maxLength={MAX_PIN_LENGTH}
          minLength={4}
        />

        <div className="flex flex-col gap-4">
          <div
            className="grid cursor-text grid-cols-4 justify-items-center gap-2"
            onClick={() => hiddenInputRef.current?.focus()}
          >
            {Array.from({ length: MAX_PIN_LENGTH }).map((_, index) => {
              const isFilled = index < pin.length;
              return (
                <div
                  key={`pin-slot-${index}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                    isFilled
                      ? "border-brand-teal bg-brand-teal-soft/80 text-brand-deep"
                      : "border-brand-ink-muted/30 text-brand-ink-muted"
                  }`}
                >
                  <span className="text-lg font-semibold">{isFilled ? "•" : ""}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {keypadButtons.map((button) => {
              if ("action" in button && button.action === "backspace") {
                return (
                  <button
                    key="pin-backspace"
                    type="button"
                    onClick={handleBackspace}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white text-base font-semibold text-brand-deep shadow-sm transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal disabled:opacity-60"
                    disabled={isSubmitting || pin.length === 0}
                    aria-label="Borrar último dígito"
                  >
                    ⌫
                  </button>
                );
              }

              if ("action" in button && button.action === "clear") {
                return (
                  <button
                    key="pin-clear"
                    type="button"
                    onClick={handleClear}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white text-xs font-semibold uppercase tracking-wide text-brand-deep shadow-sm transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal disabled:opacity-60"
                    disabled={isSubmitting || pin.length === 0}
                  >
                    Limpiar
                  </button>
                );
              }

              if ("value" in button) {
                return (
                  <button
                    key={`pin-digit-${button.value}`}
                    type="button"
                    onClick={() => handleDigitPress(button.value)}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white text-lg font-semibold text-brand-deep shadow-sm transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
                    disabled={isSubmitting}
                  >
                    {button.label}
                  </button>
                );
              }

              return null;
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-brand-orange bg-white/85 px-4 py-3 text-sm font-medium text-brand-ink">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || pin.trim().length < 4}
          className="cta-ripple inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Verificando…" : ctaLabel}
        </button>
      </form>
    </div>
  );
}
