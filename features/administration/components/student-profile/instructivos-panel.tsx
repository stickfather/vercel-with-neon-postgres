"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { StudentInstructivo } from "@/features/administration/data/student-profile";

type Props = {
  studentId: number;
  instructivos: StudentInstructivo[];
};

type Draft = {
  dueDate: string;
  examId: string;
  completed: boolean;
  completedAt: string;
  notes: string;
};

const INITIAL_DRAFT: Draft = {
  dueDate: "",
  examId: "",
  completed: false,
  completedAt: "",
  notes: "",
};

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) return normalized;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function formatDateTime(value: string | null): string {
  if (!value) return "Sin fecha";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) return normalized.replace("T", " ");
  return date.toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseExamId(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export function InstructivosPanel({ studentId, instructivos }: Props) {
  const [items, setItems] = useState<StudentInstructivo[]>(instructivos);
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<Draft>(INITIAL_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(instructivos);
  }, [instructivos]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = a.dueDate ?? "";
      const bDate = b.dueDate ?? "";
      return aDate.localeCompare(bDate);
    });
  }, [items]);

  const handleCreate = () => {
    if (!draft.dueDate.trim()) {
      setError("Debes asignar una fecha límite.");
      return;
    }

    const examId = parseExamId(draft.examId);
    setError(null);
    setMessage(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/instructivos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dueDate: draft.dueDate.trim(),
              examId,
              notes: draft.notes.trim() || null,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo crear el instructivo.");
          }
          setItems((previous) => [...previous, payload as StudentInstructivo]);
          setMessage("Instructivo asignado.");
          setDraft(INITIAL_DRAFT);
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

  const handleUpdate = (instructivoId: number) => {
    if (!editingDraft.dueDate.trim()) {
      setError("Debes asignar una fecha límite.");
      return;
    }

    const examId = parseExamId(editingDraft.examId);
    setError(null);
    setMessage(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/instructivos/${instructivoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dueDate: editingDraft.dueDate.trim(),
              examId,
              completed: editingDraft.completed,
              completedAt: editingDraft.completedAt.trim() || null,
              notes: editingDraft.notes.trim() || null,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo actualizar el instructivo.");
          }
          setItems((previous) =>
            previous.map((item) =>
              item.id === instructivoId
                ? {
                    ...item,
                    dueDate: editingDraft.dueDate.trim(),
                    examId,
                    completed: editingDraft.completed,
                    completedAt: editingDraft.completedAt.trim() || null,
                    notes: editingDraft.notes.trim() || null,
                  }
                : item,
            ),
          );
          setMessage("Instructivo actualizado.");
          setEditingId(null);
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo actualizar el instructivo. Inténtalo nuevamente.",
          );
        }
      })();
    });
  };

  const handleDelete = (instructivoId: number) => {
    setError(null);
    setMessage(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/instructivos/${instructivoId}`, {
            method: "DELETE",
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo eliminar el instructivo.");
          }
          setItems((previous) => previous.filter((item) => item.id !== instructivoId));
          setMessage("Instructivo eliminado.");
          if (editingId === instructivoId) {
            setEditingId(null);
          }
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo eliminar el instructivo. Inténtalo nuevamente.",
          );
        }
      })();
    });
  };

  const startEditing = (item: StudentInstructivo) => {
    setEditingId(item.id);
    setEditingDraft({
      dueDate: toDateTimeLocal(item.dueDate),
      examId: item.examId == null ? "" : String(item.examId),
      completed: item.completed,
      completedAt: toDateTimeLocal(item.completedAt),
      notes: item.notes ?? "",
    });
  };

  return (
    <section className="flex flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <header className="flex flex-col gap-1 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-deep">Panel 5</span>
        <h2 className="text-2xl font-bold text-brand-deep">Instructivos</h2>
        <p className="text-sm text-brand-ink-muted">
          Administra los instructivos asignados y su avance para asegurar el seguimiento académico.
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
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-deep">Asignar instructivo</h3>
        <div className="grid gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))]">
          <input
            type="datetime-local"
            value={draft.dueDate}
            onChange={(event) => setDraft((prev) => ({ ...prev, dueDate: event.target.value }))}
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink focus:border-brand-teal focus:outline-none"
          />
          <input
            type="number"
            value={draft.examId}
            onChange={(event) => setDraft((prev) => ({ ...prev, examId: event.target.value }))}
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink focus:border-brand-teal focus:outline-none"
            placeholder="ID de examen (opcional)"
          />
          <textarea
            value={draft.notes}
            onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
            rows={2}
            className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink focus:border-brand-teal focus:outline-none"
            placeholder="Notas"
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

      <div className="flex flex-col gap-4">
        {sortedItems.map((item) => {
          const isEditing = editingId === item.id;
          return (
            <article
              key={item.id}
              className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-inner"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                    Asignado: {formatDateTime(item.assignedAt)}
                  </span>
                  <span className="text-sm font-semibold text-brand-deep">
                    Entrega: {formatDateTime(item.dueDate)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                    ID de examen vinculado
                  </span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editingDraft.examId}
                      onChange={(event) =>
                        setEditingDraft((prev) => ({ ...prev, examId: event.target.value }))
                      }
                      className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-3 py-1 text-sm leading-relaxed text-brand-ink focus:border-brand-teal focus:outline-none"
                    />
                  ) : (
                    <span className="text-sm text-brand-ink">
                      {item.examId == null ? "—" : item.examId}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                    Completado
                  </span>
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingDraft.completed}
                          onChange={(event) =>
                            setEditingDraft((prev) => ({
                              ...prev,
                              completed: event.target.checked,
                              completedAt:
                                event.target.checked && !prev.completedAt
                                  ? new Date().toISOString().slice(0, 16)
                                  : prev.completedAt,
                            }))
                          }
                          className="h-5 w-5 rounded border-brand-deep-soft text-brand-teal focus:ring-brand-teal"
                        />
                        <span className="text-sm font-semibold text-brand-deep">
                          {editingDraft.completed ? "Sí" : "No"}
                        </span>
                      </label>
                      <input
                        type="datetime-local"
                        value={editingDraft.completedAt}
                        onChange={(event) =>
                          setEditingDraft((prev) => ({ ...prev, completedAt: event.target.value }))
                        }
                        className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-3 py-1 text-sm leading-relaxed text-brand-ink focus:border-brand-teal focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex min-w-[48px] items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          item.completed
                            ? "bg-brand-teal-soft text-brand-teal"
                            : "bg-brand-ink-muted/15 text-brand-ink"
                        }`}
                      >
                        {item.completed ? "Sí" : "No"}
                      </span>
                      <span className="text-xs text-brand-ink-muted">
                        {item.completedAt ? `Completado: ${formatDateTime(item.completedAt)}` : "Sin completar"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                  Notas
                </span>
                {isEditing ? (
                  <textarea
                    value={editingDraft.notes}
                    onChange={(event) =>
                      setEditingDraft((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink focus:border-brand-teal focus:outline-none"
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-brand-ink">
                    {item.notes ?? "Sin notas"}
                  </p>
                )}
              </div>
            </article>
          );
        })}
        {!sortedItems.length && (
          <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 text-center text-sm text-brand-ink-muted shadow-inner">
            No hay instructivos asignados todavía.
          </div>
        )}
      </div>
    </section>
  );
}

export function InstructivosPanelSkeleton() {
  return (
    <section className="flex animate-pulse flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-col gap-2">
        <span className="h-3 w-32 rounded-full bg-brand-deep-soft/60" />
        <span className="h-6 w-48 rounded-full bg-brand-deep-soft/80" />
        <span className="h-3 w-72 max-w-full rounded-full bg-brand-deep-soft/50" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-inner">
            <span className="h-3 w-40 rounded-full bg-brand-deep-soft/40" />
            <span className="h-16 w-full rounded-2xl bg-brand-deep-soft/30" />
          </div>
        ))}
      </div>
    </section>
  );
}
