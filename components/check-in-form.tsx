"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LevelLessons, StudentDirectoryEntry } from "@/app/db";
import { getLevelAccent } from "@/components/level-colors";

type Props = {
  students: StudentDirectoryEntry[];
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [status, setStatus] = useState<StatusState>(
    initialError ? { type: "error", message: initialError } : null,
  );
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lessonLocked, setLessonLocked] = useState(false);

  const studentMap = useMemo(() => {
    const map = new Map<number, StudentDirectoryEntry & { normalized: string }>();
    for (const student of students) {
      map.set(student.id, {
        ...student,
        normalized: student.fullName.trim().toLowerCase(),
      });
    }
    return map;
  }, [students]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredStudents = useMemo(() => {
    if (!normalizedSearch) {
      return students.slice(0, 8);
    }
    return students
      .filter((student) => student.fullName.toLowerCase().includes(normalizedSearch))
      .slice(0, 8);
  }, [students, normalizedSearch]);

  const selectedStudent = selectedStudentId
    ? studentMap.get(selectedStudentId) ?? null
    : null;

  useEffect(() => {
    if (!selectedStudent) {
      setSelectedLevel("");
      return;
    }

    if (selectedStudent.lastLessonLevel) {
      setSelectedLevel(selectedStudent.lastLessonLevel);
    } else {
      setSelectedLevel("");
    }
  }, [selectedStudent]);

  const lessonsForLevel = useMemo(() => {
    return (
      levels.find((level) => level.level === selectedLevel)?.lessons ?? []
    );
  }, [levels, selectedLevel]);

  const suggestedLessonId = useMemo(() => {
    if (!selectedLevel || !lessonsForLevel.length) {
      return null;
    }

    if (!selectedStudent) {
      return lessonsForLevel[0]?.id ?? null;
    }

    const lastLevel = selectedStudent.lastLessonLevel?.trim().toLowerCase();
    const lastSequence = selectedStudent.lastLessonSequence;

    if (!lastLevel || lastLevel !== selectedLevel.trim().toLowerCase()) {
      return lessonsForLevel[0]?.id ?? null;
    }

    if (lastSequence === null) {
      return lessonsForLevel[0]?.id ?? null;
    }

    const nextLesson = lessonsForLevel.find((lesson) => {
      if (lesson.sequence === null) {
        return false;
      }
      return lesson.sequence > lastSequence;
    });

    return (nextLesson ?? lessonsForLevel[0] ?? null)?.id ?? null;
  }, [lessonsForLevel, selectedLevel, selectedStudent]);

  useEffect(() => {
    if (!lessonLocked) {
      if (suggestedLessonId) {
        setSelectedLesson(suggestedLessonId.toString());
      } else {
        setSelectedLesson("");
      }
    }
  }, [lessonLocked, suggestedLessonId]);

  useEffect(() => {
    setLessonLocked(false);
  }, [selectedLevel, selectedStudentId]);

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

    if (!selectedStudentId) {
      setStatus({
        type: "error",
        message: "Selecciona tu nombre desde la lista para continuar.",
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
        message: "¡Asistencia confirmada, buen trabajo!",
      });

      const nextName = payload?.studentName ?? selectedStudent?.fullName ?? "";
      const targetName = encodeURIComponent(nextName);

      await new Promise((resolve) => setTimeout(resolve, 650));

      startTransition(() => {
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
      className="flex flex-col gap-7 rounded-[36px] border border-[#ffe0c2] bg-white px-10 py-12 shadow-xl"
      onSubmit={handleSubmit}
    >
      <header className="flex flex-col gap-1 text-left">
        <h1 className="text-3xl font-bold text-brand-deep">Registro de asistencia</h1>
        <p className="text-xs text-brand-ink-muted md:text-sm">
          Busca tu nombre, elige el nivel y confirma la lección para unirte a la clase.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold uppercase tracking-wide text-brand-deep">
          Nombre del estudiante
        </label>
        <div className="relative">
          <input
            id="student-name"
            name="student-name"
            autoComplete="off"
            placeholder="Busca tu nombre"
            value={searchTerm}
            onChange={(event) => {
              const value = event.target.value;
              setSearchTerm(value);

              const normalizedValue = value.trim().toLowerCase();
              const exactMatch = normalizedValue
                ? students.find(
                    (student) =>
                      student.fullName.trim().toLowerCase() === normalizedValue,
                  )
                : null;

              setSelectedStudentId(exactMatch ? exactMatch.id : null);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 120);
            }}
            className="w-full rounded-2xl border border-transparent bg-white px-6 py-3 text-base text-brand-ink shadow focus:border-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isFormDisabled}
          />
          {showSuggestions && filteredStudents.length > 0 && (
            <ul className="absolute z-10 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-white/60 bg-white/95 p-2 text-sm shadow-2xl">
              {filteredStudents.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setSearchTerm(student.fullName);
                      setSelectedStudentId(student.id);
                      setLessonLocked(false);
                      setShowSuggestions(false);
                    }}
                    className={`flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2 text-left transition hover:bg-[#fff0e0] ${
                      student.id === selectedStudentId
                        ? "bg-[#ffe3c9] text-brand-deep"
                        : "text-brand-ink"
                    }`}
                  >
                    <span className="font-medium">{student.fullName}</span>
                    {student.lastLessonLevel && (
                      <span className="text-xs uppercase tracking-wide text-brand-ink-muted">
                        Último nivel: {student.lastLessonLevel}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-brand-deep">
          Nivel
        </span>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {levels.map((level) => {
            const isSelected = selectedLevel === level.level;
            const accent = getLevelAccent(level.level);
            return (
              <button
                key={level.level}
                type="button"
                className={`group relative flex min-h-[56px] items-center justify-center rounded-2xl border-2 text-sm font-semibold uppercase tracking-wide transition ${
                  isSelected
                    ? "text-brand-deep"
                    : "text-brand-deep"
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: accent.background,
                        borderColor: accent.primary,
                        color: accent.primary,
                      }
                    : {
                        borderColor: "transparent",
                        backgroundColor: "rgba(255,255,255,0.92)",
                      }
                }
                onClick={() => {
                  setSelectedLevel(level.level);
                  setLessonLocked(false);
                }}
                disabled={isFormDisabled}
              >
                {level.level}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-brand-deep">
          Lección
        </span>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lessonsForLevel.map((lesson) => {
            const isSelected = selectedLesson === lesson.id.toString();
            const accent = getLevelAccent(selectedLevel || lesson.level);
            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => {
                  setSelectedLesson(lesson.id.toString());
                  setLessonLocked(true);
                }}
                disabled={isFormDisabled}
                className="flex min-h-[74px] flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                style={
                  isSelected
                    ? {
                        borderColor: accent.primary,
                        backgroundColor: accent.background,
                        color: accent.primary,
                      }
                    : {
                        borderColor: "rgba(255,255,255,0.7)",
                        backgroundColor: "rgba(255,255,255,0.95)",
                        color: "#1e1b32",
                      }
                }
              >
                <span className="text-sm font-semibold uppercase tracking-wide">
                  {lesson.lesson}
                </span>
              </button>
            );
          })}
          {!lessonsForLevel.length && (
            <p
              className="rounded-2xl border border-dashed bg-white/80 px-4 py-4 text-sm text-brand-ink"
              style={{ borderColor: "rgba(255, 122, 35, 0.45)" }}
            >
              Selecciona un nivel para ver las lecciones disponibles.
            </p>
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
              ? "border-brand-teal bg-[#e1f7f3] text-brand-deep"
              : "border-brand-orange bg-white/75 text-brand-ink"
          }`}
        >
          <span className="flex items-center gap-3">
            {status.type === "success" && (
              <span className="checkmark-pop flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal text-white">
                ✓
              </span>
            )}
            {status.message}
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || isPending || isFormDisabled}
        className="cta-ripple mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-8 py-4 text-lg font-semibold uppercase tracking-wide text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting || isPending ? "Registrando…" : "Confirmar asistencia"}
      </button>

      <button
        type="button"
        onClick={() => setShowHelp((previous) => !previous)}
        className="text-sm font-semibold text-brand-ink-muted underline-offset-4 hover:text-brand-teal hover:underline"
      >
        {showHelp ? "Ocultar pasos" : "¿Cómo funciona?"}
      </button>

      {showHelp && (
        <div className="rounded-[28px] bg-white/80 px-6 py-4 text-sm text-brand-ink-muted shadow-inner">
          <h2 className="mb-2 text-base font-semibold uppercase tracking-wide text-brand-deep">
            Pasos rápidos
          </h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            <li>Busca tu nombre y selecciónalo de la lista.</li>
            <li>Elige tu nivel tocando una de las tarjetas disponibles.</li>
            <li>Confirma la lección sugerida o selecciona otra.</li>
            <li>Toca "Confirmar asistencia" y prepárate para tu clase.</li>
          </ol>
        </div>
      )}

      <button type="submit" hidden aria-hidden />
    </form>
  );
}
