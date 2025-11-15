"use client";

import {
  useMemo,
  useState,
  useTransition,
  type Dispatch,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { StudentNote, StudentNoteType } from "@/features/administration/data/student-profile";

type Props = {
  studentId: number;
  notes: StudentNote[];
  onEntriesChange: Dispatch<React.SetStateAction<StudentNote[]>>;
  onRequestAdd: () => void;
};

type ActiveRequest = "edit" | "delete" | null;

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

const NOTE_TYPES: StudentNoteType[] = [
  "Académica",
  "Conducta",
  "Asistencia",
  "Finanzas",
  "Otra",
];

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

export function NotesPanel({
  studentId,
  notes,
  onEntriesChange,
  onRequestAdd,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeRequest, setActiveRequest] = useState<ActiveRequest>(null);
  const [draft, setDraft] = useState("");
  const [draftType, setDraftType] = useState<StudentNoteType | "">("");
  const [draftManagementAction, setDraftManagementAction] = useState(false);
  const [editingNote, setEditingNote] = useState<StudentNote | null>(null);

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      const aDate = a.createdAt ?? "";
      const bDate = b.createdAt ?? "";
      return bDate.localeCompare(aDate);
    });
  }, [notes]);

  const closeEditModal = () => {
    if (isPending && activeRequest === "edit") return;
    setEditingNote(null);
    setDraft("");
    setDraftType("");
    setDraftManagementAction(false);
  };

  const handleAddRequest = () => {
    setError(null);
    setMessage(null);
    onRequestAdd();
  };

  const openEditModal = (note: StudentNote) => {
    setError(null);
    setMessage(null);
    setEditingNote(note);
    setDraft(note.note);
    setDraftType(note.type ?? "");
    setDraftManagementAction(note.managementAction ?? false);
  };

  const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingNote || activeRequest) return;

    if (!draft.trim()) {
      setError("La observación no puede estar vacía.");
      return;
    }

    if (!draftType) {
      setError("Debes seleccionar un tipo de nota.");
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
              body: JSON.stringify({ 
                note: draft.trim(),
                type: draftType,
                managementAction: draftManagementAction,
              }),
            },
          );
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo actualizar la observación.");
          }
          const updatedNote = payload as StudentNote;
          onEntriesChange((previous) =>
            previous.map((item) => (item.id === updatedNote.id ? updatedNote : item)),
          );
          setMessage("Observación actualizada.");
          closeEditModal();
          router.refresh();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo actualizar la observación. Inténtalo nuevamente.",
          );
        } finally {
          setActiveRequest(null);
        }
      })();
    });
  };

  const handleDelete = async (noteId: number) => {
    if (activeRequest) return;
    const confirmation = globalThis.confirm?.("¿Eliminar esta observación?");
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
            throw new Error(payload?.error ?? "No se pudo eliminar la observación.");
          }
          const deletedNote = payload as StudentNote | null;
          onEntriesChange((previous) =>
            previous.filter((item) => item.id !== (deletedNote?.id ?? noteId)),
          );
          setMessage("Observación eliminada.");
          router.refresh();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo eliminar la observación. Inténtalo nuevamente.",
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
        <h2 className="text-2xl font-bold text-brand-deep">Observaciones</h2>
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
          onClick={handleAddRequest}
          className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
        >
          Agregar observación
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {sortedNotes.length === 0 ? (
          <p className="rounded-[28px] border border-dashed border-brand-teal/40 bg-white/95 px-5 py-6 text-center text-sm text-brand-ink-muted">
            Aún no hay observaciones registradas. Usa el botón “Agregar observación” para documentar la primera interacción.
          </p>
        ) : (
          sortedNotes.map((note) => (
            <article
              key={note.id}
              className="flex flex-col gap-3 rounded-[28px] border border-white/70 bg-white/95 px-5 py-4 shadow-inner"
            >
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-brand-deep">
                    {formatDateTime(note.createdAt)}
                  </span>
                  {note.type ? (
                    <span className="inline-flex w-fit items-center rounded-full bg-brand-teal-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-teal">
                      {note.type}
                    </span>
                  ) : null}
                </div>
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
              {note.managementAction ? (
                <div className="flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3 py-1.5 text-xs font-semibold text-brand-orange">
                  <span className="h-2 w-2 rounded-full bg-brand-orange" />
                  Requiere revisión de gestión
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>

      {editingNote && (
        <Modal
          title="Editar observación"
          description="Actualiza el contenido para mantener al equipo informado."
          onClose={closeEditModal}
        >
          <form className="flex flex-col gap-4" onSubmit={handleUpdate}>
            <label className="flex flex-col gap-2 text-left text-sm font-semibold text-brand-deep">
              Tipo de nota *
              <select
                value={draftType}
                onChange={(event) => setDraftType(event.target.value as StudentNoteType)}
                className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                required
              >
                <option value="">Selecciona un tipo</option>
                {NOTE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-left text-sm font-semibold text-brand-deep">
              Observación
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                placeholder="Describe la interacción o el seguimiento"
                required
              />
            </label>
            <label className="flex items-center gap-3 text-left text-sm font-semibold text-brand-deep">
              <div className="flex flex-col gap-1">
                <span>Revisión de Gestión</span>
                <span className="text-xs font-normal text-brand-ink-muted">
                  Marca si esta nota requiere acción de gestión
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-brand-ink-muted">
                  {draftManagementAction ? "Incompleto" : "Completo"}
                </span>
                <input
                  type="checkbox"
                  checked={draftManagementAction}
                  onChange={(event) => setDraftManagementAction(event.target.checked)}
                  className="h-5 w-5 rounded border-brand-deep-soft/40 text-brand-teal focus:ring-brand-teal"
                />
              </div>
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
