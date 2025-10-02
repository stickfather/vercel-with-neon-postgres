"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LevelLessons, StudentDirectoryEntry } from "@/app/db";
import { getLevelAccent } from "@/components/level-colors";

function hexToRgba(hex: string, alpha: number) {
  let normalized = hex.trim();
  if (normalized.startsWith("#")) {
    normalized = normalized.slice(1);
  }

  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (normalized.length !== 6) {
    return hex;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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

      await new Promise((resolve) => setTimeout(resolve, 650));

      startTransition(() => {
        router.push("/");
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
      className="registro-card relative flex flex-col gap-9 rounded-[48px] border-2 border-[#ffcaa1] bg-white px-12 py-14 shadow-[0_28px_64px_rgba(15,23,42,0.14)]"
      onSubmit={handleSubmit}
    >
      <div className="pointer-events-none absolute -top-6 left-12 hidden h-20 w-20 -rotate-3 rounded-[28px] bg-[#ffe1ec]/70 blur-2xl sm:block" />
      <div className="pointer-events-none absolute -bottom-10 right-16 hidden h-24 w-24 rotate-6 rounded-[30px] bg-[#59d4c3]/45 blur-2xl lg:block" />
      <header className="flex flex-col gap-1 text-left">
        <h1 className="text-3xl font-black text-brand-deep">Registro de asistencia</h1>
        <p className="max-w-lg text-xs text-brand-ink-muted md:text-sm">
          Busca tu nombre, elige tu nivel y pisa fuerte en la ruta de lecciones.
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
            className="w-full rounded-3xl border-2 border-[#ffe2c8] bg-[#fffaf5] px-6 py-4 text-base text-brand-ink shadow-inner focus:border-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isFormDisabled}
          />
          {showSuggestions && filteredStudents.length > 0 && (
            <ul className="absolute z-10 mt-2 max-h-56 w-full overflow-y-auto rounded-3xl border border-white/60 bg-white/95 p-2 text-sm shadow-2xl">
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
                    className={`flex w-full items-center justify-between gap-4 rounded-2xl px-3 py-2 text-left transition hover:bg-[#fff0e0] ${
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
        <div className="level-runway flex snap-x gap-4 overflow-x-auto pb-2">
          {levels.map((level) => {
            const isSelected = selectedLevel === level.level;
            const accent = getLevelAccent(level.level);
            return (
              <button
                key={level.level}
                type="button"
                className="group relative flex min-h-[96px] min-w-[120px] shrink-0 snap-center flex-col items-center justify-center rounded-[28px] border-[3px] px-6 text-3xl font-black uppercase tracking-wide transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                style={{
                  borderColor: accent.primary,
                  backgroundColor: isSelected ? accent.background : "#ffffff",
                  color: accent.primary,
                  boxShadow: isSelected
                    ? "0 22px 38px rgba(0,0,0,0.16)"
                    : "0 6px 20px rgba(31,27,36,0.08)",
                }}
                onClick={() => {
                  setSelectedLevel(level.level);
                  setLessonLocked(false);
                }}
                disabled={isFormDisabled}
              >
                <span className="leading-none">{level.level}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold uppercase tracking-wide text-brand-deep">
          Lección
        </span>
        <div className="lesson-grid grid gap-x-10 gap-y-12 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {lessonsForLevel.map((lesson, index) => {
            const isSelected = selectedLesson === lesson.id.toString();
            const accent = getLevelAccent(selectedLevel || lesson.level);
            const showTrail = index !== lessonsForLevel.length - 1;
            const isLongLabel = lesson.lesson.length > 18;
            const pawStrong = hexToRgba(accent.primary, 0.55);
            const pawSoft = hexToRgba(accent.primary, 0.35);
            return (
              <div
                key={lesson.id}
                className="lesson-step relative flex flex-col items-center xl:pr-12"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLesson(lesson.id.toString());
                    setLessonLocked(true);
                  }}
                  disabled={isFormDisabled}
                  className={`lesson-stop flex h-full w-full min-h-[128px] min-w-[180px] flex-col items-center justify-center gap-2 rounded-[28px] border-[3px] px-7 py-6 text-center shadow-lg transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${
                    isLongLabel ? "text-sm leading-snug" : "text-base"
                  }`}
                  style={{
                    borderColor: accent.primary,
                    backgroundColor: isSelected ? accent.background : "#fffdf9",
                    color: accent.primary,
                    boxShadow: isSelected
                      ? "0 22px 36px rgba(0,0,0,0.14)"
                      : "0 8px 22px rgba(31,27,36,0.08)",
                  }}
                >
                  <span className="font-black uppercase tracking-wide leading-tight">
                    {lesson.lesson}
                  </span>
                </button>
                {showTrail && (
                  <span
                    aria-hidden
                    className="lesson-footprints"
                    style={{
                      backgroundImage: `radial-gradient(circle at 22% 68%, ${pawStrong} 0, ${pawStrong} 44%, transparent 46%), radial-gradient(circle at 44% 32%, ${pawSoft} 0, ${pawSoft} 42%, transparent 46%), radial-gradient(circle at 64% 82%, ${pawStrong} 0, ${pawStrong} 42%, transparent 46%), radial-gradient(circle at 90% 24%, ${pawSoft} 0, ${pawSoft} 40%, transparent 44%)`,
                    }}
                  />
                )}
              </div>
            );
          })}
          {!lessonsForLevel.length && (
            <p
              className="rounded-[28px] border border-dashed border-brand-orange bg-white/80 px-4 py-4 text-sm text-brand-ink"
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
        className="cta-ripple mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-10 py-5 text-lg font-semibold uppercase tracking-wide text-white shadow-[0_22px_40px_rgba(255,122,35,0.32)] disabled:cursor-not-allowed disabled:opacity-70"
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
        <div className="rounded-[32px] bg-white/80 px-6 py-4 text-sm text-brand-ink-muted shadow-inner">
          <h2 className="mb-2 text-base font-semibold uppercase tracking-wide text-brand-deep">
            Pasos rápidos
          </h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            <li>Busca tu nombre y selecciónalo de la lista.</li>
            <li>Elige tu nivel tocando una de las tarjetas disponibles.</li>
            <li>Explora la ruta de lecciones y elige la tuya.</li>
            <li>Toca "Confirmar asistencia" y prepárate para tu clase.</li>
          </ol>
        </div>
      )}

      <button type="submit" hidden aria-hidden />
    </form>
  );
}
