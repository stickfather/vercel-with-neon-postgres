"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { FullScreenModal } from "@/components/ui/full-screen-modal";
import type { StudentNote } from "@/features/administration/data/student-profile";

type AddNoteModalProps = {
  open: boolean;
  studentId: number;
  onClose: () => void;
  onCreated: (entry: StudentNote) => void;
};

export function AddNoteModal({ open, studentId, onClose, onCreated }: AddNoteModalProps) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resetState = () => {
    setDraft("");
    setError(null);
  };

  const handleClose = () => {
    if (isPending) return;
    resetState();
    onClose();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    if (!draft.trim()) {
      setError("La observación no puede estar vacía.");
      return;
    }

    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/notes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note: draft.trim() }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo crear la observación.");
          }
          onCreated(payload as StudentNote);
          router.refresh();
          resetState();
          onClose();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo crear la observación. Inténtalo nuevamente.",
          );
        }
      })();
    });
  };

  return (
    <FullScreenModal
      open={open}
      onClose={handleClose}
      title="Agregar observación"
      description="Registra comentarios o seguimiento relevante para el estudiante."
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-0.5 hover:border-brand-teal hover:bg-brand-teal-soft/70"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="add-note-form"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-0.5 hover:bg-[#04a890] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      }
    >
      <form id="add-note-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error ? (
          <p className="rounded-3xl border border-brand-orange bg-white/85 px-4 py-3 text-sm font-medium text-brand-ink">
            {error}
          </p>
        ) : null}
        <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
          Observación
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={5}
            className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
            placeholder="Escribe la observación o seguimiento"
            required
          />
        </label>
      </form>
    </FullScreenModal>
  );
}
