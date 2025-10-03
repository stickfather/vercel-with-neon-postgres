"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type { LevelLessons, StudentName } from "@/features/student-checkin/data/queries";
import { getLevelAccent } from "@/features/student-checkin/lib/level-colors";

const SUGGESTION_LIMIT = 6;
const SUGGESTION_DEBOUNCE_MS = 220;

type Props = {
  levels: LevelLessons[];
  disabled?: boolean;
  initialError?: string | null;
  lessonsError?: string | null;
};

type StatusState = {
  type: "error" | "success";
  message: string;
} | null;

type FetchState = "idle" | "loading" | "error";

export function CheckInForm({
  levels,
  disabled = false,
  initialError = null,
  lessonsError = null,
}: Props) {
  const router = useRouter();
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentName | null>(null);
  const [suggestions, setSuggestions] = useState<StudentName[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(0);
  const [suggestionState, setSuggestionState] = useState<FetchState>("idle");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [status, setStatus] = useState<StatusState>(
    initialError ? { type: "error", message: initialError } : null,
  );
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFormDisabled = disabled || Boolean(initialError);

  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!isSuggestionsOpen) {
      setSuggestionState("idle");
      return;
    }

    const controller = new AbortController();
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = controller;

    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    setSuggestionState("loading");

    fetchTimeoutRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ limit: String(SUGGESTION_LIMIT) });
        if (studentQuery.trim()) {
          params.set("query", studentQuery.trim());
        }

        const response = await fetch(`/api/students?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("No se pudo obtener la lista de estudiantes.");
        }

        const payload = (await response.json()) as { students?: StudentName[] };
        if (controller.signal.aborted) return;

        setSuggestions(Array.isArray(payload.students) ? payload.students : []);
        setHighlightedSuggestion(0);
        setSuggestionState("idle");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("No se pudieron cargar sugerencias", error);
        setSuggestions([]);
        setSuggestionState("error");
      }
    }, SUGGESTION_DEBOUNCE_MS);

    return () => {
      controller.abort();
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [studentQuery, isSuggestionsOpen]);

  useEffect(() => {
    if (!selectedStudent) {
      setSelectedLevel("");
      setSelectedLesson("");
      return;
    }
    setSelectedLevel("");
    setSelectedLesson("");
  }, [selectedStudent?.id]);

  useEffect(() => {
    if (!selectedStudent) {
      return;
    }

    const trimmed = selectedStudent.fullName.trim();
    if (trimmed !== studentQuery.trim()) {
      setSelectedStudent(null);
    }
  }, [studentQuery, selectedStudent]);

  const lessonsForLevel = useMemo(() => {
    return levels.find((level) => level.level === selectedLevel)?.lessons ?? [];
  }, [levels, selectedLevel]);

  const sortedLessons = useMemo(() => {
    return [...lessonsForLevel].sort((a, b) => {
      const aSeq = a.sequence ?? Number.MAX_SAFE_INTEGER;
      const bSeq = b.sequence ?? Number.MAX_SAFE_INTEGER;
      return aSeq - bSeq;
    });
  }, [lessonsForLevel]);

  useEffect(() => {
    if (!selectedLevel) {
      setSelectedLesson("");
      return;
    }
    if (!sortedLessons.length) {
      setSelectedLesson("");
      return;
    }
    setSelectedLesson((previous) => {
      if (previous && sortedLessons.some((lesson) => lesson.id.toString() === previous)) {
        return previous;
      }
      const prioritized =
        sortedLessons.find((lesson) => lesson.sequence !== null) ?? sortedLessons[0];
      return prioritized.id.toString();
    });
  }, [selectedLevel, sortedLessons]);

  const canChooseProgression =
    Boolean(selectedStudent) && !disabled && !initialError && Boolean(levels.length);

  const handleSuggestionSelection = (student: StudentName) => {
    setStudentQuery(student.fullName);
    setSelectedStudent(student);
    setSuggestions([]);
    setIsSuggestionsOpen(false);
    setStatus(null);
  };

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

    const trimmedName = studentQuery.trim();
    if (!trimmedName) {
      setStatus({ type: "error", message: "Ingresa tu nombre tal como aparece en la lista." });
      return;
    }
    if (!selectedStudent) {
      setStatus({
        type: "error",
        message: "Selecciona tu nombre exactamente como aparece en la lista.",
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
          studentId: selectedStudent.id,
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
        message: "¡Asistencia confirmada, buen trabajo!",
      });

      startTransition(() => {
        const targetName = encodeURIComponent(selectedStudent.fullName.trim());
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

  const accent = getLevelAccent(selectedLevel);
  const isLoadingSuggestions = suggestionState === "loading";

  return (
    <form
      className="flex flex-col gap-7 rounded-[36px] border border-white/70 bg-white/92 px-9 py-11 text-left shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur"
      onSubmit={handleSubmit}
    >
      <header className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-deep-soft">
          Registro de asistencia
        </span>
        <h1 className="text-3xl font-black text-brand-deep">¡Marca tu llegada!</h1>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold uppercase tracking-wide text-brand-deep" htmlFor="student-name">
            Nombre del estudiante
          </label>
          <button
            type="button"
            className="text-xs font-semibold uppercase tracking-wide text-brand-teal underline-offset-4 hover:underline"
            onClick={() => setShowSteps((previous) => !previous)}
            aria-expanded={showSteps}
            aria-controls="quick-steps"
          >
            ¿Cómo funciona?
          </button>
        </div>
        <div className="relative">
          <input
            id="student-name"
            name="student-name"
            autoComplete="off"
            placeholder="Escribe y elige tu nombre"
            value={studentQuery}
            onChange={(event) => {
              setStudentQuery(event.target.value);
              setStatus(null);
              setIsSuggestionsOpen(true);
            }}
            onFocus={() => {
              setIsSuggestionsOpen(true);
            }}
            onBlur={() => {
              setTimeout(() => setIsSuggestionsOpen(false), 120);
            }}
            onKeyDown={(event) => {
              if (!suggestions.length) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setIsSuggestionsOpen(true);
                setHighlightedSuggestion((index) =>
                  index + 1 >= suggestions.length ? 0 : index + 1,
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setIsSuggestionsOpen(true);
                setHighlightedSuggestion((index) =>
                  index - 1 < 0 ? suggestions.length - 1 : index - 1,
                );
              } else if (event.key === "Enter" && isSuggestionsOpen) {
                const suggestion = suggestions[highlightedSuggestion];
                if (suggestion) {
                  event.preventDefault();
                  handleSuggestionSelection(suggestion);
                }
              }
            }}
            className="w-full rounded-full border border-transparent bg-white px-6 py-4 text-base text-brand-ink shadow focus:border-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
            aria-expanded={isSuggestionsOpen}
            aria-controls="student-suggestions"
            role="combobox"
            aria-autocomplete="list"
            aria-activedescendant={
              isSuggestionsOpen && suggestions[highlightedSuggestion]
                ? `student-option-${highlightedSuggestion}`
                : undefined
            }
            disabled={isFormDisabled}
            aria-busy={isLoadingSuggestions}
          />
          {isSuggestionsOpen && (
            <ul
              id="student-suggestions"
              role="listbox"
              className="absolute z-10 mt-2 w-full rounded-3xl border border-[rgba(30,27,50,0.15)] bg-white/95 p-2 shadow-xl"
            >
              {isLoadingSuggestions ? (
                <li className="px-4 py-3 text-sm text-brand-ink-muted">Cargando nombres…</li>
              ) : suggestions.length ? (
                suggestions.map((student, index) => {
                  const isActive = index === highlightedSuggestion;
                  return (
                    <li key={student.id} role="option" aria-selected={isActive} id={`student-option-${index}`}>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSuggestionSelection(student)}
                        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                          isActive
                            ? "bg-brand-teal-soft text-brand-deep"
                            : "text-brand-ink"
                        }`}
                      >
                        <span>{student.fullName}</span>
                        {isActive && (
                          <span className="text-xs font-semibold uppercase text-brand-teal">
                            Enter
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })
              ) : suggestionState === "error" ? (
                <li className="px-4 py-3 text-sm text-brand-ink">
                  No pudimos cargar sugerencias. Intenta nuevamente.
                </li>
              ) : (
                <li className="px-4 py-3 text-sm text-brand-ink">
                  No encontramos coincidencias.
                </li>
              )}
            </ul>
          )}
        </div>
        {showSteps && (
          <div
            id="quick-steps"
            className="rounded-[28px] border border-dashed border-brand-teal bg-white/70 px-5 py-4 text-sm text-brand-ink"
          >
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              <li>Busca tu nombre y selecciónalo de las sugerencias.</li>
              <li>Elige el nivel tocando la tarjeta correspondiente.</li>
              <li>Confirma la lección sugerida o cámbiala según corresponda.</li>
              <li>Presiona “Confirmar asistencia” para registrar tu ingreso.</li>
            </ol>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-brand-deep">Nivel</span>
          {canChooseProgression ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {levels.map((level) => {
                const levelAccent = getLevelAccent(level.level);
                const isActive = selectedLevel === level.level;
                return (
                  <button
                    key={level.level}
                    type="button"
                    onClick={() => {
                      setSelectedLevel(level.level);
                      setStatus(null);
                    }}
                    className={`flex min-h-[56px] items-center justify-between rounded-[22px] border px-5 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${
                      isActive
                        ? "border-transparent text-brand-deep"
                        : "border-[rgba(30,27,50,0.15)] text-brand-ink"
                    }`}
                    style={{
                      backgroundColor: isActive ? levelAccent.background : "rgba(255,255,255,0.85)",
                      boxShadow: isActive ? "0 14px 32px rgba(15,23,42,0.14)" : "0 6px 18px rgba(15,23,42,0.06)",
                    }}
                    aria-pressed={isActive}
                    disabled={isFormDisabled || !canChooseProgression}
                  >
                    <span className="text-lg font-black">{level.level}</span>
                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
                      style={{
                        backgroundColor: levelAccent.chipBackground,
                        color: levelAccent.primary,
                      }}
                    >
                      {level.lessons.length} lecciones
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-brand-teal bg-white/70 px-5 py-4 text-sm text-brand-ink">
              Selecciona primero tu nombre para ver los niveles disponibles.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-brand-deep">Lección</span>
          {selectedLevel && canChooseProgression ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {sortedLessons.map((lesson) => {
                const isActive = selectedLesson === lesson.id.toString();
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedLesson(lesson.id.toString())}
                    className={`flex min-h-[60px] flex-col items-start justify-center gap-1 rounded-[22px] border px-5 py-4 text-left text-sm transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${
                      isActive
                        ? "border-transparent text-brand-deep"
                        : "border-[rgba(30,27,50,0.15)] text-brand-ink"
                    }`}
                    style={{
                      backgroundColor: isActive ? accent.background : "rgba(255,255,255,0.88)",
                      boxShadow: isActive ? "0 14px 32px rgba(15,23,42,0.14)" : "0 6px 18px rgba(15,23,42,0.06)",
                    }}
                    aria-pressed={isActive}
                    disabled={
                      isFormDisabled || !sortedLessons.length || !canChooseProgression
                    }
                  >
                    <span className="text-sm font-semibold uppercase tracking-wide text-brand-deep-soft">
                      {lesson.sequence ? `Lección ${lesson.sequence}` : "Lección"}
                    </span>
                    <span className="text-base font-semibold">{lesson.lesson}</span>
                  </button>
                );
              })}
            </div>
          ) : canChooseProgression ? (
            <div className="rounded-[24px] border border-dashed border-brand-orange bg-white/75 px-5 py-4 text-sm text-brand-ink">
              Selecciona primero tu nivel para sugerirte la lección indicada.
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-brand-teal bg-white/70 px-5 py-4 text-sm text-brand-ink">
              Ingresa y confirma tu nombre para continuar con el registro.
            </div>
          )}
        </div>
      </div>

      {!levels.length && !initialError && (
        <div className="rounded-3xl border border-brand-orange bg-white/75 px-5 py-3 text-sm font-medium text-brand-ink">
          {lessonsError ??
            "Aún no hay lecciones disponibles para seleccionar. Nuestro equipo lo resolverá en breve."}
        </div>
      )}

      {status && (
        <div
          className={`flex items-center gap-3 rounded-3xl border px-5 py-4 text-sm font-medium ${
            status.type === "success"
              ? "border-brand-teal bg-white/85 text-brand-ink"
              : "border-brand-orange bg-white/80 text-brand-ink"
          }`}
          role="status"
          aria-live="polite"
        >
          {status.type === "success" ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-teal text-white shadow-md animate-checkmark">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4 10-10" />
              </svg>
            </span>
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange/90 text-white shadow-md">
              !
            </span>
          )}
          <span>{status.message}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={
          isSubmitting ||
          isPending ||
          isFormDisabled ||
          !canChooseProgression ||
          !selectedLevel ||
          !selectedLesson
        }
        className="cta-ripple mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-9 py-4 text-lg font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#ff6a00] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting || isPending ? "Registrando…" : "Confirmar asistencia"}
      </button>
    </form>
  );
}
