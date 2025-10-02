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
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
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

    if (!selectedStudentId) {
      setStatus({
        type: "error",
        message: "Selecciona un nombre válido de la lista desplegable.",
      });
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
          studentId: selectedStudentId,
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
      className="flex flex-col gap-6 rounded-[32px] bg-white/85 px-8 py-10 shadow-2xl backdrop-blur"
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
          onChange={(event) => {
            const value = event.target.value;
            setFullName(value);

            const normalizedValue = value.trim().toLowerCase();
            const match =
              normalizedValue.length === 0
                ? null
                : students.find(
                    (student) =>
                      student.fullName.trim().toLowerCase() === normalizedValue,
                  );

            setSelectedStudentId(match ? match.id : null);
          }}
          className="w-full rounded-full border border-transparent bg-white px-6 py-3 text-base text-brand-ink shadow focus:border-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isFormDisabled}
        />
        <datalist id="student-names">
          {students.map((student) => (
            <option key={student.id} value={student.fullName} />
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
            className="w-full rounded-full border border-transparent bg-white px-5 py-3 text-base text-brand-ink shadow focus:border-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
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

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wide text-brand-deep" htmlFor="lesson">
            Lección
          </label>
          <select
            id="lesson"
            value={selectedLesson}
            onChange={(event) => setSelectedLesson(event.target.value)}
            disabled={isFormDisabled || !lessonsForLevel.length}
            className="w-full rounded-full border border-transparent bg-white px-5 py-3 text-base text-brand-ink shadow disabled:cursor-not-allowed disabled:opacity-60 focus:border-[#00bfa6]"
          >
            <option value="">
              {selectedLevel ? "Selecciona la lección" : "Elige primero tu nivel"}
            </option>
            {lessonsForLevel.map((lesson) => (
              <option key={lesson.id} value={lesson.id.toString()}>
                {lesson.lesson}
              </option>
            ))}
          </select>
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
              ? "border-brand-teal bg-white/80 text-brand-ink"
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
