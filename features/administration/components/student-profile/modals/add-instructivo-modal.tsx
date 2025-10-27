"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { FullScreenModal } from "@/components/ui/full-screen-modal";
import type { StudentInstructivo } from "@/features/administration/data/student-profile";

const INITIAL_STATE = {
  title: "",
  dueDate: "",
  completed: false,
  note: "",
};

type AddInstructivoModalProps = {
  open: boolean;
  studentId: number;
  onClose: () => void;
  onCreated: (entry: StudentInstructivo) => void;
};

export function AddInstructivoModal({
  open,
  studentId,
  onClose,
  onCreated,
}: AddInstructivoModalProps) {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resetState = () => {
    setForm(INITIAL_STATE);
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

    if (!form.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    if (!form.note.trim()) {
      setError("Debes ingresar la descripción o nota del instructivo.");
      return;
    }

    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/instructivos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: form.title.trim(),
              dueDate: form.dueDate.trim() || null,
              completed: form.completed,
              note: form.note.trim() || null,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo crear el instructivo.");
          }
          onCreated(payload as StudentInstructivo);
          router.refresh();
          resetState();
          onClose();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo crear el instructivo. Inténtalo nuevamente.",
          );
        }
      })();
    });
  };

  return (
    <FullScreenModal
      open={open}
      onClose={handleClose}
      title="Agregar instructivo"
      description="Asigna una nueva guía o tarea para el estudiante."
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
            form="add-instructivo-form"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-0.5 hover:bg-[#04a890] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      }
    >
      <form id="add-instructivo-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error ? (
          <p className="rounded-3xl border border-brand-orange bg-white/85 px-4 py-3 text-sm font-medium text-brand-ink">
            {error}
          </p>
        ) : null}
        <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
          Título
          <input
            type="text"
            value={form.title}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, title: event.target.value }))
            }
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
            placeholder="Ej. Guía de estudio Unidad 5"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
          Fecha objetivo (opcional)
          <input
            type="date"
            value={form.dueDate}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, dueDate: event.target.value }))
            }
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-inner">
          <span className="text-sm font-semibold text-brand-deep">Marcado como completado</span>
          <input
            type="checkbox"
            checked={form.completed}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, completed: event.target.checked }))
            }
            className="h-5 w-5 rounded border-brand-deep-soft text-brand-teal focus:ring-brand-teal"
          />
        </label>
        <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
          Nota
          <textarea
            value={form.note}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, note: event.target.value }))
            }
            rows={4}
            className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
            placeholder="Describe la tarea o los materiales a completar"
            required
          />
        </label>
      </form>
    </FullScreenModal>
  );
}
