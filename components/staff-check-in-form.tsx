"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StaffDirectoryEntry } from "@/app/db";

type StatusState = { type: "error" | "success"; message: string } | null;

type Props = {
  staffMembers: StaffDirectoryEntry[];
  disabled?: boolean;
  initialError?: string | null;
};

export function StaffCheckInForm({
  staffMembers,
  disabled = false,
  initialError = null,
}: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusState>(
    initialError ? { type: "error", message: initialError } : null,
  );
  const [isPending, startTransition] = useTransition();
  const [showHelp, setShowHelp] = useState(false);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredStaff = useMemo(() => {
    if (!normalizedSearch) {
      return staffMembers.slice(0, 8);
    }

    return staffMembers
      .filter((member) =>
        member.fullName.trim().toLowerCase().includes(normalizedSearch),
      )
      .slice(0, 8);
  }, [staffMembers, normalizedSearch]);

  const isFormDisabled = disabled || Boolean(initialError);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isFormDisabled) {
      return;
    }

    if (!selectedStaffId) {
      setStatus({
        type: "error",
        message: "Selecciona a un miembro del personal antes de continuar.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus(null);

      const response = await fetch("/api/staff/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ staffId: selectedStaffId }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo registrar tu asistencia.");
      }

      setStatus({
        type: "success",
        message: "¡Registro de personal confirmado!",
      });

      await new Promise((resolve) => setTimeout(resolve, 600));

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No logramos registrar la asistencia. Inténtalo de nuevo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="registro-card relative flex flex-col gap-8 rounded-[48px] border-2 border-[#ffcaa1] bg-white px-10 py-12 shadow-[0_28px_64px_rgba(15,23,42,0.14)]"
      onSubmit={handleSubmit}
    >
      <div className="pointer-events-none absolute -top-8 left-12 hidden h-16 w-16 rotate-6 rounded-[26px] bg-[#ffe8d2]/70 blur-2xl md:block" />
      <div className="pointer-events-none absolute -bottom-10 right-20 hidden h-24 w-24 -rotate-6 rounded-[30px] bg-[#5fd5c8]/45 blur-2xl lg:block" />
      <header className="flex flex-col gap-1 text-left">
        <h1 className="text-3xl font-black text-brand-deep">Registro del personal</h1>
        <p className="max-w-lg text-xs text-brand-ink-muted md:text-sm">
          Busca tu nombre y marca que ya estás listo para recibir a los estudiantes.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold uppercase tracking-wide text-brand-deep">
          Nombre del personal
        </label>
        <div className="relative">
          <input
            id="staff-name"
            name="staff-name"
            autoComplete="off"
            placeholder="Busca tu nombre"
            value={searchTerm}
            onChange={(event) => {
              const value = event.target.value;
              setSearchTerm(value);

              const normalizedValue = value.trim().toLowerCase();
              const exactMatch = normalizedValue
                ? staffMembers.find(
                    (member) =>
                      member.fullName.trim().toLowerCase() === normalizedValue,
                  )
                : null;

              setSelectedStaffId(exactMatch ? exactMatch.id : null);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 120);
            }}
            className="w-full rounded-3xl border-2 border-[#ffe2c8] bg-[#fffaf5] px-6 py-4 text-base text-brand-ink shadow-inner focus:border-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isFormDisabled}
          />
          {showSuggestions && filteredStaff.length > 0 && (
            <ul className="absolute z-10 mt-2 max-h-56 w-full overflow-y-auto rounded-3xl border border-white/60 bg-white/95 p-2 text-sm shadow-2xl">
              {filteredStaff.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setSearchTerm(member.fullName);
                      setSelectedStaffId(member.id);
                      setShowSuggestions(false);
                    }}
                    className={`flex w-full items-center justify-between gap-4 rounded-2xl px-3 py-2 text-left transition hover:bg-[#fff0e0] ${
                      member.id === selectedStaffId
                        ? "bg-[#ffe3c9] text-brand-deep"
                        : "text-brand-ink"
                    }`}
                  >
                    <span className="font-medium">{member.fullName}</span>
                    {member.role && (
                      <span className="text-xs uppercase tracking-wide text-brand-ink-muted">
                        {member.role}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {status && (
        <div
          className={`rounded-3xl border px-5 py-3 text-sm font-medium ${
            status.type === "success"
              ? "border-brand-teal bg-[#e1f7f3] text-brand-deep"
              : "border-brand-orange bg-white/75 text-brand-ink"
          }`}
        >
          {status.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || isPending || isFormDisabled}
        className="cta-ripple inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-10 py-5 text-lg font-semibold uppercase tracking-wide text-white shadow-[0_22px_40px_rgba(255,122,35,0.32)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting || isPending ? "Registrando…" : "Confirmar ingreso"}
      </button>

      <button
        type="button"
        onClick={() => setShowHelp((previous) => !previous)}
        className="text-sm font-semibold text-brand-ink-muted underline-offset-4 hover:text-brand-teal hover:underline"
      >
        {showHelp ? "Ocultar pasos" : "¿Necesitas ayuda?"}
      </button>

      {showHelp && (
        <div className="rounded-[32px] bg-white/80 px-6 py-4 text-sm text-brand-ink-muted shadow-inner">
          <h2 className="mb-2 text-base font-semibold uppercase tracking-wide text-brand-deep">
            Pasos rápidos
          </h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            <li>Busca tu nombre y selecciónalo.</li>
            <li>Revisa que no tengas una asistencia abierta.</li>
            <li>Presiona "Confirmar ingreso" para registrar tu llegada.</li>
            <li>Recuerda regresar para marcar tu salida al finalizar.</li>
          </ol>
        </div>
      )}

      <button type="submit" hidden aria-hidden />
    </form>
  );
}
