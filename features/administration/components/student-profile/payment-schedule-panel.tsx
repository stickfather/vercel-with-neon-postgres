"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { StudentPaymentScheduleEntry } from "@/features/administration/data/student-profile";

type Props = {
  studentId: number;
  entries: StudentPaymentScheduleEntry[];
};

type Draft = {
  dueDate: string;
  amount: string;
  externalRef: string;
  note: string;
};

type EditDraft = Draft & {
  isPaid: boolean;
  receivedDate: string;
};

const INITIAL_DRAFT: Draft = {
  dueDate: "",
  amount: "",
  externalRef: "",
  note: "",
};

const INITIAL_EDIT_DRAFT: EditDraft = {
  dueDate: "",
  amount: "",
  isPaid: false,
  receivedDate: "",
  externalRef: "",
  note: "",
};

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PaymentSchedulePanel({ studentId, entries }: Props) {
  const [items, setItems] = useState<StudentPaymentScheduleEntry[]>(entries);
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<EditDraft>(INITIAL_EDIT_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(entries);
  }, [entries]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-EC", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }),
    [],
  );

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = a.dueDate ?? "";
      const bDate = b.dueDate ?? "";
      return aDate.localeCompare(bDate);
    });
  }, [items]);

  const resetDraft = () => {
    setDraft(INITIAL_DRAFT);
  };

  const validateNewPayment = (): { dueDate: string; amount: number } | null => {
    const dueDate = draft.dueDate.trim();
    if (!dueDate) {
      setError("Debes ingresar una fecha de vencimiento.");
      return null;
    }
    const amountNumber = parseAmount(draft.amount);
    if (amountNumber == null || amountNumber <= 0) {
      setError("El monto debe ser mayor a cero.");
      return null;
    }
    return { dueDate, amount: amountNumber };
  };

  const handleCreate = () => {
    const validated = validateNewPayment();
    if (!validated) {
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/payment-schedule`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dueDate: validated.dueDate,
              amount: validated.amount,
              externalRef: draft.externalRef.trim() || null,
              note: draft.note.trim() || null,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo crear el pago.");
          }
          setItems((previous) => [...previous, payload as StudentPaymentScheduleEntry]);
          setMessage("Pago agregado correctamente.");
          resetDraft();
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

  const handleUpdate = (entryId: number) => {
    setError(null);
    setMessage(null);

    const amountNumber = parseAmount(editingDraft.amount);
    if (amountNumber != null && amountNumber <= 0) {
      setError("El monto debe ser mayor a cero.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/payment-schedule/${entryId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dueDate: editingDraft.dueDate.trim() || null,
              amount: amountNumber,
              isPaid: editingDraft.isPaid,
              receivedDate: editingDraft.receivedDate.trim() || null,
              externalRef: editingDraft.externalRef.trim() || null,
              note: editingDraft.note.trim() || null,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo actualizar el pago.");
          }
          setItems((previous) =>
            previous.map((item) =>
              item.id === entryId
                ? {
                    ...item,
                    dueDate: editingDraft.dueDate.trim() || null,
                    amount: amountNumber,
                    isPaid: editingDraft.isPaid,
                    receivedDate: editingDraft.receivedDate.trim() || null,
                    externalRef: editingDraft.externalRef.trim() || null,
                    note: editingDraft.note.trim() || null,
                  }
                : item,
            ),
          );
          setMessage("Pago actualizado correctamente.");
          setEditingId(null);
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo actualizar el pago. Inténtalo nuevamente.",
          );
        }
      })();
    });
  };

  const handleDelete = (entryId: number) => {
    setError(null);
    setMessage(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/payment-schedule/${entryId}`, {
            method: "DELETE",
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo eliminar el pago.");
          }
          setItems((previous) => previous.filter((item) => item.id !== entryId));
          setMessage("Pago eliminado.");
          if (editingId === entryId) {
            setEditingId(null);
          }
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo eliminar el pago. Inténtalo nuevamente.",
          );
        }
      })();
    });
  };

  const startEditing = (item: StudentPaymentScheduleEntry) => {
    setEditingId(item.id);
    setEditingDraft({
      dueDate: item.dueDate ?? "",
      amount: item.amount == null ? "" : String(item.amount),
      isPaid: item.isPaid,
      receivedDate: item.receivedDate ?? "",
      externalRef: item.externalRef ?? "",
      note: item.note ?? "",
    });
  };

  return (
    <section className="flex flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <header className="flex flex-col gap-1 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-deep">Panel 2</span>
        <h2 className="text-2xl font-bold text-brand-deep">Cronograma de pagos</h2>
        <p className="text-sm text-brand-ink-muted">
          Registra y controla los pagos esperados. Marca como pagado cuando recibas el monto.
        </p>
      </header>
      {error && (
        <p className="rounded-3xl border border-brand-orange bg-white/85 px-4 py-3 text-sm font-medium text-brand-ink">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-3xl border border-brand-teal bg-brand-teal-soft/60 px-4 py-3 text-sm font-medium text-brand-teal">
          {message}
        </p>
      )}

      <div className="flex flex-col gap-4 rounded-[28px] border border-dashed border-brand-teal/40 bg-white/95 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-deep">Agregar pago</h3>
        <div className="grid gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))]">
          <input
            type="date"
            value={draft.dueDate}
            onChange={(event) => setDraft((previous) => ({ ...previous, dueDate: event.target.value }))}
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink focus:border-brand-teal focus:outline-none"
            placeholder="Fecha"
          />
          <input
            type="number"
            value={draft.amount}
            min="0"
            step="0.01"
            onChange={(event) => setDraft((previous) => ({ ...previous, amount: event.target.value }))}
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink focus:border-brand-teal focus:outline-none"
            placeholder="Monto"
          />
          <input
            type="text"
            value={draft.externalRef}
            onChange={(event) => setDraft((previous) => ({ ...previous, externalRef: event.target.value }))}
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink focus:border-brand-teal focus:outline-none"
            placeholder="Referencia externa"
          />
          <input
            type="text"
            value={draft.note}
            onChange={(event) => setDraft((previous) => ({ ...previous, note: event.target.value }))}
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink focus:border-brand-teal focus:outline-none"
            placeholder="Nota"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Guardando…" : "Agregar"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-inner">
        <table className="min-w-full table-auto divide-y divide-brand-ink-muted/20 text-left text-sm text-brand-ink">
          <thead className="bg-brand-deep-soft/40 text-xs uppercase tracking-wide text-brand-ink">
            <tr>
              <th className="px-4 py-3 font-semibold text-brand-deep">Fecha</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Monto</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Pagado</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Recibido</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Referencia</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Notas</th>
              <th className="px-4 py-3 text-right font-semibold text-brand-deep">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-ink-muted/15">
            {sortedItems.map((item) => {
              const isEditing = editingId === item.id;
              const amountDisplay =
                item.amount == null ? "—" : currencyFormatter.format(item.amount);

              return (
                <tr key={item.id} className="align-top hover:bg-brand-teal-soft/20">
                  <td className="px-4 py-3 align-top">
                    {isEditing ? (
                      <input
                        type="date"
                        value={editingDraft.dueDate}
                        onChange={(event) =>
                          setEditingDraft((prev) => ({ ...prev, dueDate: event.target.value }))
                        }
                        className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-3 py-1 text-sm leading-relaxed text-brand-ink focus:border-brand-teal focus:outline-none"
                      />
                    ) : (
                      <span className="font-semibold text-brand-deep">{formatDate(item.dueDate)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingDraft.amount}
                        onChange={(event) =>
                          setEditingDraft((prev) => ({ ...prev, amount: event.target.value }))
                        }
                        className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-3 py-1 text-sm leading-relaxed text-brand-ink focus:border-brand-teal focus:outline-none"
                      />
                    ) : (
                      <span>{amountDisplay}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {isEditing ? (
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingDraft.isPaid}
                          onChange={(event) =>
                            setEditingDraft((prev) => ({
                              ...prev,
                              isPaid: event.target.checked,
                              receivedDate:
                                event.target.checked && !prev.receivedDate
                                  ? new Date().toISOString().slice(0, 10)
                                  : prev.receivedDate,
                            }))
                          }
                          className="h-5 w-5 rounded border-brand-deep-soft text-brand-teal focus:ring-brand-teal"
                        />
                        <span className="font-semibold text-brand-deep">
                          {editingDraft.isPaid ? "Sí" : "No"}
                        </span>
                      </label>
                    ) : (
                      <span
                        className={`inline-flex min-w-[48px] items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          item.isPaid
                            ? "bg-brand-teal-soft text-brand-teal"
                            : "bg-brand-ink-muted/15 text-brand-ink"
                        }`}
                      >
                        {item.isPaid ? "Sí" : "No"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {isEditing ? (
                      <input
                        type="date"
                        value={editingDraft.receivedDate}
                        onChange={(event) =>
                          setEditingDraft((prev) => ({ ...prev, receivedDate: event.target.value }))
                        }
                        className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-3 py-1 text-sm leading-relaxed text-brand-ink focus:border-brand-teal focus:outline-none"
                      />
                    ) : (
                      <span>{formatDate(item.receivedDate)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingDraft.externalRef}
                        onChange={(event) =>
                          setEditingDraft((prev) => ({ ...prev, externalRef: event.target.value }))
                        }
                        className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-3 py-1 text-sm leading-relaxed text-brand-ink focus:border-brand-teal focus:outline-none"
                      />
                    ) : (
                      <span className="block whitespace-normal break-words leading-relaxed">
                        {item.externalRef ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {isEditing ? (
                      <textarea
                        value={editingDraft.note}
                        onChange={(event) =>
                          setEditingDraft((prev) => ({ ...prev, note: event.target.value }))
                        }
                        rows={2}
                        className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-3 py-2 text-sm leading-relaxed text-brand-ink focus:border-brand-teal focus:outline-none"
                      />
                    ) : (
                      <span className="block whitespace-normal break-words leading-relaxed">
                        {item.note ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdate(item.id)}
                            disabled={isPending}
                            className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isPending ? "Guardando…" : "Guardar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-deep-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#322d54]"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditing(item)}
                            className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            disabled={isPending}
                            className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-orange px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#ff6a00] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ff7a23] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!sortedItems.length && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-sm text-brand-ink-muted">
                  Aún no se han registrado pagos para este estudiante.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PaymentSchedulePanelSkeleton() {
  return (
    <section className="flex animate-pulse flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-col gap-2">
        <span className="h-3 w-32 rounded-full bg-brand-deep-soft/60" />
        <span className="h-6 w-40 rounded-full bg-brand-deep-soft/80" />
        <span className="h-3 w-72 max-w-full rounded-full bg-brand-deep-soft/50" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-[28px] border border-dashed border-brand-teal/30 bg-white/95 p-4">
            <span className="h-4 w-20 rounded-full bg-brand-teal-soft/60" />
            <span className="h-8 w-full rounded-2xl bg-brand-deep-soft/30" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <span key={index} className="h-10 w-full rounded-full bg-brand-deep-soft/30" />
        ))}
      </div>
    </section>
  );
}
