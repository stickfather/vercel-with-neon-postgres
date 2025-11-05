"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type {
  LessonCatalogItem,
  StudentLastLesson,
  StudentName,
} from "@/features/student-checkin/data/queries";
import {
  getLessonColorScale,
  getLevelAccent,
} from "@/features/student-checkin/lib/level-colors";
import { EphemeralToast } from "@/components/ui/ephemeral-toast";
import { formatLessonWithSequence } from "@/lib/time/check-in-window";
import { queueableFetch } from "@/lib/offline/fetch";

const SUGGESTION_LIMIT = 6;
const SUGGESTION_DEBOUNCE_MS = 220;
const EXAM_LESSON_NAME_LOWER = "preparación para el examen";
const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

function resolveSequenceValue(
  ...values: Array<number | null | undefined>
): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function isExamLessonLabel(label: string) {
  return label.trim().toLocaleLowerCase("es") === EXAM_LESSON_NAME_LOWER;
}

type Props = {
  disabled?: boolean;
  initialError?: string | null;
  lessonsError?: string | null;
};

type StatusState = {
  message: string;
} | null;

type ToastState = {
  type: "success" | "error";
  message: string;
};

type FetchState = "idle" | "loading" | "error";

type LessonOverridePrompt = {
  intent: "selection" | "submission";
  studentId: number;
  lessonId: number;
  level: string;
  lastLessonName: string | null;
  lastLessonSequence: number | null;
  selectedLessonName: string | null;
  selectedLessonSequence: number | null;
};

