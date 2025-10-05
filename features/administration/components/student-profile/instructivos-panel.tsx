"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { StudentInstructivo } from "@/features/administration/data/student-profile";

type Props = {
  studentId: number;
  instructivos: StudentInstructivo[];
};

type ActiveRequest = "create" | "edit" | "delete" | null;

type AddFormState = {
  title: string;
  dueDate: string;
  completed: boolean;
  note: string;
};

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

const INITIAL_ADD_FORM: AddFormState = {
  title: "",
  dueDate: "",
  completed: false,
  note: "",
};

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
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

export function InstructivosPanel({ studentId, instructivos }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<StudentInstructivo[]>(instructivos);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeRequest, setActiveRequest] = useState<ActiveRequest>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>(INITIAL_ADD_FORM);
  const [editingItem, setEditingItem] = useState<StudentInstructivo | null>(null);
  const [editForm, setEditForm] = useState<AddFormState>(INITIAL_ADD_FORM);

  useEffect(() => {
    setItems(instructivos);
  }, [instructivos]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDue = a.dueDate ?? "";
      const bDue = b.dueDate ?? "";
      if (aDue && bDue) return aDue.localeCompare(bDue);
      if (aDue) return -1;
      if (bDue) return 1;
      const aCreated = a.createdAt ?? "";
      const bCreated = b.createdAt ?? "";
      return bCreated.localeCompare(aCreated);
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
    setEditForm(INITIAL_ADD_FORM);
  };

  const openAddModal = () => {
    setError(null);
    setMessage(null);
    setAddForm(INITIAL_ADD_FORM);
    setIsAddOpen(true);
  };

  const openEditModal = (item: StudentInstructivo) => {
    setError(null);
    setMessage(null);
    setEditingItem(item);
    setEditForm({
      title: item.title,
      dueDate: item.dueDate ?? "",
      completed: Boolean(item.completed),
      note: item.note ?? "",
    });
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeRequest) return;

    if (!addForm.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    if (!addForm.note.trim()) {
      setError("Debes ingresar la descripción o nota del instructivo.");
      return;
    }

    setError(null);
    setMessage(null);
    setActiveRequest("create");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/instructivos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: addForm.title.trim(),
              dueDate: addForm.dueDate.trim() || null,
              completed: addForm.completed,
              note: addForm.note.trim() || null,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo crear el instructivo.");
          }
          setItems((previous) => [payload as StudentInstructivo, ...previous]);
          setMessage("Instructivo asignado.");
          closeAddModal();
          router.refresh();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo crear el instructivo. Inténtalo nuevamente.",
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

    if (!editForm.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    if (!editForm.note.trim()) {
      setError("Debes ingresar la descripción o nota del instructivo.");
      return;
    }

    setError(null);
    setMessage(null);
    setActiveRequest("edit");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/students/${studentId}/instructivos/${editingItem.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: editForm.title.trim(),
                dueDate: editForm.dueDate.trim() || null,
                completed: editForm.completed,
                note: editForm.note.trim() || null,
              }),
            },
          );
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo actualizar el instructivo.");
          }
          const updatedInstructivo = payload as StudentInstructivo;
          setItems((previous) =>
            previous.map((item) => (item.id === updatedInstructivo.id ? updatedInstructivo : item)),
          );
          setMessage("Instructivo actualizado.");
          closeEditModal();
          router.refresh();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo actualizar el instructivo. Inténtalo nuevamente.",
          );
        } finally {
          setActiveRequest(null);
        }
      })();
    });
  };

  const handleDelete = async (instructivoId: number) => {
    if (activeRequest) return;
    const confirmation = globalThis.confirm?.("¿Eliminar este instructivo?");
    if (!confirmation) return;

    setError(null);
    setMessage(null);
    setActiveRequest("delete");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/students/${studentId}/instructivos/${instructivoId}`,
            { method: "DELETE" },
          );
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo eliminar el instructivo.");
          }
          const deletedInstructivo = payload as StudentInstructivo | null;
          setItems((previous) =>
            previous.filter((item) => item.id !== (deletedInstructivo?.id ?? instructivoId)),
          );
          setMessage("Instructivo eliminado.");
          router.refresh();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo eliminar el instructivo. Inténtalo nuevamente.",
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
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-deep">
          Panel 4
        </span>
        <h2 className="text-2xl font-bold text-brand-deep">Instructivos</h2>
        <p className="text-sm text-brand-ink-muted">
          Comparte indicaciones detalladas para estudiantes o representantes y guarda notas de seguimiento.
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
          Agregar instructivo
        </button>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-inner">
        <table className="min-w-full table-auto divide-y divide-brand-ink-muted/15 text-left text-sm text-brand-ink">
          <thead className="bg-brand-teal-soft/40 text-xs uppercase tracking-wide text-brand-ink">
            <tr>
              <th className="px-4 py-3 font-semibold text-brand-deep">Creado</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Fecha límite</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Título</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Estado</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Nota</th>
              <th className="px-4 py-3 text-right font-semibold text-brand-deep">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-brand-ink-muted">
                  No se han registrado instructivos todavía. Usa el botón “Agregar instructivo” para crear uno nuevo.
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => (
                <tr key={item.id} className="divide-x divide-brand-ink-muted/10">
                  <td className="px-4 py-3 align-top font-semibold text-brand-deep">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="px-4 py-3 align-top text-brand-ink">
                    {formatDate(item.dueDate)}
                  </td>
                  <td className="px-4 py-3 align-top text-brand-ink">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-brand-deep">{item.title}</span>
                      <span className="text-xs text-brand-ink-muted">
                        Última actualización: {formatDate(item.updatedAt ?? item.createdAt)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                        item.completed
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.completed ? "Completado" : "Pendiente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-brand-ink">
                    {item.note ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.note}</p>
                    ) : (
                      <span className="text-sm text-brand-ink-muted">Sin nota registrada</span>
                    )}
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
                        disabled={activeRequest === "delete" && isPending}
                        className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-orange px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-0.5 hover:bg-[#e06820] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <Modal
          title="Agregar instructivo"
          description="Detalla las instrucciones para que el estudiante pueda revisarlas posteriormente."
          onClose={closeAddModal}
        >
          <form className="flex flex-col gap-4" onSubmit={handleCreate}>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Título
              <input
                type="text"
                value={addForm.title}
                onChange={(event) =>
                  setAddForm((previous) => ({ ...previous, title: event.target.value }))
                }
                className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Fecha límite (opcional)
              <input
                type="date"
                value={addForm.dueDate}
                onChange={(event) =>
                  setAddForm((previous) => ({ ...previous, dueDate: event.target.value }))
                }
                className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
              />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-2xl bg-white/95 p-4 text-left text-sm font-semibold text-brand-deep shadow-inner">
              <span>Marcar como completado</span>
              <input
                type="checkbox"
                checked={addForm.completed}
                onChange={(event) =>
                  setAddForm((previous) => ({ ...previous, completed: event.target.checked }))
                }
                className="h-5 w-5 rounded border-brand-deep-soft text-brand-teal focus:ring-brand-teal"
              />
            </label>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Nota
              <textarea
                value={addForm.note}
                onChange={(event) =>
                  setAddForm((previous) => ({ ...previous, note: event.target.value }))
                }
                rows={4}
                className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                placeholder="Añade contexto o recordatorios"
                required
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
          title="Editar instructivo"
          description="Ajusta el contenido o notas asociadas a estas instrucciones."
          onClose={closeEditModal}
        >
          <form className="flex flex-col gap-4" onSubmit={handleUpdate}>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Título
              <input
                type="text"
                value={editForm.title}
                onChange={(event) =>
                  setEditForm((previous) => ({ ...previous, title: event.target.value }))
                }
                className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Fecha límite (opcional)
              <input
                type="date"
                value={editForm.dueDate}
                onChange={(event) =>
                  setEditForm((previous) => ({ ...previous, dueDate: event.target.value }))
                }
                className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
              />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-2xl bg-white/95 p-4 text-left text-sm font-semibold text-brand-deep shadow-inner">
              <span>Marcar como completado</span>
              <input
                type="checkbox"
                checked={editForm.completed}
                onChange={(event) =>
                  setEditForm((previous) => ({ ...previous, completed: event.target.checked }))
                }
                className="h-5 w-5 rounded border-brand-deep-soft text-brand-teal focus:ring-brand-teal"
              />
            </label>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Nota
              <textarea
                value={editForm.note}
                onChange={(event) =>
                  setEditForm((previous) => ({ ...previous, note: event.target.value }))
                }
                rows={4}
                className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                required
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

export function InstructivosPanelSkeleton() {
  return (
    <section className="flex animate-pulse flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-col gap-2">
        <span className="h-3 w-28 rounded-full bg-brand-deep-soft/60" />
        <span className="h-6 w-40 rounded-full bg-brand-deep-soft/80" />
        <span className="h-3 w-64 max-w-full rounded-full bg-brand-deep-soft/50" />
      </div>
      <div className="flex justify-end">
        <span className="h-8 w-40 rounded-full bg-brand-deep-soft/40" />
      </div>
      <div className="h-64 w-full rounded-[28px] bg-brand-deep-soft/20" />
    </section>
  );
}
