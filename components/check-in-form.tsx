"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LevelLessons, StudentName } from "@/app/db";

type Props = {
  students: StudentName[];
  levels: LevelLessons[];
  disabled?: boolean;
  initialError?: string | null;
};

type StatusState = {
  type: "error" | "success";
  message: string;
} | null;

export function CheckInForm({
  students,
  levels,
  disabled = false,
  initialError = null,
}: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [status, setStatus] = useState<StatusState>(
    initialError ? { type: "error", message: initialError } : null,
  );
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lessonsForLevel = useMemo(() => {
    return (
      levels.find((level) => level.level === selectedLevel)?.lessons ?? []
    );
  }, [levels, selectedLevel]);

  const isFormDisabled = disabled || Boolean(initialError) || !levels.length;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isFormDisabled) {
      setStatus({
        type: "error",
        message:
          initialError ??
          "El registro no está disponible en este momento. Consulta con un asesor.",
      });
      return;
    }

    setStatus(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setStatus({ type: "error", message: "Ingresa tu nombre tal como aparece en la lista." });
      return;
    }
    if (!selectedLevel) {
      setStatus({ type: "error", message: "Selecciona tu nivel antes de continuar." });
      return;
    }
    if (!selectedLesson) {
      setStatus({ type: "error", message: "Elige la lección correspondiente a tu nivel." });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: trimmedName,
          level: selectedLevel,
          lessonId: Number(selectedLesson),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo registrar tu asistencia.");
      }

      setStatus({
        type: "success",
        message: "¡Listo! Prepárate para comenzar tu clase.",
      });

      startTransition(() => {
        const targetName = encodeURIComponent(trimmedName);
        router.push(`/?saludo=1&nombre=${targetName}`);
      });
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No logramos registrar tu asistencia. Inténtalo de nuevo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-6 rounded-[32px] border border-[rgba(0,191,166,0.16)] bg-white/80 px-8 py-10 shadow-2xl backdrop-blur-lg"
      onSubmit={handleSubmit}
    >
      <header className="flex flex-col gap-1 text-left">
        <h1 className="text-3xl font-bold text-brand-deep">
          Registro de asistencia
        </h1>
        <p className="text-brand-ink-muted">
          Busca tu nombre, elige el nivel y confirma la lección para unirte a la clase.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold uppercase tracking-wide text-brand-deep" htmlFor="student-name">
          Nombre del estudiante
        </label>
        <input
          id="student-name"
          name="student-name"
          list="student-names"
          autoComplete="off"
          placeholder="Escribe y elige tu nombre"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="w-full rounded-full border border-[rgba(0,191,166,0.18)] bg-white px-6 py-3 text-base text-brand-ink shadow focus:border-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isFormDisabled}
        />
        <datalist id="student-names">
          {students.map((student) => (
            <option key={student.fullName} value={student.fullName} />
          ))}
        </datalist>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wide text-brand-deep" htmlFor="level">
            Nivel
          </label>
          <select
            id="level"
            value={selectedLevel}
            onChange={(event) => {
              setSelectedLevel(event.target.value);
              setSelectedLesson("");
            }}
            className="w-full rounded-full border border-[rgba(0,191,166,0.18)] bg-white px-5 py-3 text-base text-brand-ink shadow focus:border-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isFormDisabled}
          >
            <option value="">Selecciona tu nivel</option>
            {levels.map((level) => (
              <option key={level.level} value={level.level}>
                {level.level}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold uppercase tracking-wide text-brand-deep">
            Lección
          </span>
          <input type="hidden" name="lessonId" value={selectedLesson} />
          {!selectedLevel ? (
            <div className="rounded-3xl border border-dashed border-[rgba(0,191,166,0.35)] bg-white/70 px-4 py-3 text-sm text-brand-ink-muted">
              Elige primero tu nivel para ver las lecciones disponibles.
            </div>
          ) : !lessonsForLevel.length ? (
            <div className="rounded-3xl border border-brand-orange bg-white/70 px-4 py-3 text-sm text-brand-ink">
              Aún no hay lecciones disponibles para este nivel. Nuestro equipo lo resolverá en breve.
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {lessonsForLevel.map((lesson) => {
                const value = lesson.id.toString();
                const isSelected = selectedLesson === value;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedLesson(value)}
                    className={`group flex min-w-[110px] flex-col items-start gap-1 rounded-full border px-5 py-2.5 text-left text-sm font-semibold transition ${
                      isSelected
                        ? "border-[#00bfa6] bg-[rgba(0,191,166,0.14)] text-brand-deep shadow"
                        : "border-[rgba(30,27,50,0.12)] bg-white/90 text-brand-ink-soft hover:border-[#00bfa6] hover:text-brand-deep"
                    }`}
                    disabled={isFormDisabled}
                    aria-pressed={isSelected}
                  >
                    <span>{lesson.lesson}</span>
                    <span className="text-xs font-medium text-brand-teal">
                      {lesson.sequence ? `#${lesson.sequence}` : lesson.level}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {!levels.length && !initialError && (
        <div className="rounded-3xl border border-brand-orange bg-white/75 px-5 py-3 text-sm font-medium text-brand-ink">
          Aún no hay lecciones disponibles para seleccionar. Nuestro equipo lo resolverá en breve.
        </div>
      )}

      {status && (
        <div
          className={`rounded-3xl border px-5 py-3 text-sm font-medium ${
            status.type === "success"
              ? "border-[rgba(0,191,166,0.45)] bg-[rgba(0,191,166,0.12)] text-brand-deep"
              : "border-brand-orange bg-white/75 text-brand-ink"
          }`}
        >
          {status.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || isPending || isFormDisabled}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-8 py-4 text-lg font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#ff6a00] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting || isPending ? "Registrando…" : "Confirmar asistencia"}
      </button>
    </form>
  );
}
