"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { EphemeralToast } from "@/components/ui/ephemeral-toast";

type DeleteStudentButtonProps = {
  studentId: number;
  studentName: string;
};

export function DeleteStudentButton({
  studentId,
  studentName,
}: DeleteStudentButtonProps) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const openDialog = () => {
    setError(null);
    setIsConfirmOpen(true);
  };

  const closeDialog = () => {
    if (isDeleting) return;
    setIsConfirmOpen(false);
    setError(null);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: "DELETE",
      });

      const payload = (await response
        .json()
        .catch(() => ({}))) as { error?: string; fullName?: string };

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "No se pudo eliminar al estudiante. Intenta nuevamente.",
        );
      }

      const removedName = payload.fullName?.trim().length
        ? payload.fullName
        : studentName;

      setToast({
        tone: "success",
        message: `${removedName} fue eliminado.`,
      });

      setTimeout(() => {
        router.push(
          `/administracion/gestion-estudiantes?studentDeleted=${encodeURIComponent(
            removedName,
          )}`,
        );
        router.refresh();
      }, 600);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo eliminar al estudiante. Intenta nuevamente.";
      setError(message);
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
    setIsConfirmOpen(false);
  };

  return (
    <>
      {toast ? (
        <EphemeralToast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      ) : null}

      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-brand-ink/90 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
      >
        Eliminar estudiante
      </button>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[32px] border border-white/70 bg-white/95 p-6 text-left text-brand-ink shadow-[0_28px_64px_rgba(15,23,42,0.22)]">
            <div className="flex flex-col gap-5">
              <header className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-ink-muted">
                  Acción irreversible
                </span>
                <h2 className="text-2xl font-black text-brand-deep">
                  ¿Eliminar a {studentName}?
                </h2>
                <p className="text-sm text-brand-ink-muted">
                  Esta acción eliminará al estudiante y sus registros asociados. No podrás recuperar la información una vez confirmada.
                </p>
              </header>

              {error ? (
                <div className="rounded-3xl border border-brand-orange bg-white/85 px-4 py-3 text-sm font-medium text-brand-ink">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/30 bg-white px-5 py-2 text-sm font-semibold uppercase tracking-wide text-brand-ink transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-orange px-6 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#ff6a00] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DeleteStudentButton;
