"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import type {
  LevelLessons,
  StudentLastLesson,
  StudentName,
} from "@/features/student-checkin/data/queries";
import {
  getLessonColorScale,
  getLevelAccent,
} from "@/features/student-checkin/lib/level-colors";
import { EphemeralToast } from "@/components/ui/ephemeral-toast";
import { formatLessonWithSequence } from "@/lib/time/check-in-window";
import {
  generateQueueId,
  isOfflineError,
  readQueue,
  type OfflineQueueItem,
  writeQueue,
} from "@/lib/offline/queue-helpers";

const SUGGESTION_LIMIT = 6;
const SUGGESTION_DEBOUNCE_MS = 220;
const STUDENT_QUEUE_STORAGE_KEY = "ir_offline_student_checkins_v1";
const OFFLINE_WAITING_MESSAGE =
  "Sin conexión a internet. Guardamos tu asistencia y la enviaremos cuando vuelva la conexión.";

type Props = {
  levels: LevelLessons[];
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
  studentId: number;
  studentName: string;
  lessonId: number;
  level: string;
  lastLessonName: string | null;
  lastLessonSequence: number | null;
  selectedLessonName: string | null;
  selectedLessonSequence: number | null;
};

type PendingStudentCheckIn = OfflineQueueItem<{
  studentId: number;
  lessonId: number;
  level: string;
  confirmOverride: boolean;
}>;

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
  const [status, setStatus] = useState<StatusState>(null);
  const [initialAlert, setInitialAlert] = useState<string | null>(
    initialError,
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
  const [fullScreenMessage, setFullScreenMessage] = useState<
    | {
        tone: "success" | "error";
        message: string;
        subtext?: string;
      }
    | null
  >(null);
  const lastLessonCache = useRef<Map<number, StudentLastLesson | null>>(new Map());
  const lastLessonAbortRef = useRef<AbortController | null>(null);
  const studentInputRef = useRef<HTMLInputElement | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [pendingOfflineCheckIns, setPendingOfflineCheckIns] = useState<
    PendingStudentCheckIn[]
  >([]);
  const [isSyncingOfflineQueue, setIsSyncingOfflineQueue] = useState(false);

  const isFormDisabled = disabled;

  useEffect(() => {
    setInitialAlert(initialError);
  }, [initialError]);

  const overrideQuestion = useMemo(() => {
    if (!lessonOverridePrompt) {
      return null;
    }

    const { lastLessonSequence, selectedLessonSequence } =
      lessonOverridePrompt;

    if (
      lastLessonSequence != null &&
      selectedLessonSequence != null &&
      selectedLessonSequence < lastLessonSequence
    ) {
      return "¿Seguro que quieres regresar?";
    }

    return "¿Seguro que quieres saltarte lecciones?";
  }, [lessonOverridePrompt]);

  const overrideMessage = useMemo(() => {
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

    return `Nuestros registros indican que tu última lección fue ${lastLessonLabel}. ¿Seguro que quieres cambiar a ${selectedLessonLabel}?`;
  }, [lessonOverridePrompt]);

  const applySuggestedLesson = useCallback(
    (suggestion: StudentLastLesson | null) => {
      if (!suggestion || isFormDisabled) {
        return;
      }

      const normalizedLevel = suggestion.level.trim().toLowerCase();
      const levelEntry = levels.find(
        (entry) => entry.level.trim().toLowerCase() === normalizedLevel,
      );

      if (!levelEntry) {
        setSuggestedLesson(null);
        setLastLessonError(
          "La lección sugerida ya no está disponible. Selecciónala manualmente.",
        );
        return;
      }

      const lessonEntry = levelEntry.lessons.find(
        (lesson) => lesson.id === suggestion.lessonId,
      );

      setStatus(null);
      setSelectedLevel(levelEntry.level);

      if (lessonEntry) {
        setSelectedLesson(String(lessonEntry.id));
        setLastLessonError(null);
      } else {
        setSuggestedLesson(null);
        setLastLessonError(
          "La lección sugerida ya no está disponible. Selecciónala manualmente.",
        );
      }
    },
    [isFormDisabled, levels],
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
    if (typeof window === "undefined") {
      return;
    }

    setPendingOfflineCheckIns(
      readQueue<PendingStudentCheckIn["payload"]>(
        STUDENT_QUEUE_STORAGE_KEY,
      ),
    );

    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
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
    Boolean(selectedStudent) && !isFormDisabled && Boolean(levels.length);
  const pendingOfflineCount = pendingOfflineCheckIns.length;

  const handleSuggestionSelection = (student: StudentName) => {
    setStudentQuery(student.fullName);
    setSelectedStudent(student);
    setSuggestions([]);
    setIsSuggestionsOpen(false);
    setStatus(null);
    setSuggestedLesson(null);
    setLastLessonError(null);
    lastLessonAbortRef.current?.abort();
    studentInputRef.current?.blur();
  };

  const scheduleWelcomeRedirect = useCallback(
    (
      {
        delay = 1600,
      }: {
        delay?: number;
      } = {},
    ) => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }

      redirectTimeoutRef.current = setTimeout(() => {
        const target = "/";
        startTransition(() => {
          router.push(target);
        });
      }, delay);
    },
    [router, startTransition],
  );

  const handlePostSubmitSuccess = useCallback(
    (
      studentId: number,
      options?: {
        message?: string;
        statusMessage?: string | null;
        welcomeName?: string | null;
        redirectDelayMs?: number;
      },
    ) => {
      const confirmationMessage = options?.message ?? "Welcome";

      if (options?.statusMessage !== undefined) {
        if (options.statusMessage === null) {
          setStatus(null);
        } else {
          setStatus({ message: options.statusMessage });
        }
      } else {
        setStatus(null);
      }

      setToast(null);
      setFullScreenMessage({
        tone: "success",
        message: confirmationMessage,
        subtext:
          options?.statusMessage === undefined
            ? undefined
            : options.statusMessage ?? undefined,
      });

      setStudentQuery("");
      setSelectedStudent(null);
      setSelectedLevel("");
      setSelectedLesson("");
      setIsSuggestionsOpen(false);
      setSuggestions([]);
      setHighlightedSuggestion(0);
      setSuggestedLesson(null);
      setLastLessonError(null);
      setLessonOverridePrompt(null);
      lastLessonAbortRef.current?.abort();
      lastLessonCache.current.delete(studentId);

      scheduleWelcomeRedirect({
        delay: options?.redirectDelayMs,
      });
    },
    [scheduleWelcomeRedirect],
  );

  const performCheckInRequest = useCallback(
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
      const response = await fetch("/api/check-in", {
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
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          (payload as { error?: string })?.error ??
            "No se pudo registrar tu asistencia.",
        );
      }
    },
    [],
  );

  const queueStudentCheckIn = useCallback(
    ({
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
      setPendingOfflineCheckIns((previous) => {
        const item: PendingStudentCheckIn = {
          id: generateQueueId(),
          createdAt: Date.now(),
          payload: { studentId, lessonId, level, confirmOverride },
        };
        const next = [...previous, item];
        writeQueue(STUDENT_QUEUE_STORAGE_KEY, next);
        return next;
      });
    },
    [],
  );

  const submitCheckIn = useCallback(
    async ({
      studentId,
      studentName,
      lessonId,
      level,
      confirmOverride,
    }: {
      studentId: number;
      studentName?: string | null;
      lessonId: number;
      level: string;
      confirmOverride: boolean;
    }) => {
      const payload = { studentId, lessonId, level, confirmOverride };

      if (!isOnline) {
        queueStudentCheckIn(payload);
        handlePostSubmitSuccess(studentId, {
          message: "Registro guardado sin conexión. Se enviará al reconectar.",
          statusMessage: OFFLINE_WAITING_MESSAGE,
          welcomeName: studentName ?? null,
          redirectDelayMs: 2200,
        });
        return;
      }

      try {
        await performCheckInRequest(payload);
        handlePostSubmitSuccess(studentId, {
          statusMessage: null,
          welcomeName: studentName ?? null,
        });
      } catch (error) {
        const maybeMessage =
          error instanceof Error ? error.message : String(error ?? "");

        if (isOfflineError(error)) {
          queueStudentCheckIn(payload);
          handlePostSubmitSuccess(studentId, {
            message: "Registro guardado sin conexión. Se enviará al reconectar.",
            statusMessage: OFFLINE_WAITING_MESSAGE,
            welcomeName: studentName ?? null,
            redirectDelayMs: 2200,
          });
          return;
        }

        throw error;
      }
    },
    [
      handlePostSubmitSuccess,
      isOnline,
      performCheckInRequest,
      queueStudentCheckIn,
    ],
  );

  const processQueuedCheckIns = useCallback(async () => {
    if (!isOnline || !pendingOfflineCheckIns.length || isSyncingOfflineQueue) {
      return;
    }

    setIsSyncingOfflineQueue(true);
    const entries = [...pendingOfflineCheckIns];
    let processedCount = 0;

    for (const entry of entries) {
      try {
        await performCheckInRequest(entry.payload);
        processedCount += 1;
        setPendingOfflineCheckIns((previous) => {
          const next = previous.filter((item) => item.id !== entry.id);
          writeQueue(STUDENT_QUEUE_STORAGE_KEY, next);
          return next;
        });
      } catch (error) {
        const maybeMessage =
          error instanceof Error ? error.message : String(error ?? "");

        if (isOfflineError(error)) {
          setIsOnline(false);
          break;
        }

        console.error("No se pudo sincronizar un check-in pendiente", error);
        setStatus({
          message:
            "No se pudo sincronizar un registro pendiente. Intenta nuevamente más tarde.",
        });
        break;
      }
    }

    if (processedCount > 0) {
      setToast({
        type: "success",
        message:
          processedCount === 1
            ? "Tu asistencia pendiente se envió automáticamente."
            : `${processedCount} asistencias pendientes se sincronizaron.`,
      });
      setStatus(null);
      startTransition(() => {
        router.refresh();
      });
    }

    setIsSyncingOfflineQueue(false);
  }, [
    isOnline,
    isSyncingOfflineQueue,
    pendingOfflineCheckIns,
    performCheckInRequest,
    router,
    startTransition,
  ]);

  useEffect(() => {
    if (!isOnline || !pendingOfflineCheckIns.length || isSyncingOfflineQueue) {
      return;
    }

    void processQueuedCheckIns();
  }, [
    isOnline,
    isSyncingOfflineQueue,
    pendingOfflineCheckIns.length,
    processQueuedCheckIns,
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isFormDisabled) {
      setStatus({
        message:
          initialAlert ??
          "El registro no está disponible en este momento. Consulta con un asesor.",
      });
      return;
    }

    setStatus(null);
    setFullScreenMessage(null);

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
    if (!selectedLesson) {
      setStatus({
        message: "Elige la lección correspondiente a tu nivel.",
      });
      return;
    }

    const parsedLessonId = Number(selectedLesson);
    if (!Number.isFinite(parsedLessonId)) {
      setStatus({
        message: "La lección seleccionada no es válida.",
      });
      return;
    }

    if (!isOnline) {
      await submitCheckIn({
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        lessonId: parsedLessonId,
        level: selectedLevel,
        confirmOverride: false,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const validationResponse = await fetch("/api/check-in/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          lessonId: parsedLessonId,
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
        setStatus(null);
        setToast(null);
        setFullScreenMessage({
          tone: "error",
          message,
          subtext: "Regresaremos a la pantalla principal en unos segundos…",
        });
        scheduleWelcomeRedirect({ delay: 3000 });
        return;
      }

      if (validationPayload.needsConfirmation) {
        setLessonOverridePrompt({
          studentId: selectedStudent.id,
          studentName: selectedStudent.fullName,
          lessonId: parsedLessonId,
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
        studentName: selectedStudent.fullName,
        lessonId: parsedLessonId,
        level: selectedLevel,
        confirmOverride: false,
      });
    } catch (error) {
      console.error(error);

      if (isOfflineError(error)) {
        try {
          await submitCheckIn({
            studentId: selectedStudent.id,
            studentName: selectedStudent.fullName,
            lessonId: parsedLessonId,
            level: selectedLevel,
            confirmOverride: false,
          });
          return;
        } catch (submitError) {
          console.error(submitError);
        }
      }

      const message =
        error instanceof Error
          ? error.message
          : "No logramos registrar tu asistencia. Inténtalo de nuevo.";
      setStatus({ message });
      setToast({ type: "error", message });
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

    setIsSubmitting(true);
    try {
      await submitCheckIn({
        studentId: lessonOverridePrompt.studentId,
        studentName: lessonOverridePrompt.studentName,
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
      setStatus({ message });
      setToast({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const accent = getLevelAccent(selectedLevel);
  const isLoadingSuggestions = suggestionState === "loading";

  return (
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

      {initialAlert && (
        <div
          className="rounded-3xl border border-brand-orange bg-white/85 px-5 py-3 text-sm font-medium text-brand-ink"
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <span>{initialAlert}</span>
            <button
              type="button"
              onClick={() => setInitialAlert(null)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-white/70 text-brand-ink hover:border-brand-orange/60 hover:text-brand-orange focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              aria-label="Ocultar mensaje inicial"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="rounded-3xl border border-brand-orange bg-white/80 px-5 py-3 text-sm font-medium text-brand-ink" role="status">
          Sin conexión a internet. Puedes continuar y enviaremos tus registros automáticamente al reconectar.
        </div>
      )}
      {isSyncingOfflineQueue && pendingOfflineCount > 0 && (
        <div className="rounded-3xl border border-brand-teal bg-white/85 px-5 py-3 text-sm font-medium text-brand-teal" role="status">
          Reconectamos y estamos enviando {pendingOfflineCount === 1 ? "1 registro pendiente" : `${pendingOfflineCount} registros pendientes`}…
        </div>
      )}

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
          {canChooseProgression ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
                      {level.level}
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
          {selectedLevel && canChooseProgression ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {sortedLessons.map((lesson, index) => {
                const isActive = selectedLesson === lesson.id.toString();
                const lessonLabel = lesson.lesson;
                const isWideLabel = lessonLabel.length >= 22;
                const lessonScale = getLessonColorScale(
                  selectedLevel,
                  index,
                  sortedLessons.length,
                );
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedLesson(lesson.id.toString())}
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
                      isFormDisabled || !sortedLessons.length || !canChooseProgression
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
                    </span>
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

      {!levels.length && !isFormDisabled && (
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
          !selectedLesson
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
                  {overrideQuestion ?? "¿Seguro que quieres continuar?"}
                </p>
                {overrideMessage ? (
                  <p className="text-sm text-brand-ink-muted">{overrideMessage}</p>
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
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-wait disabled:opacity-70"
                >
                  {isSubmitting ? "Registrando…" : "Sí, registrar asistencia"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {fullScreenMessage ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(15,23,42,0.55)] px-6 py-6 backdrop-blur-sm">
          <div className="max-w-xl rounded-[36px] border border-white/80 bg-white/95 px-8 py-10 text-center text-brand-deep shadow-[0_28px_68px_rgba(15,23,42,0.28)]">
            <p className="text-4xl font-black leading-snug sm:text-5xl">
              {fullScreenMessage.message}
            </p>
            {fullScreenMessage.subtext ? (
              <p className="mt-3 text-sm font-medium text-brand-ink-muted">
                {fullScreenMessage.subtext}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </form>
  );
}
