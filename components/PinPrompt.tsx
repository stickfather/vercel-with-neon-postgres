"use client";

import { useState } from "react";

type PinRole = "manager" | "staff";

type PinPromptProps = {
  role: PinRole;
  title: string;
  onSuccess: () => void;
  description?: string;
  submitLabel?: string;
};

export default function PinPrompt({
  role,
  title,
  onSuccess,
  description,
  submitLabel = "Confirmar",
}: PinPromptProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!/^\d{4}$/.test(pin)) {
      setError("El PIN debe tener exactamente 4 dígitos.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/security/validate-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, pin }),
      });

      const payload = (await response.json().catch(() => ({}))) as
        | { valid?: boolean }
        | undefined;

      if (response.ok && payload?.valid) {
        setPin("");
        onSuccess();
      } else {
        setError("PIN incorrecto.");
        setPin("");
      }
    } catch (err) {
      console.error("No pudimos validar el PIN", err);
      setError("No pudimos validar el PIN solicitado.");
      setPin("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description ? (
          <p className="text-sm text-slate-600">{description}</p>
        ) : null}
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/[^\d]/g, "").slice(0, 4));
            setError(null);
          }}
          className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-center text-2xl tracking-[0.4em]"
          placeholder="••••"
          autoFocus
        />
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <button
          type="submit"
          className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow transition hover:bg-orange-600 disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Verificando…" : submitLabel}
        </button>
      </form>
    </div>
  );
}
