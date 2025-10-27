"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { FullScreenModal } from "@/components/ui/full-screen-modal";
import type { StudentPaymentScheduleEntry } from "@/features/administration/data/student-profile";

const INITIAL_STATE = {
  dueDate: "",
  amount: "",
  note: "",
};

type AddPaymentModalProps = {
  open: boolean;
  studentId: number;
  onClose: () => void;
  onCreated: (entry: StudentPaymentScheduleEntry) => void;
};

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function AddPaymentModal({ open, studentId, onClose, onCreated }: AddPaymentModalProps) {
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

    const dueDate = form.dueDate.trim();
    if (!dueDate) {
      setError("Debes ingresar una fecha de vencimiento.");
      return;
    }

    const amountNumber = parseAmount(form.amount);
    if (amountNumber == null || amountNumber <= 0) {
      setError("El monto debe ser un número mayor a cero.");
      return;
    }

    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/payment-schedule`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dueDate,
              amount: amountNumber,
              note: form.note.trim() || null,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo crear el pago.");
          }
          onCreated(payload as StudentPaymentScheduleEntry);
          router.refresh();
          resetState();
          onClose();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo crear el pago. Inténtalo nuevamente.",
          );
        }
      })();
    });
  };

  return (
    <FullScreenModal
      open={open}
      onClose={handleClose}
      title="Agregar pago"
      description="Define la fecha límite y el monto que debe cancelar el representante."
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
            form="add-payment-form"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-0.5 hover:bg-[#04a890] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      }
    >
      <form id="add-payment-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error ? (
          <p className="rounded-3xl border border-brand-orange bg-white/85 px-4 py-3 text-sm font-medium text-brand-ink">
            {error}
          </p>
        ) : null}
        <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
          Fecha límite
          <input
            type="date"
            value={form.dueDate}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, dueDate: event.target.value }))
            }
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
          Monto
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, amount: event.target.value }))
            }
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
            required
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
            placeholder="Añade un recordatorio o detalle"
          />
        </label>
      </form>
    </FullScreenModal>
  );
}
