"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { StudentNote } from "@/features/administration/data/student-profile";

type Props = {
  studentId: number;
  notes: StudentNote[];
};

type ActiveRequest = "create" | "edit" | "delete" | null;

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

function formatDateTime(value: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Modal({ title, description, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.35)] px-4 py-6 backdrop-blur-sm">
      <div className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-[32px] border border-white/80 bg-white/95 text-brand-ink shadow-[0_24px_58px_rgba(15,23,42,0.18)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-deep-soft text-lg font-bold text-brand-deep transition hover:bg-brand-deep-soft/80"
          aria-label="Cerrar ventana"
        >
          ×
        </button>
        <div className="flex max-h-[85vh] flex-col overflow-hidden">
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

export function NotesPanel({ studentId, notes }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<StudentNote[]>(notes);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeRequest, setActiveRequest] = useState<ActiveRequest>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingNote, setEditingNote] = useState<StudentNote | null>(null);

  useEffect(() => {
    setItems(notes);
  }, [notes]);

  const sortedNotes = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = a.createdAt ?? "";
      const bDate = b.createdAt ?? "";
      return bDate.localeCompare(aDate);
    });
  }, [items]);

  const closeAddModal = () => {
    if (isPending && activeRequest === "create") return;
    setIsAddOpen(false);
    setDraft("");
  };

  const closeEditModal = () => {
    if (isPending && activeRequest === "edit") return;
    setEditingNote(null);
    setDraft("");
  };

  const openAddModal = () => {
    setError(null);
    setMessage(null);
    setDraft("");
    setIsAddOpen(true);
  };

  const openEditModal = (note: StudentNote) => {
    setError(null);
    setMessage(null);
    setEditingNote(note);
    setDraft(note.note);
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeRequest) return;

    if (!draft.trim()) {
      setError("La nota no puede estar vacía.");
      return;
    }

    setError(null);
    setMessage(null);
    setActiveRequest("create");

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
            throw new Error(payload?.error ?? "No se pudo crear la nota.");
          }
          setItems((previous) => [payload as StudentNote, ...previous]);
          setMessage("Nota agregada.");
          closeAddModal();
          router.refresh();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo crear la nota. Inténtalo nuevamente.",
          );
        } finally {
          setActiveRequest(null);
        }
      })();
    });
  };

  const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingNote || activeRequest) return;

    if (!draft.trim()) {
      setError("La nota no puede estar vacía.");
      return;
    }

    setError(null);
    setMessage(null);
    setActiveRequest("edit");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/students/${studentId}/notes/${editingNote.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ note: draft.trim() }),
            },
          );
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo actualizar la nota.");
          }
          const updatedNote = payload as StudentNote;
          setItems((previous) =>
            previous.map((item) => (item.id === updatedNote.id ? updatedNote : item)),
          );
          setMessage("Nota actualizada.");
          closeEditModal();
          router.refresh();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo actualizar la nota. Inténtalo nuevamente.",
          );
        } finally {
          setActiveRequest(null);
        }
      })();
    });
  };

  const handleDelete = async (noteId: number) => {
    if (activeRequest) return;
    const confirmation = globalThis.confirm?.("¿Eliminar esta nota?");
    if (!confirmation) return;

    setError(null);
    setMessage(null);
    setActiveRequest("delete");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/notes/${noteId}`, {
            method: "DELETE",
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo eliminar la nota.");
          }
          const deletedNote = payload as StudentNote | null;
          setItems((previous) =>
            previous.filter((item) => item.id !== (deletedNote?.id ?? noteId)),
          );
          setMessage("Nota eliminada.");
          router.refresh();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo eliminar la nota. Inténtalo nuevamente.",
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
          Panel 3
        </span>
        <h2 className="text-2xl font-bold text-brand-deep">Notas</h2>
        <p className="text-sm text-brand-ink-muted">
          Documenta interacciones, acuerdos y seguimientos relevantes para todo el equipo.
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
          Agregar nota
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {sortedNotes.length === 0 ? (
          <p className="rounded-[28px] border border-dashed border-brand-teal/40 bg-white/95 px-5 py-6 text-center text-sm text-brand-ink-muted">
            Aún no hay notas registradas. Usa el botón “Agregar nota” para documentar la primera interacción.
          </p>
        ) : (
          sortedNotes.map((note) => (
            <article
              key={note.id}
              className="flex flex-col gap-3 rounded-[28px] border border-white/70 bg-white/95 px-5 py-4 shadow-inner"
            >
              <header className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-semibold text-brand-deep">
                  {formatDateTime(note.createdAt)}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(note)}
                    className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(note.id)}
                    disabled={activeRequest === "delete" && isPending}
                    className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-orange px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-0.5 hover:bg-[#e06820] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Eliminar
                  </button>
                </div>
              </header>
              <p className="text-sm leading-relaxed text-brand-ink">{note.note}</p>
            </article>
          ))
        )}
      </div>

      {isAddOpen && (
        <Modal
          title="Agregar nota"
          description="Comparte detalles relevantes para el seguimiento académico o administrativo."
          onClose={closeAddModal}
        >
          <form className="flex flex-col gap-4" onSubmit={handleCreate}>
            <label className="flex flex-col gap-2 text-left text-sm font-semibold text-brand-deep">
              Nota
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                placeholder="Describe la interacción o el seguimiento"
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

      {editingNote && (
        <Modal
          title="Editar nota"
          description="Actualiza el contenido para mantener al equipo informado."
          onClose={closeEditModal}
        >
          <form className="flex flex-col gap-4" onSubmit={handleUpdate}>
            <label className="flex flex-col gap-2 text-left text-sm font-semibold text-brand-deep">
              Nota
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                placeholder="Describe la interacción o el seguimiento"
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

export function NotesPanelSkeleton() {
  return (
    <section className="flex animate-pulse flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-col gap-2">
        <span className="h-3 w-24 rounded-full bg-brand-deep-soft/60" />
        <span className="h-6 w-40 rounded-full bg-brand-deep-soft/80" />
        <span className="h-3 w-64 max-w-full rounded-full bg-brand-deep-soft/50" />
      </div>
      <div className="flex justify-end">
        <span className="h-8 w-32 rounded-full bg-brand-deep-soft/40" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 rounded-[28px] bg-brand-deep-soft/20" />
        ))}
      </div>
    </section>
  );
}
