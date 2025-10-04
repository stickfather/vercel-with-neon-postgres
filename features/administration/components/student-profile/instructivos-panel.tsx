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
  content: string;
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
  content: "",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.35)] px-4 py-6 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-[32px] border border-white/80 bg-white/95 p-6 text-brand-ink shadow-[0_24px_58px_rgba(15,23,42,0.18)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-deep-soft text-lg font-bold text-brand-deep transition hover:bg-brand-deep-soft/80"
          aria-label="Cerrar ventana"
        >
          ×
        </button>
        <div className="flex flex-col gap-4 pr-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-ink-muted">
              Acción requerida
            </span>
            <h3 className="text-xl font-semibold text-brand-deep">{title}</h3>
            {description ? (
              <p className="text-sm text-brand-ink-muted">{description}</p>
            ) : null}
          </div>
          {children}
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
      const aDate = a.createdAt ?? "";
      const bDate = b.createdAt ?? "";
      return bDate.localeCompare(aDate);
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
      content: item.content,
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

    if (!addForm.content.trim()) {
      setError("Debes ingresar las instrucciones o contenido.");
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
              content: addForm.content.trim(),
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

    if (!editForm.content.trim()) {
      setError("Debes ingresar las instrucciones o contenido.");
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
                content: editForm.content.trim(),
                note: editForm.note.trim() || null,
                createdBy: editingItem.createdBy ?? null,
              }),
            },
          );
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo actualizar el instructivo.");
          }
          setItems((previous) =>
            previous.map((item) =>
              item.id === editingItem.id
                ? {
                    ...item,
                    title: editForm.title.trim(),
                    content: editForm.content.trim(),
                    note: editForm.note.trim() || null,
                  }
                : item,
            ),
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
          setItems((previous) => previous.filter((item) => item.id !== instructivoId));
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
          Panel 5
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
          className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
        >
          Agregar instructivo
        </button>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-inner">
        <table className="min-w-full table-auto divide-y divide-brand-ink-muted/15 text-left text-sm text-brand-ink">
          <thead className="bg-brand-teal-soft/40 text-xs uppercase tracking-wide text-brand-ink">
            <tr>
              <th className="px-4 py-3 font-semibold text-brand-deep">Fecha</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Título</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Resumen</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Creado por</th>
              <th className="px-4 py-3 text-right font-semibold text-brand-deep">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-brand-ink-muted">
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
                    {item.title}
                  </td>
                  <td className="px-4 py-3 align-top text-brand-ink">
                    <p className="line-clamp-3 text-sm leading-relaxed">
                      {item.content}
                    </p>
                    {item.note ? (
                      <p className="mt-2 text-xs text-brand-ink-muted">
                        Nota: {item.note}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top text-brand-ink">
                    {item.createdBy ?? "—"}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center justify-center rounded-full border border-brand-teal/40 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-teal transition hover:-translate-y-0.5 hover:border-brand-teal hover:bg-brand-teal-soft/40"
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
              Title
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
              Content / Instructions
              <textarea
                value={addForm.content}
                onChange={(event) =>
                  setAddForm((previous) => ({ ...previous, content: event.target.value }))
                }
                rows={4}
                className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                placeholder="Describe los pasos o instrucciones"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Note (opcional)
              <textarea
                value={addForm.note}
                onChange={(event) =>
                  setAddForm((previous) => ({ ...previous, note: event.target.value }))
                }
                rows={3}
                className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                placeholder="Añade contexto o recordatorios"
              />
            </label>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeAddModal}
                className="inline-flex items-center justify-center rounded-full border border-brand-teal/30 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-teal transition hover:-translate-y-0.5 hover:border-brand-teal hover:bg-brand-teal-soft/40"
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
              Title
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
              Content / Instructions
              <textarea
                value={editForm.content}
                onChange={(event) =>
                  setEditForm((previous) => ({ ...previous, content: event.target.value }))
                }
                rows={4}
                className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Note (opcional)
              <textarea
                value={editForm.note}
                onChange={(event) =>
                  setEditForm((previous) => ({ ...previous, note: event.target.value }))
                }
                rows={3}
                className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
              />
            </label>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex items-center justify-center rounded-full border border-brand-teal/30 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-teal transition hover:-translate-y-0.5 hover:border-brand-teal hover:bg-brand-teal-soft/40"
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
