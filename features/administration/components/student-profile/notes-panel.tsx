"use client";

import { useMemo, useState, useTransition } from "react";
import type { StudentNote } from "@/features/administration/data/student-profile";

type Props = {
  studentId: number;
  notes: StudentNote[];
};

type Draft = {
  note: string;
  category: string;
};

const INITIAL_DRAFT: Draft = {
  note: "",
  category: "",
};

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function NotesPanel({ studentId, notes }: Props) {
  const [items, setItems] = useState<StudentNote[]>(notes);
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<Draft>(INITIAL_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedNotes = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = a.createdAt ?? "";
      const bDate = b.createdAt ?? "";
      return bDate.localeCompare(aDate);
    });
  }, [items]);

  const handleCreate = () => {
    setError(null);
    setMessage(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/notes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              note: draft.note.trim(),
              category: draft.category.trim() || null,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo crear la nota.");
          }
          setItems((previous) => [payload, ...previous]);
          setMessage("Nota agregada.");
          setDraft(INITIAL_DRAFT);
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo crear la nota. Inténtalo nuevamente.",
          );
        }
      })();
    });
  };

  const handleUpdate = (noteId: number) => {
    setError(null);
    setMessage(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/notes/${noteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              note: editingDraft.note.trim(),
              category: editingDraft.category.trim() || null,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo actualizar la nota.");
          }
          setItems((previous) =>
            previous.map((item) =>
              item.id === noteId
                ? {
                    ...item,
                    note: editingDraft.note.trim(),
                    category: editingDraft.category.trim() || null,
                  }
                : item,
            ),
          );
          setMessage("Nota actualizada.");
          setEditingId(null);
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo actualizar la nota. Inténtalo nuevamente.",
          );
        }
      })();
    });
  };

  const handleDelete = (noteId: number) => {
    setError(null);
    setMessage(null);
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
          setItems((previous) => previous.filter((item) => item.id !== noteId));
          setMessage("Nota eliminada.");
          if (editingId === noteId) {
            setEditingId(null);
          }
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo eliminar la nota. Inténtalo nuevamente.",
          );
        }
      })();
    });
  };

  return (
    <section className="flex flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <header className="flex flex-col gap-1 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-deep">Panel 3</span>
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

      <div className="flex flex-col gap-3 rounded-[28px] border border-dashed border-brand-teal/40 bg-white/95 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-deep">Nueva nota</h3>
        <div className="grid gap-3 md:grid-cols-[1fr_200px]">
          <textarea
            value={draft.note}
            onChange={(event) => setDraft((prev) => ({ ...prev, note: event.target.value }))}
            rows={3}
            className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink focus:border-brand-teal focus:outline-none"
            placeholder="Detalle la interacción o seguimiento"
          />
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={draft.category}
              onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
              className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink focus:border-brand-teal focus:outline-none"
              placeholder="Etiqueta (opcional)"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Guardando…" : "Agregar"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {sortedNotes.map((note) => {
          const isEditing = editingId === note.id;
          return (
            <article
              key={note.id}
              className="flex flex-col gap-3 rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-inner"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                    {formatDate(note.createdAt) || "Fecha desconocida"}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-brand-ink-muted">
                    {note.category ?? "Sin etiqueta"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdate(note.id)}
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
                        onClick={() => {
                          setEditingId(note.id);
                          setEditingDraft({ note: note.note, category: note.category ?? "" });
                        }}
                        className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        disabled={isPending}
                        className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-orange px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#ff6a00] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ff7a23] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
              {isEditing ? (
                <>
                  <textarea
                    value={editingDraft.note}
                    onChange={(event) => setEditingDraft((prev) => ({ ...prev, note: event.target.value }))}
                    rows={4}
                    className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-3 py-2 text-sm text-brand-ink focus:border-brand-teal focus:outline-none"
                  />
                  <input
                    type="text"
                    value={editingDraft.category}
                    onChange={(event) => setEditingDraft((prev) => ({ ...prev, category: event.target.value }))}
                    className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-3 py-1 text-sm text-brand-ink focus:border-brand-teal focus:outline-none"
                    placeholder="Etiqueta"
                  />
                </>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-brand-ink">{note.note}</p>
              )}
            </article>
          );
        })}
        {!sortedNotes.length && (
          <p className="rounded-[28px] border border-dashed border-brand-ink-muted/40 bg-white/95 px-5 py-6 text-center text-sm text-brand-ink-muted">
            Aún no hay notas registradas para este estudiante.
          </p>
        )}
      </div>
    </section>
  );
}

export function NotesPanelSkeleton() {
  return (
    <section className="flex animate-pulse flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-col gap-2">
        <span className="h-3 w-32 rounded-full bg-brand-deep-soft/60" />
        <span className="h-6 w-28 rounded-full bg-brand-deep-soft/80" />
        <span className="h-3 w-64 rounded-full bg-brand-deep-soft/50" />
      </div>
      <div className="flex flex-col gap-3 rounded-[28px] border border-dashed border-brand-teal/30 bg-white/95 p-4">
        <span className="h-4 w-24 rounded-full bg-brand-teal-soft/60" />
        <span className="h-16 w-full rounded-2xl bg-brand-deep-soft/30" />
        <span className="h-10 w-32 rounded-full bg-brand-deep-soft/40" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-2xl bg-white/95 p-4 shadow-inner">
            <span className="h-3 w-32 rounded-full bg-brand-deep-soft/40" />
            <span className="h-12 w-full rounded-xl bg-brand-deep-soft/30" />
          </div>
        ))}
      </div>
    </section>
  );
}
