"use client";

import { useMemo, useState, useTransition } from "react";
import type { StudentExam } from "@/features/administration/data/student-profile";

type Props = {
  studentId: number;
  exams: StudentExam[];
};

type Draft = {
  examDate: string;
  examType: string;
  status: string;
  location: string;
  result: string;
  notes: string;
};

const INITIAL_DRAFT: Draft = {
  examDate: "",
  examType: "",
  status: "",
  location: "",
  result: "",
  notes: "",
};

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ExamsPanel({ studentId, exams }: Props) {
  const [items, setItems] = useState<StudentExam[]>(exams);
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<Draft>(INITIAL_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedExams = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = a.examDate ?? "";
      const bDate = b.examDate ?? "";
      return bDate.localeCompare(aDate);
    });
  }, [items]);

  const handleCreate = () => {
    setError(null);
    setMessage(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/exams`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              examDate: draft.examDate || null,
              examType: draft.examType.trim() || null,
              status: draft.status.trim() || null,
              location: draft.location.trim() || null,
              result: draft.result.trim() || null,
              notes: draft.notes.trim() || null,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo crear el examen.");
          }
          setItems((previous) => [payload, ...previous]);
          setMessage("Examen creado.");
          setDraft(INITIAL_DRAFT);
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

  const handleUpdate = (examId: number) => {
    setError(null);
    setMessage(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/exams/${examId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              examDate: editingDraft.examDate || null,
              examType: editingDraft.examType.trim() || null,
              status: editingDraft.status.trim() || null,
              location: editingDraft.location.trim() || null,
              result: editingDraft.result.trim() || null,
              notes: editingDraft.notes.trim() || null,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo actualizar el examen.");
          }
          setItems((previous) =>
            previous.map((item) =>
              item.id === examId
                ? {
                    ...item,
                    examDate: editingDraft.examDate || null,
                    examType: editingDraft.examType.trim() || null,
                    status: editingDraft.status.trim() || null,
                    location: editingDraft.location.trim() || null,
                    result: editingDraft.result.trim() || null,
                    notes: editingDraft.notes.trim() || null,
                  }
                : item,
            ),
          );
          setMessage("Examen actualizado.");
          setEditingId(null);
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo actualizar el examen. Inténtalo nuevamente.",
          );
        }
      })();
    });
  };

  const handleDelete = (examId: number) => {
    setError(null);
    setMessage(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/exams/${examId}`, {
            method: "DELETE",
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo eliminar el examen.");
          }
          setItems((previous) => previous.filter((item) => item.id !== examId));
          setMessage("Examen eliminado.");
          if (editingId === examId) {
            setEditingId(null);
          }
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo eliminar el examen. Inténtalo nuevamente.",
          );
        }
      })();
    });
  };

  return (
    <section className="flex flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <header className="flex flex-col gap-1 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-deep">Panel 4</span>
        <h2 className="text-2xl font-bold text-brand-deep">Exámenes</h2>
        <p className="text-sm text-brand-ink-muted">
          Programa evaluaciones y registra resultados para monitorear el avance académico.
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
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-deep">Agregar examen</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="date"
            value={draft.examDate}
            onChange={(event) => setDraft((prev) => ({ ...prev, examDate: event.target.value }))}
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink focus:border-brand-teal focus:outline-none"
            placeholder="Fecha"
          />
          <input
            type="text"
            value={draft.examType}
            onChange={(event) => setDraft((prev) => ({ ...prev, examType: event.target.value }))}
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink focus:border-brand-teal focus:outline-none"
            placeholder="Tipo"
          />
          <input
            type="text"
            value={draft.status}
            onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink focus:border-brand-teal focus:outline-none"
            placeholder="Estado"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="text"
            value={draft.location}
            onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))}
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink focus:border-brand-teal focus:outline-none"
            placeholder="Ubicación"
          />
          <input
            type="text"
            value={draft.result}
            onChange={(event) => setDraft((prev) => ({ ...prev, result: event.target.value }))}
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink focus:border-brand-teal focus:outline-none"
            placeholder="Resultado"
          />
          <input
            type="text"
            value={draft.notes}
            onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
            className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink focus:border-brand-teal focus:outline-none"
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
        {sortedExams.map((exam) => {
          const isEditing = editingId === exam.id;
          return (
            <article
              key={exam.id}
              className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-inner"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                    {formatDate(exam.examDate)}
                  </span>
                  <span className="text-sm font-semibold text-brand-deep">{exam.examType ?? "Sin tipo"}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdate(exam.id)}
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
                          setEditingId(exam.id);
                          setEditingDraft({
                            examDate: exam.examDate ?? "",
                            examType: exam.examType ?? "",
                            status: exam.status ?? "",
                            location: exam.location ?? "",
                            result: exam.result ?? "",
                            notes: exam.notes ?? "",
                          });
                        }}
                        className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(exam.id)}
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
                {isEditing ? (
                  <>
                    <input
                      type="date"
                      value={editingDraft.examDate}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, examDate: event.target.value }))}
                      className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-3 py-1 text-sm text-brand-ink focus:border-brand-teal focus:outline-none"
                    />
                    <input
                      type="text"
                      value={editingDraft.status}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, status: event.target.value }))}
                      className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-3 py-1 text-sm text-brand-ink focus:border-brand-teal focus:outline-none"
                      placeholder="Estado"
                    />
                    <input
                      type="text"
                      value={editingDraft.location}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, location: event.target.value }))}
                      className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-3 py-1 text-sm text-brand-ink focus:border-brand-teal focus:outline-none"
                      placeholder="Ubicación"
                    />
                    <input
                      type="text"
                      value={editingDraft.result}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, result: event.target.value }))}
                      className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-3 py-1 text-sm text-brand-ink focus:border-brand-teal focus:outline-none"
                      placeholder="Resultado"
                    />
                    <textarea
                      value={editingDraft.notes}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, notes: event.target.value }))}
                      rows={3}
                      className="md:col-span-2 w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-3 py-2 text-sm text-brand-ink focus:border-brand-teal focus:outline-none"
                    />
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-1 rounded-2xl bg-white/90 p-4">
                      <span className="text-xs uppercase tracking-wide text-brand-ink-muted">Estado</span>
                      <span className="text-sm text-brand-ink">{exam.status ?? "Sin estado"}</span>
                    </div>
                    <div className="flex flex-col gap-1 rounded-2xl bg-white/90 p-4">
                      <span className="text-xs uppercase tracking-wide text-brand-ink-muted">Ubicación</span>
                      <span className="text-sm text-brand-ink">{exam.location ?? "No registrada"}</span>
                    </div>
                    <div className="flex flex-col gap-1 rounded-2xl bg-white/90 p-4">
                      <span className="text-xs uppercase tracking-wide text-brand-ink-muted">Resultado</span>
                      <span className="text-sm text-brand-ink">{exam.result ?? "Pendiente"}</span>
                    </div>
                    <div className="flex flex-col gap-1 rounded-2xl bg-white/90 p-4 md:col-span-2">
                      <span className="text-xs uppercase tracking-wide text-brand-ink-muted">Notas</span>
                      <span className="text-sm text-brand-ink">{exam.notes ?? "—"}</span>
                    </div>
                  </>
                )}
              </div>
            </article>
          );
        })}
        {!sortedExams.length && (
          <p className="rounded-[28px] border border-dashed border-brand-ink-muted/40 bg-white/95 px-5 py-6 text-center text-sm text-brand-ink-muted">
            No hay exámenes asignados todavía.
          </p>
        )}
      </div>
    </section>
  );
}

export function ExamsPanelSkeleton() {
  return (
    <section className="flex animate-pulse flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-col gap-2">
        <span className="h-3 w-32 rounded-full bg-brand-deep-soft/60" />
        <span className="h-6 w-28 rounded-full bg-brand-deep-soft/80" />
        <span className="h-3 w-60 rounded-full bg-brand-deep-soft/50" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-2xl bg-white/95 p-4 shadow-inner">
            <span className="h-3 w-24 rounded-full bg-brand-deep-soft/40" />
            <span className="h-8 w-full rounded-xl bg-brand-deep-soft/30" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-2xl bg-white/95 p-4 shadow-inner">
            <span className="h-4 w-32 rounded-full bg-brand-deep-soft/40" />
            <span className="h-12 w-full rounded-xl bg-brand-deep-soft/30" />
          </div>
        ))}
      </div>
    </section>
  );
}
