"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { StudentExam } from "@/features/administration/data/student-profile";

type Props = {
  studentId: number;
  exams: StudentExam[];
};

type ActiveRequest = "create" | "edit" | "delete" | null;

type AddFormState = {
  scheduledAt: string;
  examType: string;
  grade: string;
  note: string;
};

type EditFormState = {
  grade: string;
  isCompleted: boolean;
  note: string;
};

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

const INITIAL_ADD_FORM: AddFormState = {
  scheduledAt: "",
  examType: "",
  grade: "",
  note: "",
};

const INITIAL_EDIT_FORM: EditFormState = {
  grade: "",
  isCompleted: false,
  note: "",
};

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

function parseScore(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  return parsed;
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

export function ExamsPanel({ studentId, exams }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<StudentExam[]>(exams);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeRequest, setActiveRequest] = useState<ActiveRequest>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>(INITIAL_ADD_FORM);
  const [editingExam, setEditingExam] = useState<StudentExam | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(INITIAL_EDIT_FORM);

  useEffect(() => {
    setItems(exams);
  }, [exams]);

  const sortedExams = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = a.timeScheduled ?? "";
      const bDate = b.timeScheduled ?? "";
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
    setEditingExam(null);
    setEditForm(INITIAL_EDIT_FORM);
  };

  const openAddModal = () => {
    setError(null);
    setMessage(null);
    setAddForm(INITIAL_ADD_FORM);
    setIsAddOpen(true);
  };

  const openEditModal = (exam: StudentExam) => {
    setError(null);
    setMessage(null);
    setEditingExam(exam);
    setEditForm({
      grade: exam.score == null ? "" : String(exam.score),
      isCompleted: exam.passed,
      note: exam.notes ?? "",
    });
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeRequest) return;

    if (!addForm.scheduledAt.trim()) {
      setError("Debes indicar la fecha y hora programada.");
      return;
    }

    if (!addForm.examType.trim()) {
      setError("Selecciona el tipo de examen.");
      return;
    }

    const scoreNumber = parseScore(addForm.grade);
    if (addForm.grade.trim() && scoreNumber == null) {
      setError("La calificación debe ser numérica.");
      return;
    }

    setError(null);
    setMessage(null);
    setActiveRequest("create");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/exams`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              timeScheduled: addForm.scheduledAt.trim(),
              status: addForm.examType.trim(),
              score: scoreNumber,
              passed: false,
              notes: addForm.note.trim() || null,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo crear el examen.");
          }
          setItems((previous) => [payload as StudentExam, ...previous]);
          setMessage("Examen creado.");
          closeAddModal();
          router.refresh();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo crear el examen. Inténtalo nuevamente.",
          );
        } finally {
          setActiveRequest(null);
        }
      })();
    });
  };

  const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingExam || activeRequest) return;

    const scoreNumber = parseScore(editForm.grade);
    if (editForm.grade.trim() && scoreNumber == null) {
      setError("La calificación debe ser numérica.");
      return;
    }

    setError(null);
    setMessage(null);
    setActiveRequest("edit");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/students/${studentId}/exams/${editingExam.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                timeScheduled: editingExam.timeScheduled,
                status: editingExam.status,
                score: scoreNumber,
                passed: editForm.isCompleted,
                notes: editForm.note.trim() || null,
              }),
            },
          );
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo actualizar el examen.");
          }
          const updatedExam = payload as StudentExam;
          setItems((previous) =>
            previous.map((item) => (item.id === updatedExam.id ? updatedExam : item)),
          );
          setMessage("Examen actualizado.");
          closeEditModal();
          router.refresh();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo actualizar el examen. Inténtalo nuevamente.",
          );
        } finally {
          setActiveRequest(null);
        }
      })();
    });
  };

  const handleDelete = async (examId: number) => {
    if (activeRequest) return;
    const confirmation = globalThis.confirm?.("¿Eliminar este examen?");
    if (!confirmation) return;

    setError(null);
    setMessage(null);
    setActiveRequest("delete");

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
          const deletedExam = payload as StudentExam | null;
          setItems((previous) =>
            previous.filter((item) => item.id !== (deletedExam?.id ?? examId)),
          );
          setMessage("Examen eliminado.");
          router.refresh();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo eliminar el examen. Inténtalo nuevamente.",
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
        <h2 className="text-2xl font-bold text-brand-deep">Exámenes</h2>
        <p className="text-sm text-brand-ink-muted">
          Registra la programación de evaluaciones y su resultado para seguir el avance académico.
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
          Agregar examen
        </button>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-inner">
        <table className="min-w-full table-auto divide-y divide-brand-ink-muted/15 text-left text-sm text-brand-ink">
          <thead className="bg-brand-teal-soft/40 text-xs uppercase tracking-wide text-brand-ink">
            <tr>
              <th className="px-4 py-3 font-semibold text-brand-deep">Fecha y hora</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Tipo de examen</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Calificación</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Estado</th>
              <th className="px-4 py-3 font-semibold text-brand-deep">Nota</th>
              <th className="px-4 py-3 text-right font-semibold text-brand-deep">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedExams.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-brand-ink-muted">
                  No hay exámenes registrados. Usa el botón “Agregar examen” para programar el primero.
                </td>
              </tr>
            ) : (
              sortedExams.map((exam) => (
                <tr key={exam.id} className="divide-x divide-brand-ink-muted/10">
                  <td className="px-4 py-3 align-top font-semibold text-brand-deep">
                    {formatDateTime(exam.timeScheduled)}
                  </td>
                  <td className="px-4 py-3 align-top text-brand-ink">
                    {exam.status ? exam.status : "Sin tipo"}
                  </td>
                  <td className="px-4 py-3 align-top text-brand-ink">
                    {exam.score == null ? "—" : exam.score}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`inline-flex min-w-[80px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                        exam.passed
                          ? "bg-brand-teal-soft text-brand-teal"
                          : "bg-brand-ink-muted/15 text-brand-ink"
                      }`}
                    >
                      {exam.passed ? "Completado" : "Pendiente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-brand-ink">
                    {exam.notes ? exam.notes : "—"}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(exam)}
                        className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(exam.id)}
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
          title="Agregar examen"
          description="Programa un nuevo examen indicando fecha, hora y tipo de evaluación."
          onClose={closeAddModal}
        >
          <form className="flex flex-col gap-4" onSubmit={handleCreate}>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Fecha y hora del examen
              <input
                type="datetime-local"
                value={addForm.scheduledAt}
                onChange={(event) =>
                  setAddForm((previous) => ({ ...previous, scheduledAt: event.target.value }))
                }
                className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Tipo de examen
              <input
                type="text"
                value={addForm.examType}
                onChange={(event) =>
                  setAddForm((previous) => ({ ...previous, examType: event.target.value }))
                }
                className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                placeholder="Ej. Placement, Final, Nivel"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Calificación (opcional)
              <input
                type="number"
                step="0.01"
                value={addForm.grade}
                onChange={(event) =>
                  setAddForm((previous) => ({ ...previous, grade: event.target.value }))
                }
                className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
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
                placeholder="Añade detalles o requisitos"
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

      {editingExam && (
        <Modal
          title="Editar examen"
          description="Registra la calificación, el estado de finalización y notas complementarias."
          onClose={closeEditModal}
        >
          <form className="flex flex-col gap-4" onSubmit={handleUpdate}>
            <div className="grid gap-3 rounded-2xl bg-white/90 p-4 shadow-inner sm:grid-cols-2">
              <div className="flex flex-col gap-1 text-left text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                Fecha programada
                <span className="text-sm font-semibold text-brand-deep">
                  {formatDateTime(editingExam.timeScheduled)}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-left text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                Tipo de examen
                <span className="text-sm font-semibold text-brand-deep">
                  {editingExam.status || "Sin tipo"}
                </span>
              </div>
            </div>
            <label className="flex flex-col gap-1 text-left text-sm font-semibold text-brand-deep">
              Calificación (opcional)
              <input
                type="number"
                step="0.01"
                value={editForm.grade}
                onChange={(event) =>
                  setEditForm((previous) => ({ ...previous, grade: event.target.value }))
                }
                className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-inner">
              <span className="text-sm font-semibold text-brand-deep">Completado</span>
              <input
                type="checkbox"
                checked={editForm.isCompleted}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    isCompleted: event.target.checked,
                  }))
                }
                className="h-5 w-5 rounded border-brand-deep-soft text-brand-teal focus:ring-brand-teal"
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
                placeholder="Añade comentarios del examinador"
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

export function ExamsPanelSkeleton() {
  return (
    <section className="flex animate-pulse flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-col gap-2">
        <span className="h-3 w-24 rounded-full bg-brand-deep-soft/60" />
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
