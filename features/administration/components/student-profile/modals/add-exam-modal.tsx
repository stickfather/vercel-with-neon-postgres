"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { FullScreenModal } from "@/components/ui/full-screen-modal";
import type { StudentExam } from "@/features/administration/data/student-profile";

const INITIAL_STATE = {
  scheduledAt: "",
  examType: "",
  level: "",
  grade: "",
  note: "",
};

type AddExamModalProps = {
  open: boolean;
  studentId: number;
  onClose: () => void;
  onCreated: (entry: StudentExam) => void;
};

function parseScore(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function AddExamModal({ open, studentId, onClose, onCreated }: AddExamModalProps) {
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

    if (!form.scheduledAt.trim()) {
      setError("Debes indicar la fecha y hora programada.");
      return;
    }

    if (!form.examType.trim()) {
      setError("Selecciona el tipo de examen.");
      return;
    }

    if (!form.level.trim()) {
      setError("Selecciona el nivel.");
      return;
    }

    const scoreNumber = parseScore(form.grade);
    if (form.grade.trim() && scoreNumber == null) {
      setError("La calificación debe ser numérica.");
      return;
    }

    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/exams`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              timeScheduled: form.scheduledAt.trim(),
              status: "Programado",  // Default status for new exams
              level: form.level.trim(),
              score: scoreNumber,
              passed: false,
              notes: [form.examType.trim() || null, form.note.trim() || null].filter(Boolean).join(" - ") || null,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo crear el examen.");
          }
          onCreated(payload as StudentExam);
          router.refresh();
          resetState();
          onClose();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo crear el examen. Inténtalo nuevamente.",
          );
        }
      })();
    });
  };

  return (
    <FullScreenModal
      open={open}
      onClose={handleClose}
      title="Agregar examen"
      description="Programa un nuevo examen indicando fecha, hora y tipo de evaluación."
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
            form="add-exam-form"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-0.5 hover:bg-[#04a890] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      }
    >
      <form id="add-exam-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error ? (
          <p className="rounded-3xl border border-brand-orange bg-white/85 px-4 py-3 text-sm font-medium text-brand-ink">
            {error}
          </p>
        ) : null}
        <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
          Fecha y hora del examen
          <input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, scheduledAt: event.target.value }))
            }
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
          Tipo de examen
          <select
            value={form.examType}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, examType: event.target.value }))
            }
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
            required
          >
            <option value="">Selecciona tipo</option>
            <option value="Speaking">Speaking</option>
            <option value="Writing">Writing</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
          Nivel
          <select
            value={form.level}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, level: event.target.value }))
            }
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
            required
          >
            <option value="">Selecciona nivel</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
          Calificación (opcional)
          <input
            type="number"
            step="0.01"
            value={form.grade}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, grade: event.target.value }))
            }
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
          Nota (opcional)
          <textarea
            value={form.note}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, note: event.target.value }))
            }
            rows={3}
            className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
            placeholder="Añade detalles o requisitos"
          />
        </label>
      </form>
    </FullScreenModal>
  );
}