export function CheckInForm({
  disabled = false,
  initialError = null,
  lessonsError = null,
}: Props) {
  const router = useRouter();
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentName | null>(null);
  const [allLessons, setAllLessons] = useState<LessonCatalogItem[]>([]);
  const [suggestions, setSuggestions] = useState<StudentName[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(0);
  const [suggestionState, setSuggestionState] = useState<FetchState>("idle");
  const [selectedLevel, setSelectedLevel] = useState<string>(LEVELS[0]);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [isLoadingLessons, setIsLoadingLessons] = useState(true);
  const [lessonsFetchError, setLessonsFetchError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusState>(
    initialError ? { message: initialError } : null,
  );
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isLoadingLastLesson, setIsLoadingLastLesson] = useState(false);
  const [lastLessonError, setLastLessonError] = useState<string | null>(null);
  const [suggestedLesson, setSuggestedLesson] = useState<StudentLastLesson | null>(null);
  const [lessonOverridePrompt, setLessonOverridePrompt] =
    useState<LessonOverridePrompt | null>(null);
  const [confirmedOverrideLessonId, setConfirmedOverrideLessonId] =
    useState<number | null>(null);
  const lastLessonCache = useRef<Map<number, StudentLastLesson | null>>(new Map());
  const lastLessonAbortRef = useRef<AbortController | null>(null);
  const studentInputRef = useRef<HTMLInputElement | null>(null);
  const [blockedAccountMessage, setBlockedAccountMessage] = useState<string | null>(null);

  const isFormDisabled = disabled || Boolean(initialError);

  const lessonsAbortRef = useRef<AbortController | null>(null);

  const normalizeSequence = useCallback((value: unknown): number | null => {
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  const loadLessons = useCallback(async () => {
    lessonsAbortRef.current?.abort();
    const controller = new AbortController();
    lessonsAbortRef.current = controller;

    setIsLoadingLessons(true);
    setLessonsFetchError(null);

    try {
      const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
      let payload: unknown = [];
      
      if (isOnline) {
        const response = await fetch("/api/lessons", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("No se pudieron cargar las lecciones.");
        }

        payload = await response.json().catch(() => []);
        
        if (controller.signal.aborted) {
          return;
        }
        
        // Cache lessons in IndexedDB
        if (Array.isArray(payload) && payload.length > 0) {
          const { db } = await import("@/lib/db");
          await db.lessons.bulkPut(payload);
        }
      } else {
        // Load from IndexedDB when offline
        const { db } = await import("@/lib/db");
        const cachedLessons = await db.lessons.toArray();
        payload = cachedLessons;
      }

      if (!Array.isArray(payload)) {
        setAllLessons([]);
        setLessonsFetchError("No se pudieron cargar las lecciones.");
        return;
      }

      const normalized = (payload as LessonCatalogItem[])
        .map((entry) => {
          const lessonName = (entry.lesson ?? "").trim();
          const levelName = (entry.level ?? "").trim();
          const id = Number(entry.id);
          if (!lessonName || !levelName || !Number.isFinite(id)) {
            return null;
          }

          return {
            id,
            lesson: lessonName,
            level: levelName,
            seq: normalizeSequence(entry.seq),
          } satisfies LessonCatalogItem;
        })
        .filter(
          (
            value: LessonCatalogItem | null,
          ): value is LessonCatalogItem => value !== null,
        );

      setAllLessons(normalized);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      console.error("No se pudo obtener el catálogo de lecciones", error);
      
      // Try to load from cache on error
      try {
        const { db } = await import("@/lib/db");
        const cachedLessons = await db.lessons.toArray();
        
        if (cachedLessons.length > 0) {
          const normalized = cachedLessons
            .map((entry) => {
              const lessonName = (entry.lesson ?? "").trim();
              const levelName = (entry.level ?? "").trim();
              const id = Number(entry.id);
              if (!lessonName || !levelName || !Number.isFinite(id)) {
                return null;
              }

              return {
                id,
                lesson: lessonName,
                level: levelName,
                seq: normalizeSequence(entry.seq),
              } satisfies LessonCatalogItem;
            })
            .filter(
              (
                value: LessonCatalogItem | null,
              ): value is LessonCatalogItem => value !== null,
            );
          
          setAllLessons(normalized);
        } else {
          setAllLessons([]);
          setLessonsFetchError("No se pudieron cargar las lecciones.");
        }
      } catch (cacheError) {
        setAllLessons([]);
        setLessonsFetchError("No se pudieron cargar las lecciones.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingLessons(false);
      }
    }
  }, [normalizeSequence]);

  useEffect(() => {
    loadLessons();

    return () => {
      lessonsAbortRef.current?.abort();
    };
  }, [loadLessons]);

  useEffect(() => {
    if (!blockedAccountMessage) {
      return;
    }

    const timeout = setTimeout(() => {
      router.push("/");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [blockedAccountMessage, router]);

  const overrideDetails = useMemo(() => {
    if (!lessonOverridePrompt) {
      return null;
    }

    const lastLessonLabel = formatLessonWithSequence(
      lessonOverridePrompt.lastLessonName,
      lessonOverridePrompt.lastLessonSequence,
    );
    const selectedLessonLabel = formatLessonWithSequence(
      lessonOverridePrompt.selectedLessonName,
      lessonOverridePrompt.selectedLessonSequence,
    );

    return {
      lastLessonLabel,
      selectedLessonLabel,
    };
  }, [lessonOverridePrompt]);

  const applySuggestedLesson = useCallback(
    (suggestion: StudentLastLesson | null) => {
      if (!suggestion || isFormDisabled) {
        return;
      }

      const normalizedLevel = suggestion.level.trim().toLowerCase();
      const levelMatch = allLessons.find((lesson) =>
        lesson.level.trim().toLowerCase() === normalizedLevel,
      );

      if (!levelMatch) {
        setSuggestedLesson(null);
        setLastLessonError(
          "La lección sugerida ya no está disponible. Selecciónala manualmente.",
        );
        return;
      }

      const lessonEntry = allLessons.find(
        (lesson) =>
          lesson.id === suggestion.lessonId &&
          lesson.level.trim().toLowerCase() === normalizedLevel,
      );

      setStatus(null);

      const matchedLevel = LEVELS.find(
        (levelCode) => levelCode.toLowerCase() === normalizedLevel,
      );
      setSelectedLevel(matchedLevel ?? levelMatch.level.toUpperCase());

      if (lessonEntry) {
        setSelectedLessonId(lessonEntry.id);
        setLastLessonError(null);
      } else {
        setSuggestedLesson(null);
        setLastLessonError(
          "La lección sugerida ya no está disponible. Selecciónala manualmente.",
        );
      }
    },
    [allLessons, isFormDisabled],
  );

  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchAbortRef.current?.abort();
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      lastLessonAbortRef.current?.abort();
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
        const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
        let students: StudentName[] = [];
        
        if (isOnline) {
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

          students = Array.isArray(payload.students) ? payload.students : [];
          
          // Cache students in IndexedDB
          if (students.length > 0) {
            const { db } = await import("@/lib/db");
            await db.students.bulkPut(students);
          }
        } else {
          // Load from IndexedDB when offline
          const { db } = await import("@/lib/db");
          const allStudents = await db.students.toArray();
          
          if (studentQuery.trim()) {
            const normalizedQuery = studentQuery.toLowerCase().trim();
            students = allStudents
              .filter((s) => s.fullName.toLowerCase().includes(normalizedQuery))
              .slice(0, SUGGESTION_LIMIT);
          } else {
            students = allStudents.slice(0, SUGGESTION_LIMIT);
          }
        }

        setSuggestions(students);
        setHighlightedSuggestion(0);
        setSuggestionState("idle");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("No se pudieron cargar sugerencias", error);
        
        // Try loading from cache on error
        try {
          const { db } = await import("@/lib/db");
          const allStudents = await db.students.toArray();
          
          let students: StudentName[] = [];
          if (studentQuery.trim()) {
            const normalizedQuery = studentQuery.toLowerCase().trim();
            students = allStudents
              .filter((s) => s.fullName.toLowerCase().includes(normalizedQuery))
              .slice(0, SUGGESTION_LIMIT);
          } else {
            students = allStudents.slice(0, SUGGESTION_LIMIT);
          }
          
          setSuggestions(students);
          setHighlightedSuggestion(0);
          setSuggestionState("idle");
        } catch (cacheError) {
          setSuggestions([]);
          setSuggestionState("error");
        }
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
      setSelectedLevel(LEVELS[0]);
      setSelectedLessonId(null);
      return;
    }
    setSelectedLessonId(null);
  }, [selectedStudent?.id]);

  useEffect(() => {
    if (!selectedStudent) {
      setSuggestedLesson(null);
      setIsLoadingLastLesson(false);
      setLastLessonError(null);
      lastLessonAbortRef.current?.abort();
      return;
    }

    const cached = lastLessonCache.current.get(selectedStudent.id);
    if (cached !== undefined) {
      setSuggestedLesson(cached);
      setIsLoadingLastLesson(false);
      setLastLessonError(null);
      if (cached) {
        applySuggestedLesson(cached);
      }
      return;
    }

    const controller = new AbortController();
    lastLessonAbortRef.current?.abort();
    lastLessonAbortRef.current = controller;

    setIsLoadingLastLesson(true);
    setLastLessonError(null);

    (async () => {
      try {
        const response = await fetch(
          `/api/students/${selectedStudent.id}/last-lesson`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("No se pudo obtener la última lección registrada.");
        }

        const payload = (await response.json()) as {
          lastLesson?: StudentLastLesson | null;
        };

        if (controller.signal.aborted) return;

        const lesson = payload?.lastLesson ?? null;
        lastLessonCache.current.set(selectedStudent.id, lesson);
        setSuggestedLesson(lesson);
        if (lesson) {
          applySuggestedLesson(lesson);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("No se pudo recuperar la última lección", error);
        setSuggestedLesson(null);
        setLastLessonError(
          "No logramos sugerir tu última lección. Selecciónala manualmente.",
        );
        lastLessonCache.current.set(selectedStudent.id, null);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingLastLesson(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [selectedStudent?.id, applySuggestedLesson]);

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
    const normalizedLevel = selectedLevel.trim().toLowerCase();
    if (!normalizedLevel) {
      return [] as LessonCatalogItem[];
    }

    return allLessons.filter(
      (lesson) => lesson.level.trim().toLowerCase() === normalizedLevel,
    );
  }, [allLessons, selectedLevel]);

  const sortedLessons = useMemo(() => {
    return [...lessonsForLevel].sort((a, b) => {
      const aSeq =
        a.seq != null && Number.isFinite(a.seq)
          ? a.seq
          : Number.MAX_SAFE_INTEGER;
      const bSeq =
        b.seq != null && Number.isFinite(b.seq)
          ? b.seq
          : Number.MAX_SAFE_INTEGER;

      if (aSeq !== bSeq) {
        return aSeq - bSeq;
      }

      return a.id - b.id;
    });
  }, [lessonsForLevel]);

  useEffect(() => {
    if (!selectedLevel || isLoadingLessons || lessonsFetchError) {
      setSelectedLessonId(null);
      return;
    }

    if (!sortedLessons.length) {
      setSelectedLessonId(null);
      return;
    }

    setSelectedLessonId((previous) => {
      if (
        previous != null &&
        sortedLessons.some((lesson) => lesson.id === previous)
      ) {
        return previous;
      }
      const prioritized =
        sortedLessons.find((lesson) => lesson.seq !== null) ?? sortedLessons[0];
      return prioritized.id;
    });
  }, [isLoadingLessons, lessonsFetchError, selectedLevel, sortedLessons]);

  useEffect(() => {
    if (
      confirmedOverrideLessonId != null &&
      confirmedOverrideLessonId !== selectedLessonId
    ) {
      setConfirmedOverrideLessonId(null);
    }
  }, [confirmedOverrideLessonId, selectedLessonId]);

  const canChooseProgression =
    Boolean(selectedStudent) && !disabled && !initialError;

  const handleLessonSelection = useCallback(
    (lesson: LessonCatalogItem) => {
      if (isFormDisabled) {
        return;
      }

      const studentId = selectedStudent?.id;
      if (!studentId) {
        setSelectedLessonId(lesson.id);
        return;
      }

      const currentSequence = resolveSequenceValue(
        suggestedLesson?.sequence,
        suggestedLesson?.globalSequence,
      );
      const selectedSequence = resolveSequenceValue(lesson.seq);

      if (
        currentSequence != null &&
        selectedSequence != null &&
        selectedSequence !== currentSequence &&
        selectedSequence !== currentSequence + 1
      ) {
        setLessonOverridePrompt({
          intent: "selection",
          studentId,
          lessonId: lesson.id,
          level: selectedLevel,
          lastLessonName: suggestedLesson?.lessonName ?? null,
          lastLessonSequence: resolveSequenceValue(
            suggestedLesson?.sequence,
            suggestedLesson?.globalSequence,
          ),
          selectedLessonName: lesson.lesson,
          selectedLessonSequence: selectedSequence,
        });
        return;
      }

      setSelectedLessonId(lesson.id);
    },
    [isFormDisabled, selectedStudent, selectedLevel, suggestedLesson],
  );

  const handleSuggestionSelection = (student: StudentName) => {
    setStudentQuery(student.fullName);
    setSelectedStudent(student);
    setSuggestions([]);
    setIsSuggestionsOpen(false);
    setStatus(null);
    setSelectedLevel(LEVELS[0]);
    setSelectedLessonId(null);
    setSuggestedLesson(null);
    setLastLessonError(null);
    lastLessonAbortRef.current?.abort();
    studentInputRef.current?.blur();
  };

  const submitCheckIn = useCallback(
    async ({
      studentId,
      lessonId,
      level,
      confirmOverride,
    }: {
      studentId: number;
      lessonId: number;
      level: string;
      confirmOverride: boolean;
    }) => {
      const response = await queueableFetch("/api/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          level,
          lessonId,
          confirmOverride,
        }),
        offlineLabel: "student-check-in",
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        queued?: boolean;
      };

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo registrar tu asistencia.");
      }

      const wasQueued = Boolean(payload?.queued);

      setToast({
        type: "success",
        message: wasQueued
          ? "Asistencia registrada sin conexión. Se sincronizará automáticamente."
          : "¡Asistencia confirmada, buen trabajo!",
      });
      setStatus(null);
      setStudentQuery("");
      setSelectedStudent(null);
      setSelectedLevel(LEVELS[0]);
      setSelectedLessonId(null);
      setIsSuggestionsOpen(false);
      setSuggestions([]);
      setHighlightedSuggestion(0);
      setSuggestedLesson(null);
      setLastLessonError(null);
      setLessonOverridePrompt(null);
      lastLessonAbortRef.current?.abort();
      lastLessonCache.current.delete(studentId);

      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }

      redirectTimeoutRef.current = setTimeout(() => {
        startTransition(() => {
          router.push("/");
        });
      }, 320);
    },
    [router, startTransition],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isFormDisabled) {
      setStatus({
        message:
          initialError ??
          "El registro no está disponible en este momento. Consulta con un asesor.",
      });
      return;
    }

    setStatus(null);

    const trimmedName = studentQuery.trim();
    if (!trimmedName) {
      setStatus({
        message: "Ingresa tu nombre tal como aparece en la lista.",
      });
      return;
    }
    if (!selectedStudent) {
      setStatus({
        message: "Selecciona tu nombre exactamente como aparece en la lista.",
      });
      return;
    }
    if (!selectedLevel) {
      setStatus({
        message: "Selecciona tu nivel antes de continuar.",
      });
      return;
    }
    if (selectedLessonId == null) {
      setStatus({
        message: "Elige la lección correspondiente a tu nivel.",
      });
      return;
    }

    const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
    setIsSubmitting(true);
    try {
      const hasConfirmedOverride =
        confirmedOverrideLessonId != null &&
        selectedLessonId === confirmedOverrideLessonId;

      if (!isOnline) {
        await submitCheckIn({
          studentId: selectedStudent.id,
          lessonId: selectedLessonId,
          level: selectedLevel,
          confirmOverride: hasConfirmedOverride,
        });
        return;
      }

      const validationResponse = await fetch("/api/check-in/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          lessonId: selectedLessonId,
        }),
      });

      const validationPayload = (await validationResponse
        .json()
        .catch(() => ({}))) as {
        isActive?: boolean;
        needsConfirmation?: boolean;
        message?: string;
        lastLessonName?: string | null;
        lastLessonSequence?: number | null;
        selectedLessonName?: string | null;
        selectedLessonSequence?: number | null;
        error?: string;
      };

      if (!validationResponse.ok) {
        throw new Error(
          validationPayload?.error ??
            "No pudimos validar la lección seleccionada.",
        );
      }

      if (!validationPayload.isActive) {
        const message =
          validationPayload?.message ??
          "Tu cuenta requiere atención. Por favor, contacta a la administración.";
        setBlockedAccountMessage(message);
        setStatus(null);
        setToast(null);
        return;
      }

      if (validationPayload.needsConfirmation) {
        if (hasConfirmedOverride) {
          await submitCheckIn({
            studentId: selectedStudent.id,
            lessonId: selectedLessonId,
            level: selectedLevel,
            confirmOverride: true,
          });
          return;
        }

        setLessonOverridePrompt({
          intent: "submission",
          studentId: selectedStudent.id,
          lessonId: selectedLessonId,
          level: selectedLevel,
          lastLessonName: validationPayload.lastLessonName ?? null,
          lastLessonSequence:
            validationPayload.lastLessonSequence ?? null,
          selectedLessonName: validationPayload.selectedLessonName ?? null,
          selectedLessonSequence:
            validationPayload.selectedLessonSequence ?? null,
        });
        return;
      }

      await submitCheckIn({
        studentId: selectedStudent.id,
        lessonId: selectedLessonId,
        level: selectedLevel,
        confirmOverride: hasConfirmedOverride,
      });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : "No logramos registrar tu asistencia. Inténtalo de nuevo.";
      if (
        message.toLowerCase().includes("requiere atención") ||
        message.toLowerCase().includes("contacta a la administración")
      ) {
        setBlockedAccountMessage(
          "Tu cuenta requiere atención. Por favor, contacta a la administración.",
        );
        setStatus(null);
        setToast(null);
      } else {
        setStatus({ message });
        setToast({ type: "error", message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeLessonOverridePrompt = () => {
    setLessonOverridePrompt(null);
  };

  const confirmLessonOverride = async () => {
    if (!lessonOverridePrompt) {
      return;
    }

    if (lessonOverridePrompt.intent === "selection") {
      setSelectedLessonId(lessonOverridePrompt.lessonId);
      setConfirmedOverrideLessonId(lessonOverridePrompt.lessonId);
      setLessonOverridePrompt(null);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitCheckIn({
        studentId: lessonOverridePrompt.studentId,
        lessonId: lessonOverridePrompt.lessonId,
        level: lessonOverridePrompt.level,
        confirmOverride: true,
      });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : "No logramos registrar tu asistencia. Inténtalo de nuevo.";
      if (
        message.toLowerCase().includes("requiere atención") ||
        message.toLowerCase().includes("contacta a la administración")
      ) {
        setBlockedAccountMessage(
          "Tu cuenta requiere atención. Por favor, contacta a la administración.",
        );
        setStatus(null);
        setToast(null);
      } else {
        setStatus({ message });
        setToast({ type: "error", message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const accent = getLevelAccent(selectedLevel);
  const isLoadingSuggestions = suggestionState === "loading";

  return (
    <>
    <form
      className="flex flex-col gap-8 rounded-[36px] border border-white/70 bg-white/95 px-10 py-12 text-left shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur"
      onSubmit={handleSubmit}
    >
      {toast ? (
        <EphemeralToast
          message={toast.message}
          tone={toast.type}
          onDismiss={() => setToast(null)}
        />
      ) : null}
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
            ref={studentInputRef}
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {LEVELS.map((levelName) => {
              const levelAccent = getLevelAccent(levelName);
              const isActive = selectedLevel === levelName;
              return (
                <button
                  key={levelName}
                  type="button"
                  onClick={() => {
                    setSelectedLevel(levelName);
                    setStatus(null);
                  }}
                  className={`flex min-h-[68px] items-center justify-center rounded-full border px-6 text-center text-base font-semibold transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${
                    isActive
                      ? "border-transparent text-brand-deep"
                      : "border-[rgba(30,27,50,0.15)] text-brand-ink"
                  }`}
                  style={{
                    backgroundColor: isActive
                      ? levelAccent.base
                      : "rgba(255,255,255,0.9)",
                    color: isActive ? levelAccent.primary : undefined,
                    boxShadow: isActive
                      ? "0 14px 34px rgba(15,23,42,0.18)"
                      : "0 4px 14px rgba(15,23,42,0.08)",
                  }}
                  aria-pressed={isActive}
                  disabled={isFormDisabled || !canChooseProgression}
                >
                  <span className="text-lg font-black">
                    {levelName}
                  </span>
                </button>
              );
            })}
          </div>
          {!canChooseProgression && (
            <div className="rounded-[24px] border border-dashed border-brand-teal bg-white/70 px-5 py-4 text-sm text-brand-ink">
              Selecciona primero tu nombre para ver los niveles disponibles.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-brand-deep">Lección</span>
          <div className="min-h-[20px] text-[10px] font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
            {isFormDisabled ? null : isLoadingLastLesson ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1">
                Cargando tu última lección…
              </span>
            ) : suggestedLesson ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-teal-soft px-3 py-1 text-brand-teal">
                Última vez: {suggestedLesson.lessonName}
              </span>
            ) : lastLessonError ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-brand-orange">
                {lastLessonError}
              </span>
            ) : null}
          </div>
          {canChooseProgression ? (
            <div className="grid min-h-[5.5rem] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {isLoadingLessons ? (
                <div className="col-span-full text-sm italic text-brand-ink-muted">
                  Cargando lecciones…
                </div>
              ) : lessonsFetchError ? (
                <div className="col-span-full rounded-[18px] border border-brand-orange bg-white/80 px-4 py-3 text-sm text-brand-ink">
                  {lessonsFetchError}
                </div>
              ) : sortedLessons.length ? (
                sortedLessons.map((lesson, index) => {
                  const isActive = selectedLessonId === lesson.id;
                  const lessonLabel = lesson.lesson;
                  const isWideLabel = lessonLabel.length >= 22;
                  const isExamLesson = isExamLessonLabel(lessonLabel);
                  const lessonScale = getLessonColorScale(
                    selectedLevel,
                    index,
                    sortedLessons.length,
                  );
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => handleLessonSelection(lesson)}
                      className={`group relative flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-[24px] border px-5 py-5 text-center text-base transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${
                        isActive
                          ? "border-brand-teal bg-white text-brand-deep shadow-[0_20px_40px_rgba(15,23,42,0.2)] ring-4 ring-brand-teal/35 ring-offset-2 ring-offset-white"
                          : "border-[rgba(30,27,50,0.12)]"
                      } ${isWideLabel ? "sm:col-span-2 lg:col-span-2" : ""}`}
                      style={{
                        background: isActive
                          ? "linear-gradient(140deg, rgba(0,191,166,0.15) 0%, rgba(255,255,255,0.95) 65%)"
                          : lessonScale.background,
                        borderColor: isActive ? accent.primary : lessonScale.border,
                        boxShadow: isActive
                          ? "0 22px 44px rgba(15,23,42,0.22)"
                          : "0 6px 18px rgba(15,23,42,0.1)",
                        color: isActive ? accent.primary : lessonScale.text,
                      }}
                      aria-pressed={isActive}
                      disabled={
                        isFormDisabled || !sortedLessons.length || isLoadingLessons || lessonsFetchError !== null
                      }
                    >
                      {isActive ? (
                        <span
                          aria-hidden
                          className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-teal text-white shadow-md"
                        >
                          ✓
                        </span>
                      ) : null}
                      <span className="text-sm font-semibold leading-snug sm:text-base">
                        {lessonLabel}
                        {isExamLesson ? (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-brand-orange">
                            (Examen)
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full text-sm italic text-brand-ink-muted">
                  No hay lecciones para {selectedLevel}.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-brand-teal bg-white/70 px-5 py-4 text-sm text-brand-ink">
              Ingresa y confirma tu nombre para continuar con el registro.
            </div>
          )}
        </div>
      </div>

      {!isLoadingLessons &&
        !lessonsFetchError &&
        !allLessons.length &&
        !initialError && (
        <div className="rounded-3xl border border-brand-orange bg-white/75 px-5 py-3 text-sm font-medium text-brand-ink">
          {lessonsError ??
            "Aún no hay lecciones disponibles para seleccionar. Nuestro equipo lo resolverá en breve."}
        </div>
      )}

      {status && (
        <div
          className="flex items-center gap-3 rounded-3xl border border-brand-orange bg-white/82 px-5 py-4 text-sm font-medium text-brand-ink"
          role="alert"
          aria-live="assertive"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange/90 text-white shadow-md">
            !
          </span>
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
          selectedLessonId == null
        }
        className="cta-ripple mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-9 py-4 text-lg font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#ff6a00] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting || isPending ? "Registrando…" : "Confirmar asistencia"}
      </button>
      {lessonOverridePrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.4)] px-4 py-6 backdrop-blur-sm">
          <div className="max-w-md rounded-[32px] border border-white/70 bg-white/95 p-6 text-brand-ink shadow-[0_24px_58px_rgba(15,23,42,0.18)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-ink-muted">
                  Confirmar cambio de lección
                </span>
                <p className="text-base font-semibold text-brand-deep">
                  ¿Estás seguro de cambiar tu lección?
                </p>
                {overrideDetails ? (
                  <div className="flex flex-col gap-1 text-sm text-brand-ink-muted">
                    <p>
                      La última vez registraste la lección{" "}
                      <strong className="text-brand-ink">
                        {overrideDetails.lastLessonLabel}
                      </strong>
                      .
                    </p>
                    <p>
                      Ahora estás eligiendo la lección{" "}
                      <strong className="text-brand-ink">
                        {overrideDetails.selectedLessonLabel}
                      </strong>
                      .
                    </p>
                    <p>Esto puede afectar tu progreso.</p>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeLessonOverridePrompt}
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmLessonOverride}
                  disabled={
                    lessonOverridePrompt.intent === "submission"
                      ? isSubmitting
                      : false
                  }
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-wait disabled:opacity-70"
                >
                  {lessonOverridePrompt.intent === "submission" && isSubmitting
                    ? "Registrando…"
                    : "Sí, continuar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </form>
    {blockedAccountMessage ? (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-6">
        <div className="max-w-lg rounded-[32px] border border-white/70 bg-white px-8 py-10 text-center shadow-[0_30px_70px_rgba(15,23,42,0.35)]">
          <h2 className="text-2xl font-black text-brand-deep">Atención necesaria</h2>
          <p className="mt-4 text-base text-brand-ink">{blockedAccountMessage}</p>
          <p className="mt-6 text-sm text-brand-ink-muted">
            Te redirigiremos a la pantalla de bienvenida en unos segundos…
          </p>
        </div>
      </div>
    ) : null}
  </>
  );
}
