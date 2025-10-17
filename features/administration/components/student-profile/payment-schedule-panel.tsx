"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { StudentPaymentScheduleEntry } from "@/features/administration/data/student-profile";

type Props = {
  studentId: number;
  entries: StudentPaymentScheduleEntry[];
};

type AddFormState = {
  dueDate: string;
  amount: string;
  note: string;
};

type EditFormState = {
  isPaid: boolean;
  receivedDate: string;
  note: string;
};

type ActiveRequest = "create" | "edit" | "delete" | null;

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

const INITIAL_ADD_FORM: AddFormState = {
  dueDate: "",
  amount: "",
  note: "",
};

const INITIAL_EDIT_FORM: EditFormState = {
  isPaid: false,
  receivedDate: "",
  note: "",
};

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Modal({ title, description, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(15,23,42,0.35)] px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col">
        <div className="relative flex max-h-[90vh] flex-1 flex-col overflow-hidden rounded-[32px] border border-white/80 bg-white/95 text-brand-ink shadow-[0_24px_58px_rgba(15,23,42,0.18)]">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-deep-soft text-lg font-bold text-brand-deep transition hover:bg-brand-deep-soft/80"
            aria-label="Cerrar ventana"
          >
            ×
          </button>
          <div className="flex flex-col gap-2 px-6 pt-6 pr-12">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-ink-muted">
              Acción requerida
            </span>
            <h3 className="text-xl font-semibold text-brand-deep">{title}</h3>
            {description ? (
              <p className="text-sm text-brand-ink-muted">{description}</p>
            ) : null}
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6 pr-12">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function PaymentSchedulePanel({ studentId, entries }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<StudentPaymentScheduleEntry[]>(entries);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeRequest, setActiveRequest] = useState<ActiveRequest>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>(INITIAL_ADD_FORM);
  const [editingItem, setEditingItem] = useState<StudentPaymentScheduleEntry | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(INITIAL_EDIT_FORM);

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
      const aKey = a.dueDate ?? "";
      const bKey = b.dueDate ?? "";
      return aKey.localeCompare(bKey);
    });
  }, [items]);

  const closeAddModal = () => {
    if (isPending && activeRequest === "create") return;
    setIsAddOpen(false);
    setAddForm(INITIAL_ADD_FORM);
  };

  const closeEditModal = () => {
    if (isPending && activeRequest === "edit") return;
    setEditingItem(null);
    setEditForm(INITIAL_EDIT_FORM);
  };

  const openAddModal = () => {
    setError(null);
    setMessage(null);
    setAddForm(INITIAL_ADD_FORM);
    setIsAddOpen(true);
  };

  const openEditModal = (entry: StudentPaymentScheduleEntry) => {
    setError(null);
    setMessage(null);
    setEditingItem(entry);
    setEditForm({
      isPaid: entry.isPaid,
      receivedDate: entry.receivedDate ?? "",
      note: entry.note ?? "",
    });
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeRequest) return;

    const dueDate = addForm.dueDate.trim();
    if (!dueDate) {
      setError("Debes ingresar una fecha de vencimiento.");
      return;
    }

    const amountNumber = parseAmount(addForm.amount);
    if (amountNumber == null || amountNumber <= 0) {
      setError("El monto debe ser un número mayor a cero.");
      return;
    }

    setError(null);
    setMessage(null);
    setActiveRequest("create");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/payment-schedule`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dueDate,
              amount: amountNumber,
              note: addForm.note.trim() || null,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo crear el pago.");
          }
          setItems((previous) => [...previous, payload as StudentPaymentScheduleEntry]);
          setMessage("Pago agregado correctamente.");
          closeAddModal();
          router.refresh();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo crear el pago. Inténtalo nuevamente.",
          );
        } finally {
          setActiveRequest(null);
        }
      })();
    });
  };

  const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingItem || activeRequest) return;

    const noteValue = editForm.note.trim() || null;
    const receivedDateValue = editForm.receivedDate.trim();
    const receivedDate = editForm.isPaid
      ? receivedDateValue || new Date().toISOString().slice(0, 10)
      : null;

    setError(null);
    setMessage(null);
    setActiveRequest("edit");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/students/${studentId}/payment-schedule/${editingItem.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dueDate: editingItem.dueDate,
                amount: editingItem.amount,
                isPaid: editForm.isPaid,
                receivedDate,
                note: noteValue,
              }),
            },
          );
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo actualizar el pago.");
          }
          const updatedEntry = payload as StudentPaymentScheduleEntry;
          setItems((previous) =>
            previous.map((item) => (item.id === updatedEntry.id ? updatedEntry : item)),
          );
          setMessage("Pago actualizado correctamente.");
          closeEditModal();
          router.refresh();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo actualizar el pago. Inténtalo nuevamente.",
          );
        } finally {
          setActiveRequest(null);
        }
      })();
    });
  };

  const handleDelete = async (entryId: number) => {
    if (activeRequest) return;
    const target = items.find((item) => item.id === entryId);
    if (!target) return;

    const confirmation = globalThis.confirm?.(
      "¿Deseas eliminar este pago del cronograma?",
    );
    if (!confirmation) return;

    setError(null);
    setMessage(null);
    setActiveRequest("delete");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/students/${studentId}/payment-schedule/${entryId}`,
            { method: "DELETE" },
          );
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo eliminar el pago.");
          }
          const deletedEntry = payload as StudentPaymentScheduleEntry | null;
          setItems((previous) =>
            previous.filter((item) => item.id !== (deletedEntry?.id ?? entryId)),
          );
          setMessage("Pago eliminado.");
          router.refresh();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo eliminar el pago. Inténtalo nuevamente.",
          );
        } finally {
          setActiveRequest(null);
        }
      })();
    });
  };

  return (
    <section className="flex flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <header className="flex flex-col gap-1 text-left">
        <h2 className="text-2xl font-bold text-brand-deep">Cronograma de pagos</h2>
        <p className="text-sm text-brand-ink-muted">
          Registra los cobros previstos y marca cuándo se reciben para mantener el estado al día.
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
        >
          Agregar pago
        </button>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-inner">
        <table className="min-w-full table-auto divide-y divide-brand-ink-muted/15 text-left text-sm text-brand-ink">
          <thead className="bg-brand-teal-soft/40 text-xs uppercase tracking-wide text-brand-ink">
            <tr>
              <th className="px-4 py-3 font-semibold text-brand-deep">Fecha</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Monto</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Pagado</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Recibido</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Notas</th>
              <th className="px-4 py-3 text-right font-semibold text-brand-deep">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-brand-ink-muted">
                  Aún no hay pagos programados. Usa el botón “Agregar pago” para crear el primero.
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => {
                const amountDisplay =
                  item.amount == null ? "—" : currencyFormatter.format(item.amount);
                const isDeleting = activeRequest === "delete" && isPending;

                return (
                  <tr key={item.id} className="divide-x divide-brand-ink-muted/10">
                    <td className="px-4 py-3 align-top font-semibold text-brand-deep">
                      {formatDate(item.dueDate)}
                    </td>
                    <td className="px-4 py-3 align-top text-brand-ink">{amountDisplay}</td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex min-w-[56px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          item.isPaid
                            ? "bg-brand-teal-soft text-brand-teal"
                            : "bg-brand-ink-muted/15 text-brand-ink"
                        }`}
                      >
                        {item.isPaid ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-brand-ink">
                      {item.receivedDate ? formatDate(item.receivedDate) : "Sin registrar"}
                    </td>
                    <td className="px-4 py-3 align-top text-brand-ink">
                      {item.note ? item.note : "—"}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          disabled={isDeleting}
                          className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-orange px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-0.5 hover:bg-[#e06820] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <Modal
          title="Agregar pago"
          description="Define la fecha límite y el monto que debe cancelar el representante."
          onClose={closeAddModal}
        >
          <form className="flex flex-col gap-4" onSubmit={handleCreate}>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Fecha límite
              <input
                type="date"
                value={addForm.dueDate}
                onChange={(event) =>
                  setAddForm((previous) => ({ ...previous, dueDate: event.target.value }))
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
                value={addForm.amount}
                onChange={(event) =>
                  setAddForm((previous) => ({ ...previous, amount: event.target.value }))
                }
                className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Nota (opcional)
              <textarea
                value={addForm.note}
                onChange={(event) =>
                  setAddForm((previous) => ({ ...previous, note: event.target.value }))
                }
                rows={3}
                className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                placeholder="Añade un recordatorio o detalle"
              />
            </label>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeAddModal}
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-0.5 hover:bg-[#04a890]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={activeRequest === "create" && isPending}
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-0.5 hover:bg-[#04a890] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {activeRequest === "create" && isPending ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingItem && (
        <Modal
          title="Editar pago"
          description="Actualiza el estado del pago según la información más reciente."
          onClose={closeEditModal}
        >
          <form className="flex flex-col gap-4" onSubmit={handleUpdate}>
            <div className="grid gap-3 rounded-2xl bg-white/90 p-4 shadow-inner sm:grid-cols-2">
              <div className="flex flex-col gap-1 text-left text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                Fecha de vencimiento
                <span className="text-sm font-semibold text-brand-deep">
                  {formatDate(editingItem.dueDate)}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-left text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                Monto
                <span className="text-sm font-semibold text-brand-deep">
                  {editingItem.amount == null
                    ? "—"
                    : currencyFormatter.format(editingItem.amount)}
                </span>
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-inner">
              <span className="text-sm font-semibold text-brand-deep">Pagado</span>
              <input
                type="checkbox"
                checked={editForm.isPaid}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    isPaid: event.target.checked,
                    receivedDate: event.target.checked
                      ? previous.receivedDate || new Date().toISOString().slice(0, 10)
                      : "",
                  }))
                }
                className="h-5 w-5 rounded border-brand-deep-soft text-brand-teal focus:ring-brand-teal"
              />
            </label>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Fecha de recepción
              <input
                type="date"
                value={editForm.receivedDate}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    receivedDate: event.target.value,
                  }))
                }
                className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                disabled={!editForm.isPaid}
              />
            </label>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Nota (opcional)
              <textarea
                value={editForm.note}
                onChange={(event) =>
                  setEditForm((previous) => ({ ...previous, note: event.target.value }))
                }
                rows={3}
                className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                placeholder="Añade información relevante"
              />
            </label>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-0.5 hover:bg-[#04a890]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={activeRequest === "edit" && isPending}
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-0.5 hover:bg-[#04a890] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {activeRequest === "edit" && isPending ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

export function PaymentSchedulePanelSkeleton() {
  return (
    <section className="flex animate-pulse flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-col gap-2">
        <span className="h-3 w-28 rounded-full bg-brand-deep-soft/60" />
        <span className="h-6 w-48 rounded-full bg-brand-deep-soft/80" />
        <span className="h-3 w-64 max-w-full rounded-full bg-brand-deep-soft/50" />
      </div>
      <div className="flex justify-end">
        <span className="h-8 w-32 rounded-full bg-brand-deep-soft/40" />
      </div>
      <div className="h-64 w-full rounded-[28px] bg-brand-deep-soft/20" />
    </section>
  );
}
