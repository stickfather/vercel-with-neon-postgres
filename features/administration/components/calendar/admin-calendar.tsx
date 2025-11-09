"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import type { CalendarEvent } from "@/features/administration/data/calendar";
import type { StudentName } from "@/features/student-checkin/data/queries";

import { formatLocalDateTime, formatLocalTime } from "@/lib/datetime/format";
import { StudentAvatar } from "@/components/student/StudentAvatar";

const TIMEZONE = "America/Guayaquil";

const VIEW_OPTIONS = [
  { value: "month" as const, label: "Mes" },
  { value: "week" as const, label: "Semana" },
  { value: "day" as const, label: "Día" },
];

type CalendarView = (typeof VIEW_OPTIONS)[number]["value"];

type CalendarTypeFilter = "all" | "exam" | "activity";

const TYPE_OPTIONS: Array<{ value: CalendarTypeFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "exam", label: "Exámenes" },
  { value: "activity", label: "Actividades" },
];

type StatusFilter = "all" | "scheduled" | "approved" | "failed" | "cancelled";

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "scheduled", label: "Programado" },
  { value: "approved", label: "Aprobado" },
  { value: "failed", label: "Reprobado" },
  { value: "cancelled", label: "Cancelado" },
];

const DATE_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
});

const MONTH_TITLE_FORMATTER = new Intl.DateTimeFormat("es-EC", {
  timeZone: TIMEZONE,
  month: "long",
  year: "numeric",
});

const DAY_HEADER_FORMATTER = new Intl.DateTimeFormat("es-EC", {
  timeZone: TIMEZONE,
  weekday: "short",
});

const DAY_NAME_FULL_FORMATTER = new Intl.DateTimeFormat("es-EC", {
  timeZone: TIMEZONE,
  weekday: "long",
});

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat("es-EC", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "long",
});

const EXAM_EVENT_STYLES: Record<
  | "scheduled"
  | "approved"
  | "failed"
  | "cancelled"
  | "activity",
  { container: string; accent: string }
> = {
  scheduled: {
    container: "border border-[#b9cdf3] bg-[#e6f0ff] text-[#0f3f86]",
    accent: "bg-[#0f3f86]",
  },
  approved: {
    container: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    accent: "bg-emerald-500",
  },
  failed: {
    container: "border border-rose-200 bg-rose-50 text-rose-700",
    accent: "bg-rose-500",
  },
  cancelled: {
    container:
      "border border-[#d0d4de] text-[#4b5563] bg-[repeating-linear-gradient(135deg,#f2f4f8_0px,#f2f4f8_8px,#e6e9f0_8px,#e6e9f0_16px)]",
    accent: "bg-[#9ca3af]",
  },
  activity: {
    container: "border border-[#a8dec6] bg-[#def7ed] text-[#0d6b50]",
    accent: "bg-[#0d6b50]",
  },
};

const WEEKDAY_ORDER = Array.from({ length: 7 }, (_, index) => index);

function parseViewParam(value: string | null): CalendarView {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "week") return "week";
  if (normalized === "day") return "day";
  return "month";
}

function parseTypeParam(value: string | null): CalendarTypeFilter {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "exam" || normalized === "examen" || normalized === "exámenes") {
    return "exam";
  }
  if (normalized === "activity" || normalized === "actividad" || normalized === "actividades") {
    return "activity";
  }
  return "all";
}

function parseStatusParam(value: string | null): StatusFilter {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "scheduled" || normalized === "programado") return "scheduled";
  if (["approved", "aprobado", "aprobada", "passed"].includes(normalized)) {
    return "approved";
  }
  if (["failed", "reprobado", "reprobada"].includes(normalized)) {
    return "failed";
  }
  if (["cancelled", "cancelado", "cancelada"].includes(normalized)) {
    return "cancelled";
  }
  return "all";
}

function parseStudentIdParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfWeek(date: Date): Date {
  const day = date.getUTCDay();
  const diff = (day + 6) % 7; // Monday as start
  const start = startOfDay(date);
  start.setUTCDate(start.getUTCDate() - diff);
  return start;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number): Date {
  const next = startOfDay(date);
  next.setUTCMonth(next.getUTCMonth() + amount);
  next.setUTCDate(1);
  return next;
}

function addWeeks(date: Date, amount: number): Date {
  return addDays(date, amount * 7);
}

function formatDateParam(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseStartParam(value: string | null, view: CalendarView): Date {
  if (!value) {
    return normalizeForView(new Date(), view);
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return normalizeForView(new Date(), view);
  }
  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const day = Number(dayStr);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(monthIndex) ||
    !Number.isFinite(day) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    day < 1 ||
    day > 31
  ) {
    return normalizeForView(new Date(), view);
  }
  const parsed = new Date(Date.UTC(year, monthIndex, day));
  return normalizeForView(parsed, view);
}

function normalizeForView(date: Date, view: CalendarView): Date {
  if (view === "week") return startOfWeek(date);
  if (view === "day") return startOfDay(date);
  return startOfMonth(date);
}

type DateRange = { start: Date; end: Date };

function getRange(view: CalendarView, start: Date): DateRange {
  if (view === "week") {
    const normalized = startOfWeek(start);
    return { start: normalized, end: addWeeks(normalized, 1) };
  }
  if (view === "day") {
    const normalized = startOfDay(start);
    return { start: normalized, end: addDays(normalized, 1) };
  }
  const normalized = startOfMonth(start);
  return { start: normalized, end: addMonths(normalized, 1) };
}

function buildMonthDays(monthStart: Date): Date[] {
  const firstVisibleDay = startOfWeek(monthStart);
  const nextMonth = addMonths(monthStart, 1);
  const days: Date[] = [];
  let cursor = firstVisibleDay;
  while (cursor < nextMonth || days.length % 7 !== 0) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    if (days.length > 42) break;
  }
  return days;
}

function getDateKey(date: Date): string {
  return DATE_KEY_FORMATTER.format(date);
}

function getDayNumber(date: Date): string {
  const key = getDateKey(date);
  const parts = key.split("-");
  return parts[2]?.replace(/^0/, "") ?? parts[2] ?? "";
}

function formatMonthTitle(date: Date): string {
  return MONTH_TITLE_FORMATTER.format(date).replace(/(^|\s)([a-z])/g, (match) =>
    match.toUpperCase(),
  );
}

function formatDayHeader(index: number): string {
  const reference = addDays(startOfWeek(new Date(Date.UTC(2024, 0, 1))), index);
  return DAY_HEADER_FORMATTER.format(reference).replace(/\n/g, "").replace(/\.$/, "");
}

function formatDateLabel(date: Date): string {
  const label = DATE_LABEL_FORMATTER.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDateTime(value: string): string {
  return formatLocalDateTime(value, { hour12: false });
}

function formatTime(value: string): string {
  return formatLocalTime(value, { hour12: false });
}

function getExamTypeDisplay(event: CalendarEvent): string {
  // Prefer the status field if it contains Speaking/Writing
  if (event.status) {
    const status = event.status.trim();
    if (status === "Speaking" || status === "Writing") {
      return status;
    }
  }
  
  // Fallback: extract from notes
  if (event.notes) {
    if (event.notes.toLowerCase().includes("speaking")) {
      return "Speaking";
    }
    if (event.notes.toLowerCase().includes("writing")) {
      return "Writing";
    }
  }
  
  return "—";
}

function getEventTooltip(event: CalendarEvent): string {
  if (event.kind === "exam") {
    const base = [
      "Examen",
      event.title,
      formatDateTime(event.startTime),
    ].filter(Boolean);
    const examType = event.status ? `Tipo: ${event.status}` : null;
    const level = event.level ? `Nivel: ${event.level}` : null;
    const score = event.score != null ? `Nota: ${event.score}%` : null;
    const passedLabel =
      event.passed == null
        ? null
        : `¿Aprobó?: ${event.passed ? "Sí" : "No"}`;
    return [
      base.join(" · "),
      examType,
      level,
      score,
      passedLabel,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return [
    "Actividad",
    event.title,
    formatDateTime(event.startTime),
  ]
    .filter(Boolean)
    .join(" · ");
}

function translateStatus(
  status: string | null, 
  passed?: boolean | null,
  timeScheduled?: string | null
): string {
  // If timeScheduled is provided and exam is in the future, always return "Programado"
  if (timeScheduled) {
    const now = new Date();
    const examTime = new Date(timeScheduled);
    if (examTime > now) {
      return "Programado";
    }
  }
  
  // For past exams or when no timeScheduled provided
  if (passed === true) {
    return "Aprobado";
  }
  if (passed === false) {
    return "Reprobado";
  }
  if (!status) return "Programado";
  const normalized = status.trim().toLowerCase();
  if (["approved", "aprobado", "aprobada", "passed"].includes(normalized)) {
    return "Aprobado";
  }
  if (["failed", "reprobado", "reprobada"].includes(normalized)) {
    return "Reprobado";
  }
  if (["cancelled", "cancelado", "cancelada"].includes(normalized)) {
    return "Cancelado";
  }
  return "Programado";
}


type DialogState =
  | { type: "none" }
  | {
      type: "chooser";
      referenceDate?: Date;
    }
  | {
      type: "create-exam";
      defaultDate?: string;
    }
  | {
      type: "create-activity";
      defaultDate?: string;
    }
  | {
      type: "view";
      event: CalendarEvent;
    }
  | {
      type: "edit-exam";
      event: CalendarEvent;
    }
  | {
      type: "edit-activity";
      event: CalendarEvent;
    }
  | {
      type: "delete";
      event: CalendarEvent;
    };

type ExamLegendKey = Exclude<StatusFilter, "all">;

const STATUS_BADGES: Record<ExamLegendKey, { label: string; className: string }> = {
  scheduled: {
    label: "Programado",
    className: EXAM_EVENT_STYLES.scheduled.container,
  },
  approved: {
    label: "Aprobado",
    className: EXAM_EVENT_STYLES.approved.container,
  },
  failed: {
    label: "Reprobado",
    className: EXAM_EVENT_STYLES.failed.container,
  },
  cancelled: {
    label: "Cancelado",
    className: EXAM_EVENT_STYLES.cancelled.container,
  },
};

const EXAM_STATUS_LEGEND_ITEMS: Array<{
  key: ExamLegendKey;
  label: string;
  className: string;
  accentClassName: string;
}> = [
  {
    key: "scheduled",
    label: "Programado",
    className: EXAM_EVENT_STYLES.scheduled.container,
    accentClassName: EXAM_EVENT_STYLES.scheduled.accent,
  },
  {
    key: "approved",
    label: "Aprobado",
    className: EXAM_EVENT_STYLES.approved.container,
    accentClassName: EXAM_EVENT_STYLES.approved.accent,
  },
  {
    key: "failed",
    label: "Reprobado",
    className: EXAM_EVENT_STYLES.failed.container,
    accentClassName: EXAM_EVENT_STYLES.failed.accent,
  },
  {
    key: "cancelled",
    label: "Cancelado",
    className: EXAM_EVENT_STYLES.cancelled.container,
    accentClassName: EXAM_EVENT_STYLES.cancelled.accent,
  },
];

type StudentSuggestion = StudentName;

type StudentSelectorProps = {
  value: StudentSuggestion | null;
  onChange(value: StudentSuggestion | null): void;
  disabled?: boolean;
  required?: boolean;
  label: string;
  placeholder?: string;
};

const SUGGESTION_LIMIT = 6;
const SUGGESTION_DEBOUNCE_MS = 220;

function StudentSelector({
  value,
  onChange,
  disabled = false,
  required = false,
  label,
  placeholder,
}: StudentSelectorProps) {
  const [query, setQuery] = useState(() => value?.fullName ?? "");
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(value?.fullName ?? "");
  }, [value?.id]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setStatus("idle");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setStatus("loading");

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ limit: String(SUGGESTION_LIMIT) });
        if (query.trim()) {
          params.set("query", query.trim());
        }
        const response = await fetch(`/api/students?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("No se pudo obtener la lista de estudiantes.");
        }
        const payload = (await response.json()) as { students?: StudentSuggestion[] };
        if (controller.signal.aborted) return;
        setSuggestions(Array.isArray(payload.students) ? payload.students : []);
        setHighlightedIndex(0);
        setStatus("idle");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("No se pudieron cargar estudiantes", error);
        setStatus("error");
        setSuggestions([]);
      }
    }, SUGGESTION_DEBOUNCE_MS);

    return () => {
      controller.abort();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, isOpen]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
    return undefined;
  }, [isOpen]);

  const selectSuggestion = (suggestion: StudentSuggestion) => {
    setQuery(suggestion.fullName);
    onChange(suggestion);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((index) => {
        if (!suggestions.length) return index;
        return (index + 1) % suggestions.length;
      });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((index) => {
        if (!suggestions.length) return index;
        return (index - 1 + suggestions.length) % suggestions.length;
      });
    } else if (event.key === "Enter") {
      if (suggestions[highlightedIndex]) {
        event.preventDefault();
        selectSuggestion(suggestions[highlightedIndex]);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="flex flex-col gap-1 text-sm font-semibold text-brand-deep">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
          {label}
          {required ? " *" : ""}
        </span>
        <input
          type="search"
          value={query}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(null);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-brand-ink-muted/20 bg-white px-4 py-2 text-sm shadow-inner focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal-soft disabled:cursor-not-allowed disabled:opacity-70"
        />
      </label>
      {isOpen && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-2xl border border-brand-ink-muted/20 bg-white shadow-xl">
          {status === "loading" && (
            <div className="px-4 py-3 text-sm text-brand-ink-muted">Buscando estudiantes…</div>
          )}
          {status === "error" && (
            <div className="px-4 py-3 text-sm text-brand-orange">
              No pudimos cargar los estudiantes. Intenta de nuevo.
            </div>
          )}
          {status === "idle" && !suggestions.length && (
            <div className="px-4 py-3 text-sm text-brand-ink-muted">
              No encontramos estudiantes con ese criterio.
            </div>
          )}
          {status === "idle" && suggestions.length > 0 && (
            <ul className="max-h-56 overflow-auto py-1">
              {suggestions.map((suggestion, index) => {
                const active = index === highlightedIndex;
                return (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition hover:bg-brand-teal-soft/50 ${
                        active ? "bg-brand-teal-soft/60 text-brand-deep" : "text-brand-ink"
                      }`}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectSuggestion(suggestion);
                      }}
                    >
                      <span>{suggestion.fullName}</span>
                      <span className="text-xs text-brand-ink-muted">#{suggestion.id}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}


type ExamFormProps = {
  mode: "create" | "edit";
  event?: CalendarEvent;
  defaultDate?: string;
  onCancel(): void;
  onCompleted(): void;
};

function ExamForm({ mode, event, defaultDate, onCancel, onCompleted }: ExamFormProps) {
  const initialStudent: StudentSuggestion | null = event?.studentId
    ? { id: event.studentId, fullName: event.title }
    : null;
  const [student, setStudent] = useState<StudentSuggestion | null>(initialStudent);
  const [dateTime, setDateTime] = useState(() =>
    event ? toLocalInputValue(event.startTime) : defaultDate ?? "",
  );
  const [examType, setExamType] = useState(() => event?.status ?? "");
  const [level, setLevel] = useState(() => event?.level ?? "");
  const [status, setStatus] = useState<StatusFilter>(() => {
    const parsed = event ? parseStatusParam(event.status ?? "scheduled") : "scheduled";
    return parsed === "all" ? "scheduled" : parsed;
  });
  const [score, setScore] = useState(() =>
    event?.score != null ? String(event.score) : "",
  );
  const [passed, setPassed] = useState<null | boolean>(
    event?.passed == null ? null : Boolean(event.passed),
  );
  const [notes, setNotes] = useState(() => event?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setStudent(initialStudent);
  }, [event?.id]);

  const requiresResult = status === "approved" || status === "failed";

  const handleStatusChange = (nextStatus: StatusFilter) => {
    setStatus(nextStatus);
    if (nextStatus === "approved") {
      setPassed(true);
    } else if (nextStatus === "failed") {
      setPassed(false);
    } else {
      setPassed(null);
    }

    if (nextStatus === "scheduled" || nextStatus === "cancelled") {
      setScore("");
    }
  };

  const handleSubmit = async (submissionEvent: React.FormEvent<HTMLFormElement>) => {
    submissionEvent.preventDefault();
    setError(null);

    if (!student) {
      setError("Debes seleccionar un estudiante.");
      return;
    }
    if (!dateTime) {
      setError("Debes indicar la fecha y hora del examen.");
      return;
    }
    if (!examType) {
      setError("Debes seleccionar el tipo de examen.");
      return;
    }
    if (!level) {
      setError("Debes seleccionar el nivel.");
      return;
    }

    const timeScheduled = convertInputToIso(dateTime);
    if (!timeScheduled) {
      setError("La fecha y hora seleccionadas no son válidas.");
      return;
    }

    const normalizedScore = score.trim().length ? Number(score) : null;
    if (normalizedScore != null && !Number.isFinite(normalizedScore)) {
      setError("Ingresa un porcentaje válido para la nota.");
      return;
    }

    if (requiresResult && passed == null) {
      setError("Debes indicar si aprobó el examen para este estado.");
      return;
    }

    if (status === "approved" && passed === false) {
      setError("Un examen aprobado debe marcarse como aprobado.");
      return;
    }

    if (status === "failed" && passed === true) {
      setError("Un examen reprobado no puede marcarse como aprobado.");
      return;
    }

    setSubmitting(true);
    try {
      const nextPassed =
        status === "approved" ? true : status === "failed" ? false : passed;
      const nextScore = requiresResult ? normalizedScore : null;

      const payload = {
        studentId: student.id,
        timeScheduled,
        status: examType,
        level,
        score: nextScore,
        passed: nextPassed,
        notes: notes.trim() ? notes.trim() : null,
      };

      const endpoint =
        mode === "create"
          ? "/api/administracion/calendario/exams"
          : `/api/administracion/calendario/exams/${event?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error ?? "No se pudo guardar el examen.");
      }

      onCompleted();
    } catch (submissionError) {
      console.error(submissionError);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo guardar el examen. Inténtalo nuevamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions = STATUS_OPTIONS.filter((option) => option.value !== "all");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <StudentSelector
          label="Estudiante"
          value={student}
          onChange={setStudent}
          required
          disabled={submitting}
          placeholder="Buscar por nombre"
        />
        <label className="flex flex-col gap-1 text-sm font-semibold text-brand-deep">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
            Fecha y hora
          </span>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(event) => setDateTime(event.target.value)}
            disabled={submitting}
            required
            className="w-full rounded-2xl border border-brand-ink-muted/20 bg-white px-4 py-2 text-sm shadow-inner focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal-soft disabled:cursor-not-allowed disabled:opacity-70"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-brand-deep">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
            Tipo de examen *
          </span>
          <select
            value={examType}
            onChange={(event) => setExamType(event.target.value)}
            disabled={submitting}
            required
            className="w-full rounded-2xl border border-brand-ink-muted/20 bg-white px-4 py-2 text-sm shadow-inner focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal-soft disabled:cursor-not-allowed disabled:opacity-70"
          >
            <option value="">Selecciona tipo</option>
            <option value="Speaking">Speaking</option>
            <option value="Writing">Writing</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-brand-deep">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
            Nivel *
          </span>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            disabled={submitting}
            required
            className="w-full rounded-2xl border border-brand-ink-muted/20 bg-white px-4 py-2 text-sm shadow-inner focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal-soft disabled:cursor-not-allowed disabled:opacity-70"
          >
            <option value="">Selecciona nivel</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-brand-deep">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
            Estado
          </span>
          <select
            value={status === "all" ? "scheduled" : status}
            onChange={(event) => handleStatusChange(event.target.value as StatusFilter)}
            disabled={submitting}
            className="w-full rounded-2xl border border-brand-ink-muted/20 bg-white px-4 py-2 text-sm shadow-inner focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal-soft disabled:cursor-not-allowed disabled:opacity-70"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {requiresResult && (
          <label className="flex flex-col gap-1 text-sm font-semibold text-brand-deep">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
              Resultado (%)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.1"
              value={score}
              onChange={(event) => setScore(event.target.value)}
              disabled={submitting}
              className="w-full rounded-2xl border border-brand-ink-muted/20 bg-white px-4 py-2 text-sm shadow-inner focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal-soft disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
        )}
        {requiresResult && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
              ¿Aprobó?
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPassed(true)}
                disabled={submitting}
                className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${
                  passed === true
                    ? "border-brand-teal bg-brand-teal text-white"
                    : "border-brand-ink-muted/20 bg-white text-brand-ink"
                }`}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setPassed(false)}
                disabled={submitting}
                className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${
                  passed === false
                    ? "border-brand-ink bg-brand-ink text-white"
                    : "border-brand-ink-muted/20 bg-white text-brand-ink"
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setPassed(null)}
                disabled={submitting}
                className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${
                  passed == null
                    ? "border-brand-ink-muted bg-brand-ink-muted/20 text-brand-ink"
                    : "border-brand-ink-muted/20 bg-white text-brand-ink"
                }`}
              >
                Sin dato
              </button>
            </div>
          </div>
        )}
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold text-brand-deep">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
          Notas
        </span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={submitting}
          rows={4}
          className="w-full rounded-2xl border border-brand-ink-muted/20 bg-white px-4 py-2 text-sm shadow-inner focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal-soft disabled:cursor-not-allowed disabled:opacity-70"
        />
      </label>
      {error && (
        <div className="rounded-2xl border border-brand-orange bg-white/80 px-4 py-3 text-sm font-medium text-brand-ink">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-70"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-wait disabled:opacity-70"
        >
          {submitting
            ? mode === "create"
              ? "Guardando…"
              : "Actualizando…"
            : mode === "create"
              ? "Guardar examen"
              : "Actualizar examen"}
        </button>
      </div>
    </form>
  );
}


type ActivityFormProps = {
  mode: "create" | "edit";
  event?: CalendarEvent;
  defaultDate?: string;
  onCancel(): void;
  onCompleted(): void;
};

function ActivityForm({ mode, event, defaultDate, onCancel, onCompleted }: ActivityFormProps) {
  const [title, setTitle] = useState(() => event?.title ?? "");
  const [description, setDescription] = useState(() => event?.notes ?? "");
  const [activityKind, setActivityKind] = useState(() =>
    event?.status && event.kind === "activity" ? event.status : "activity",
  );
  const [dateTime, setDateTime] = useState(() =>
    event ? toLocalInputValue(event.startTime) : defaultDate ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (submissionEvent: React.FormEvent<HTMLFormElement>) => {
    submissionEvent.preventDefault();
    setError(null);

    if (!title.trim().length) {
      setError("El título de la actividad es obligatorio.");
      return;
    }
    if (!dateTime) {
      setError("Debes indicar la fecha y hora de la actividad.");
      return;
    }
    const startTime = convertInputToIso(dateTime);
    if (!startTime) {
      setError("La fecha y hora seleccionadas no son válidas.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        startTime,
        kind: activityKind.trim() ? activityKind.trim() : "activity",
      };
      const endpoint =
        mode === "create"
          ? "/api/administracion/calendario/activities"
          : `/api/administracion/calendario/activities/${event?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error ?? "No se pudo guardar la actividad.");
      }
      onCompleted();
    } catch (submissionError) {
      console.error(submissionError);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo guardar la actividad. Inténtalo nuevamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-semibold text-brand-deep">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
            Título
          </span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={submitting}
            required
            className="w-full rounded-2xl border border-brand-ink-muted/20 bg-white px-4 py-2 text-sm shadow-inner focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal-soft disabled:cursor-not-allowed disabled:opacity-70"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-brand-deep">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
            Fecha y hora
          </span>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(event) => setDateTime(event.target.value)}
            disabled={submitting}
            required
            className="w-full rounded-2xl border border-brand-ink-muted/20 bg-white px-4 py-2 text-sm shadow-inner focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal-soft disabled:cursor-not-allowed disabled:opacity-70"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-brand-deep md:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
            Tipo de actividad
          </span>
          <input
            type="text"
            value={activityKind}
            onChange={(event) => setActivityKind(event.target.value)}
            disabled={submitting}
            className="w-full rounded-2xl border border-brand-ink-muted/20 bg-white px-4 py-2 text-sm shadow-inner focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal-soft disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="activity"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold text-brand-deep">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
          Descripción
        </span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={submitting}
          rows={4}
          className="w-full rounded-2xl border border-brand-ink-muted/20 bg-white px-4 py-2 text-sm shadow-inner focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal-soft disabled:cursor-not-allowed disabled:opacity-70"
        />
      </label>
      {error && (
        <div className="rounded-2xl border border-brand-orange bg-white/80 px-4 py-3 text-sm font-medium text-brand-ink">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-70"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-wait disabled:opacity-70"
        >
          {submitting
            ? mode === "create"
              ? "Guardando…"
              : "Actualizando…"
            : mode === "create"
              ? "Guardar actividad"
              : "Actualizar actividad"}
        </button>
      </div>
    </form>
  );
}

type EventDetailProps = {
  event: CalendarEvent;
  onEdit(): void;
  onDelete(): void;
  onClose(): void;
};

type StudentPreviewProfile = {
  id: number;
  fullName: string;
  photoUrl: string | null;
  photoUpdatedAt: string | null;
};

function EventDetail({ event, onEdit, onDelete, onClose }: EventDetailProps) {
  const [studentPreview, setStudentPreview] = useState<StudentPreviewProfile | null>(null);
  const [studentPreviewLoading, setStudentPreviewLoading] = useState(false);

  useEffect(() => {
    if (event.kind !== "exam" || event.studentId == null) {
      setStudentPreview(null);
      setStudentPreviewLoading(false);
      return;
    }

    let isActive = true;
    const controller = new AbortController();
    const studentId = event.studentId;

    setStudentPreviewLoading(true);
    setStudentPreview((previous) => {
      if (previous && previous.id === studentId) {
        return previous;
      }
      return {
        id: studentId,
        fullName: event.title,
        photoUrl: null,
        photoUpdatedAt: null,
      };
    });

    async function loadStudentPreview() {
      try {
        const response = await fetch(`/api/students/${studentId}/basic-details`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Estado ${response.status}`);
        }

        const payload = (await response.json().catch(() => ({}))) as Partial<{
          fullName: unknown;
          photoUrl: unknown;
          photoUpdatedAt: unknown;
        }>;

        if (!isActive) {
          return;
        }

        const resolvedName =
          typeof payload.fullName === "string" && payload.fullName.trim().length
            ? payload.fullName.trim()
            : event.title;
        const resolvedPhotoUrl =
          typeof payload.photoUrl === "string" && payload.photoUrl.trim().length
            ? payload.photoUrl.trim()
            : null;
        const resolvedUpdatedAt =
          typeof payload.photoUpdatedAt === "string" && payload.photoUpdatedAt.trim().length
            ? payload.photoUpdatedAt
            : null;

        setStudentPreview({
          id: studentId,
          fullName: resolvedName,
          photoUrl: resolvedPhotoUrl,
          photoUpdatedAt: resolvedUpdatedAt,
        });
        setStudentPreviewLoading(false);
      } catch (error) {
        if (controller.signal.aborted || !isActive) {
          return;
        }
        console.error("No se pudo cargar el perfil del estudiante.", error);
        setStudentPreview({
          id: studentId,
          fullName: event.title,
          photoUrl: null,
          photoUpdatedAt: null,
        });
        setStudentPreviewLoading(false);
      }
    }

    void loadStudentPreview();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [event.kind, event.studentId, event.title]);

  const studentProfile =
    event.kind === "exam" && event.studentId != null ? studentPreview : null;
  const studentName =
    studentProfile && studentProfile.fullName.trim().length
      ? studentProfile.fullName
      : event.title;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-ink-muted">
            {event.kind === "exam" ? "Examen" : "Actividad"}
          </span>
          <h2 className="text-xl font-bold text-brand-deep">{event.title}</h2>
          <p className="text-sm text-brand-ink-muted">
            {formatDateTime(event.startTime)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-transparent px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-ink-muted transition hover:border-brand-teal hover:bg-brand-teal-soft/60 hover:text-brand-deep focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
        >
          Cerrar
        </button>
      </div>
      <dl className="grid gap-3 text-sm text-brand-ink">
        {event.kind === "exam" && event.studentId != null && (
          <div className="flex flex-col gap-1">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
              Perfil del estudiante
            </dt>
            <dd>
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-full shadow-[0_10px_24px_rgba(15,23,42,0.18)] ring-1 ring-brand-ink-muted/15 ${studentPreviewLoading ? "animate-pulse" : ""}`.trim()}
                >
                  <StudentAvatar
                    name={studentName}
                    photoUrl={studentProfile?.photoUrl ?? null}
                    updatedAt={studentProfile?.photoUpdatedAt ?? null}
                    size={64}
                    className="shadow-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-brand-deep">{studentName}</span>
                  <Link
                    href={`/administracion/gestion-estudiantes/${event.studentId}`}
                    className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-teal transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                  >
                    Ver perfil del estudiante
                  </Link>
                </div>
              </div>
            </dd>
          </div>
        )}
        {event.kind === "exam" && event.status && (
          <div className="flex flex-col gap-1">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
              Tipo de examen
            </dt>
            <dd>{event.status}</dd>
          </div>
        )}
        {event.kind === "exam" && event.level && (
          <div className="flex flex-col gap-1">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
              Nivel
            </dt>
            <dd>{event.level}</dd>
          </div>
        )}
        {event.kind === "exam" && event.score != null && (
          <div className="flex flex-col gap-1">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
              Nota
            </dt>
            <dd>{event.score}%</dd>
          </div>
        )}
        {event.kind === "exam" && event.passed != null && (
          <div className="flex flex-col gap-1">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
              ¿Aprobó?
            </dt>
            <dd>{event.passed ? "Sí" : "No"}</dd>
          </div>
        )}
        {event.notes && (
          <div className="flex flex-col gap-1">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
              Notas
            </dt>
            <dd className="whitespace-pre-line text-sm text-brand-ink">{event.notes}</dd>
          </div>
        )}
      </dl>
      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-ink shadow transition hover:-translate-y-[1px] hover:border-brand-orange hover:bg-[#ffe8d7] hover:text-brand-deep focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
        >
          Eliminar
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
        >
          Editar
        </button>
      </div>
    </div>
  );
}

type DeleteConfirmationProps = {
  event: CalendarEvent;
  onCancel(): void;
  onConfirm(): void;
  loading: boolean;
};

function DeleteConfirmation({ event, onCancel, onConfirm, loading }: DeleteConfirmationProps) {
  const description =
    event.kind === "exam"
      ? "Esta acción eliminará el examen del calendario y de los registros del estudiante."
      : "Eliminarás la actividad y dejará de mostrarse en el calendario.";

  const title =
    event.kind === "exam"
      ? "¿Eliminar este examen?"
      : "¿Eliminar esta actividad?";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-ink-muted">
          Confirmar eliminación
        </span>
        <h2 className="text-lg font-bold text-brand-deep">{title}</h2>
        <p className="text-sm text-brand-ink-muted">{description}</p>
      </div>
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-ink shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-70"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-orange px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#e46418] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? "Eliminando…" : "Sí, eliminar"}
        </button>
      </div>
    </div>
  );
}

function toLocalInputValue(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function convertInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getDefaultDateTime(base: Date): string {
  const dateKey = formatDateParam(base);
  return `${dateKey}T09:00`;
}

function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = getDateKey(new Date(event.startTime));
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(event);
  }
  for (const [, list] of grouped) {
    list.sort((a, b) => {
      const diff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      if (diff !== 0) return diff;
      return a.id - b.id;
    });
  }
  return grouped;
}

function getEventStyle(event: CalendarEvent): {
  className: string;
  accentClassName: string;
} {
  if (event.kind === "exam") {
    // Check if exam is in the future
    const now = new Date();
    const examTime = new Date(event.startTime);
    const isFuture = examTime > now;
    
    const status = event.status?.trim().toLowerCase() ?? "scheduled";

    // If exam is in the future, always show as scheduled (blue)
    if (isFuture) {
      const style = EXAM_EVENT_STYLES.scheduled;
      return { className: style.container, accentClassName: style.accent };
    }

    // For past exams, check status
    if (["cancelled", "cancelado", "cancelada"].includes(status)) {
      const style = EXAM_EVENT_STYLES.cancelled;
      return { className: style.container, accentClassName: style.accent };
    }

    if (
      status === "approved" ||
      status === "passed" ||
      status === "aprobado" ||
      status === "aprobada" ||
      event.passed === true
    ) {
      const style = EXAM_EVENT_STYLES.approved;
      return { className: style.container, accentClassName: style.accent };
    }

    if (
      status === "failed" ||
      status === "reprobado" ||
      status === "reprobada" ||
      event.passed === false
    ) {
      const style = EXAM_EVENT_STYLES.failed;
      return { className: style.container, accentClassName: style.accent };
    }

    // Default to scheduled if no clear status
    const style = EXAM_EVENT_STYLES.scheduled;
    return { className: style.container, accentClassName: style.accent };
  }

  const style = EXAM_EVENT_STYLES.activity;
  return { className: style.container, accentClassName: style.accent };
}

type CalendarFetchState = "idle" | "loading" | "error";

export function AdminCalendarDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [fetchState, setFetchState] = useState<CalendarFetchState>("loading");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [studentFilterSelection, setStudentFilterSelection] =
    useState<StudentSuggestion | null>(null);

  const viewParam = searchParams.get("view");
  const typeParam = searchParams.get("tipo");
  const statusParam = searchParams.get("estado");
  const studentParam = searchParams.get("estudiante");
  const startParam = searchParams.get("start");

  const view = parseViewParam(viewParam);
  const typeFilter = parseTypeParam(typeParam);
  const statusFilter = parseStatusParam(statusParam);
  const studentIdFilter = parseStudentIdParam(studentParam);
  const startDate = useMemo(
    () => parseStartParam(startParam, view),
    [startParam, view],
  );

  const range = useMemo(() => getRange(view, startDate), [view, startDate]);

  const replaceParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      updater(next);
      const queryString = next.toString();
      const url = queryString.length ? `${pathname}?${queryString}` : pathname;
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const updateStart = useCallback(
    (date: Date, nextView?: CalendarView) => {
      replaceParams((params) => {
        params.set("start", formatDateParam(date));
        if (nextView) {
          if (nextView === "month") {
            params.delete("view");
          } else {
            params.set("view", nextView);
          }
        }
      });
    },
    [replaceParams],
  );

  const updateView = useCallback(
    (nextView: CalendarView) => {
      const normalized = normalizeForView(startDate, nextView);
      updateStart(normalized, nextView);
    },
    [startDate, updateStart],
  );

  const updateTypeFilter = useCallback(
    (nextType: CalendarTypeFilter) => {
      replaceParams((params) => {
        if (nextType === "all") {
          params.delete("tipo");
        } else {
          params.set("tipo", nextType);
        }
        if (nextType !== "exam") {
          params.delete("estado");
          params.delete("estudiante");
        }
      });
    },
    [replaceParams],
  );

  const updateStatusFilter = useCallback(
    (nextStatus: StatusFilter) => {
      replaceParams((params) => {
        if (nextStatus === "all") {
          params.delete("estado");
        } else {
          params.set("estado", nextStatus);
          if (params.get("tipo") !== "exam") {
            params.set("tipo", "exam");
          }
        }
      });
    },
    [replaceParams],
  );

  const updateStudentFilter = useCallback(
    (student: StudentSuggestion | null) => {
      setStudentFilterSelection(student);
      replaceParams((params) => {
        if (!student) {
          params.delete("estudiante");
        } else {
          params.set("estudiante", String(student.id));
          if (params.get("tipo") !== "exam") {
            params.set("tipo", "exam");
          }
        }
      });
    },
    [replaceParams],
  );

  const goToPrevious = useCallback(() => {
    if (view === "month") {
      updateStart(addMonths(startDate, -1));
      return;
    }
    if (view === "week") {
      updateStart(addWeeks(startDate, -1));
      return;
    }
    updateStart(addDays(startDate, -1));
  }, [startDate, updateStart, view]);

  const goToNext = useCallback(() => {
    if (view === "month") {
      updateStart(addMonths(startDate, 1));
      return;
    }
    if (view === "week") {
      updateStart(addWeeks(startDate, 1));
      return;
    }
    updateStart(addDays(startDate, 1));
  }, [startDate, updateStart, view]);

  const goToToday = useCallback(() => {
    const now = new Date();
    const normalized = normalizeForView(now, view);
    updateStart(normalized);
  }, [updateStart, view]);

  const refreshEvents = useCallback(() => {
    setRefreshCounter((value) => value + 1);
  }, []);

  useEffect(() => {
    if (typeFilter !== "exam") {
      setStudentFilterSelection(null);
      return;
    }
    if (!studentIdFilter) {
      setStudentFilterSelection(null);
      return;
    }
    setStudentFilterSelection((current) => {
      if (current && current.id === studentIdFilter) {
        return current;
      }
      return {
        id: studentIdFilter,
        fullName: `Estudiante #${studentIdFilter}`,
      };
    });
  }, [studentIdFilter, typeFilter]);

  useEffect(() => {
    const controller = new AbortController();
    setFetchState("loading");
    setFetchError(null);

    const params = new URLSearchParams({
      start: range.start.toISOString(),
      end: range.end.toISOString(),
    });
    if (typeFilter === "exam") {
      params.set("kind", "exam");
    } else if (typeFilter === "activity") {
      params.set("kind", "activity");
    }
    if (typeFilter === "exam" && statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    if (typeFilter === "exam" && studentIdFilter) {
      params.set("studentId", String(studentIdFilter));
    }

    fetch(`/api/administracion/calendario/events?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "No se pudo cargar el calendario.");
        }
        const payload = (await response.json()) as { events?: CalendarEvent[] };
        if (controller.signal.aborted) return;
        setEvents(Array.isArray(payload.events) ? payload.events : []);
        setFetchState("idle");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error("Error al cargar eventos", error);
        setEvents([]);
        setFetchState("error");
        setFetchError(
          error instanceof Error
            ? error.message
            : "No pudimos cargar los eventos. Intenta nuevamente.",
        );
      });

    return () => controller.abort();
  }, [range.start, range.end, typeFilter, statusFilter, studentIdFilter, refreshCounter]);

  const groupedEvents = useMemo(() => groupEventsByDate(events), [events]);

  const openChooser = useCallback(
    (reference?: Date) => {
      setDialog({ type: "chooser", referenceDate: reference });
    },
    [],
  );

  const openCreateExam = useCallback(
    (reference?: Date) => {
      setDialog({
        type: "create-exam",
        defaultDate: reference ? getDefaultDateTime(reference) : getDefaultDateTime(startDate),
      });
    },
    [startDate],
  );

  const openCreateActivity = useCallback(
    (reference?: Date) => {
      setDialog({
        type: "create-activity",
        defaultDate: reference ? getDefaultDateTime(reference) : getDefaultDateTime(startDate),
      });
    },
    [startDate],
  );

  const closeDialog = useCallback(() => setDialog({ type: "none" }), []);

  const handleDaySelection = useCallback(
    (date: Date) => {
      openChooser(date);
    },
    [openChooser],
  );

  const handleEventSelection = useCallback((event: CalendarEvent) => {
    setDialog({ type: "view", event });
  }, []);

  const handleDeletion = useCallback(
    async (event: CalendarEvent) => {
      const endpoint =
        event.kind === "exam"
          ? `/api/administracion/calendario/exams/${event.id}`
          : `/api/administracion/calendario/activities/${event.id}`;
      const response = await fetch(endpoint, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.error ?? "No se pudo eliminar el evento. Intenta nuevamente.",
        );
      }
    },
    [],
  );

  const renderMonthView = () => {
    const days = buildMonthDays(range.start);
    return (
      <div className="rounded-[36px] border border-white/70 bg-white/95 p-4 shadow-[0_32px_64px_rgba(15,23,42,0.12)]">
        <div className="grid grid-cols-7 gap-2 pb-4 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
          {WEEKDAY_ORDER.map((index) => (
            <div key={index}>{formatDayHeader(index)}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const key = getDateKey(day);
            const dayEvents = groupedEvents.get(key) ?? [];
            const isCurrentMonth = day.getUTCMonth() === range.start.getUTCMonth();
            const isToday = getDateKey(day) === getDateKey(new Date());
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleDaySelection(day)}
                className={`flex min-h-[120px] flex-col gap-2 rounded-3xl border px-3 pb-3 pt-2 text-left transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/40 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${
                  isCurrentMonth
                    ? "border-brand-ink-muted/20 bg-white"
                    : "border-dashed border-brand-ink-muted/20 bg-white/70 text-brand-ink-muted"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-brand-ink">
                  <span className={`${isToday ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-teal text-white" : "text-brand-ink"}`}>
                    {getDayNumber(day)}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.28em] text-brand-ink-muted">
                    {DAY_NAME_FULL_FORMATTER.format(day).slice(0, 3)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {dayEvents.map((event) => {
                    const style = getEventStyle(event);
                    const examType = event.kind === "exam" ? getExamTypeDisplay(event) : null;
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={(eventObject) => {
                          eventObject.stopPropagation();
                          handleEventSelection(event);
                        }}
                        title={getEventTooltip(event)}
                        className={`group relative flex flex-col gap-0.5 rounded-2xl px-3 py-2 text-left text-xs transition hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${style.className}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 flex-shrink-0 rounded-full ${style.accentClassName}`} />
                          <span className="flex-1 truncate font-semibold">{event.title}</span>
                        </div>
                        <div className="ml-4 flex items-center gap-2 text-[10px] font-normal text-current/80">
                          <span>{formatTime(event.startTime)}</span>
                          {examType && (
                            <>
                              <span>•</span>
                              <span className="truncate">{examType}</span>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const days = Array.from({ length: 7 }, (_, index) => addDays(range.start, index));
    return (
      <div className="rounded-[36px] border border-white/70 bg-white/95 p-4 shadow-[0_32px_64px_rgba(15,23,42,0.12)]">
        <div className="grid grid-cols-7 gap-4">
          {days.map((day) => {
            const key = getDateKey(day);
            const dayEvents = groupedEvents.get(key) ?? [];
            const isToday = getDateKey(day) === getDateKey(new Date());
            return (
              <div key={key} className="flex flex-col gap-3 rounded-3xl border border-brand-ink-muted/15 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-ink-muted">
                      {DAY_NAME_FULL_FORMATTER.format(day)}
                    </span>
                    <span className={`text-lg font-bold ${isToday ? "text-brand-teal" : "text-brand-deep"}`}>
                      {formatDateLabel(day)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDaySelection(day)}
                    className="rounded-full border border-transparent px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted transition hover:border-brand-teal hover:bg-brand-teal-soft/50 hover:text-brand-deep focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                  >
                    Nuevo
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {dayEvents.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-brand-ink-muted/30 bg-white/60 px-3 py-6 text-center text-xs text-brand-ink-muted">
                      Sin eventos para este día
                    </div>
                  )}
                  {dayEvents.map((event) => {
                    const style = getEventStyle(event);
                    const examType = event.kind === "exam" ? getExamTypeDisplay(event) : null;
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleEventSelection(event)}
                        title={getEventTooltip(event)}
                        className={`group flex flex-col gap-1 rounded-2xl px-3 py-2 text-left text-xs transition hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${style.className}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex h-2 w-2 flex-shrink-0 rounded-full ${style.accentClassName}`} />
                          <span className="flex-1 truncate font-semibold">{event.title}</span>
                        </div>
                        <div className="ml-4 flex items-center gap-2 text-[10px] font-normal text-current/80">
                          <span>{formatTime(event.startTime)}</span>
                          {examType && (
                            <>
                              <span>•</span>
                              <span className="truncate">{examType}</span>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = groupedEvents.get(getDateKey(range.start)) ?? [];
    const referenceDate = range.start;
    return (
      <div className="rounded-[36px] border border-white/70 bg-white/95 p-6 shadow-[0_32px_64px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-between gap-4 border-b border-brand-ink-muted/15 pb-4">
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-ink-muted">
              Día seleccionado
            </span>
            <span className="text-2xl font-bold text-brand-deep">{formatDateLabel(referenceDate)}</span>
          </div>
          <button
            type="button"
            onClick={() => handleDaySelection(referenceDate)}
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
          >
            Nuevo evento
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {dayEvents.length === 0 && (
            <div className="rounded-3xl border border-dashed border-brand-ink-muted/25 bg-white/80 px-4 py-12 text-center text-sm text-brand-ink-muted">
              No hay eventos para este día. Usa el botón “Nuevo evento” para crear uno.
            </div>
          )}
          {dayEvents.map((event) => {
            const style = getEventStyle(event);
            const examType = event.kind === "exam" ? getExamTypeDisplay(event) : null;
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => handleEventSelection(event)}
                title={getEventTooltip(event)}
                className={`group flex flex-col gap-2 rounded-3xl px-4 py-3 text-left transition hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${style.className}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">{event.title}</span>
                    <div className="flex items-center gap-2 text-xs font-normal text-current/80">
                      <span>{formatTime(event.startTime)}</span>
                      {examType && (
                        <>
                          <span>•</span>
                          <span>{examType}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {event.notes && (
                  <p className="text-xs font-normal text-brand-ink/80 line-clamp-3">{event.notes}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const currentView = view === "month" ? renderMonthView() : view === "week" ? renderWeekView() : renderDayView();

  const activeStatusBadge =
    typeFilter === "exam" && statusFilter !== "all"
      ? STATUS_BADGES[statusFilter] ?? null
      : null;

  const [pendingDeletion, setPendingDeletion] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (dialog.type === "delete") {
      setPendingDeletion(dialog.event);
    } else {
      setPendingDeletion(null);
      setDeleting(false);
    }
  }, [dialog]);

  const confirmDeletion = useCallback(async () => {
    if (!pendingDeletion) return;
    setDeleting(true);
    try {
      await handleDeletion(pendingDeletion);
      setDialog({ type: "none" });
      refreshEvents();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el evento. Intenta nuevamente.",
      );
    } finally {
      setDeleting(false);
    }
  }, [handleDeletion, pendingDeletion, refreshEvents]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-20 h-64 w-64 -rotate-[16deg] rounded-[38px] bg-[#e6f3ff] shadow-[0_32px_70px_rgba(15,23,42,0.1)]" />
        <div className="absolute -right-16 top-12 h-52 w-52 rotate-[14deg] rounded-[34px] bg-[#dcf9f1] shadow-[0_28px_64px_rgba(15,23,42,0.12)]" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[120%] -translate-x-1/2 rounded-t-[160px] bg-gradient-to-r from-[#fdf4ff] via-white to-[#dff7ed]" />
      </div>
      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 md:px-10 lg:px-14">
        <header className="flex flex-col gap-3 rounded-[32px] border border-white/70 bg-white/92 px-6 py-6 text-left shadow-[0_24px_56px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-teal-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-brand-teal">
              Organización
            </span>
            <Link
              href="/administracion"
              className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/40 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
            >
              Volver a panel
            </Link>
          </div>
          <div className="flex flex-col gap-2 text-brand-deep">
            <h1 className="text-3xl font-black sm:text-4xl">Calendario administrativo</h1>
            <p className="max-w-3xl text-sm text-brand-ink-muted sm:text-base">
              Coordina exámenes y actividades de la sede. Filtra por tipo, estado o estudiante y gestiona los eventos directamente desde la vista mensual, semanal o diaria.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => openChooser(startDate)}
              className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
            >
              Nuevo evento
            </button>
          </div>
        </header>

        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 rounded-[32px] border border-white/75 bg-white/95 px-5 py-4 shadow-[0_28px_60px_rgba(15,23,42,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {VIEW_OPTIONS.map((option) => {
                  const isActive = option.value === view;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateView(option.value)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${
                        isActive
                          ? "bg-brand-teal text-white shadow"
                          : "border border-brand-ink-muted/20 bg-white text-brand-ink"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 text-sm font-semibold text-brand-ink">
                  <button
                    type="button"
                    onClick={goToPrevious}
                    className="rounded-full border border-transparent bg-white px-3 py-1 text-sm font-semibold text-brand-ink shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                  >
                    ‹ Anterior
                  </button>
                  <button
                    type="button"
                    onClick={goToToday}
                    className="rounded-full border border-brand-ink-muted/20 bg-white px-3 py-1 text-sm font-semibold text-brand-ink shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={goToNext}
                    className="rounded-full border border-transparent bg-white px-3 py-1 text-sm font-semibold text-brand-ink shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                  >
                    Siguiente ›
                  </button>
                </div>
                {typeFilter === "exam" && (
                  <div className="flex items-center gap-2 rounded-full border border-brand-ink-muted/20 bg-white px-4 py-1.5 text-sm font-semibold text-brand-ink shadow">
                    <span className="text-[11px] uppercase tracking-[0.28em] text-brand-ink-muted">Estado</span>
                    {STATUS_OPTIONS.map((option) => {
                      if (option.value === "all") {
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateStatusFilter(option.value)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${
                              statusFilter === option.value
                                ? "bg-brand-teal text-white"
                                : "bg-transparent text-brand-ink"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      }
                      const isActive = statusFilter === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateStatusFilter(option.value)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${
                            isActive ? "bg-brand-teal text-white" : "bg-transparent text-brand-ink"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-brand-ink-muted/20 bg-white px-4 py-1.5 text-sm font-semibold text-brand-ink shadow">
                <span className="text-[11px] uppercase tracking-[0.28em] text-brand-ink-muted">Tipo</span>
                {TYPE_OPTIONS.map((option) => {
                  const isActive = option.value === typeFilter;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateTypeFilter(option.value)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${
                        isActive
                          ? "bg-brand-teal text-white"
                          : "bg-transparent text-brand-ink"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {typeFilter === "exam" && (
                <div className="flex items-center gap-3 rounded-full border border-brand-ink-muted/20 bg-white px-4 py-1.5 text-sm font-semibold text-brand-ink shadow">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-brand-ink-muted">Estudiante</span>
                  <StudentSelector
                    label="Buscar estudiante"
                    value={studentFilterSelection}
                    onChange={updateStudentFilter}
                    placeholder="Buscar"
                  />
                </div>
              )}

              {activeStatusBadge && (
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${activeStatusBadge.className}`}>
                  {activeStatusBadge.label}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            {EXAM_STATUS_LEGEND_ITEMS.map((item) => (
              <span
                key={item.key}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${item.className}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${item.accentClassName}`} />
                {item.label}
              </span>
            ))}
          </div>

          {fetchState === "error" && fetchError && (
            <div className="rounded-[32px] border border-brand-orange bg-white/85 px-6 py-4 text-sm font-medium text-brand-ink">
              {fetchError}
            </div>
          )}

          {fetchState === "loading" && (
            <div className="rounded-[32px] border border-white/70 bg-white/90 px-6 py-12 text-center text-sm text-brand-ink-muted shadow-[0_24px_58px_rgba(15,23,42,0.12)]">
              Cargando calendario…
            </div>
          )}

          {fetchState === "idle" && currentView}
        </section>
      </main>

      {dialog.type === "chooser" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] border border-white/80 bg-white/95 p-6 text-brand-ink shadow-[0_32px_64px_rgba(15,23,42,0.18)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-ink-muted">
                  Nuevo evento
                </span>
                <p className="text-base font-semibold text-brand-deep">
                  ¿Qué deseas crear?
                </p>
                <p className="text-sm text-brand-ink-muted">
                  Selecciona el tipo de evento y completaremos la fecha automáticamente.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => openCreateExam(dialog.referenceDate)}
                  className="inline-flex items-center justify-between rounded-3xl border border-brand-ink-muted/20 bg-white px-5 py-3 text-left text-sm font-semibold text-brand-ink shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                >
                  <span>Examen</span>
                  <span aria-hidden>→</span>
                </button>
                <button
                  type="button"
                  onClick={() => openCreateActivity(dialog.referenceDate)}
                  className="inline-flex items-center justify-between rounded-3xl border border-brand-ink-muted/20 bg-white px-5 py-3 text-left text-sm font-semibold text-brand-ink shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                >
                  <span>Actividad</span>
                  <span aria-hidden>→</span>
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-full border border-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-ink-muted transition hover:border-brand-teal hover:bg-brand-teal-soft/50 hover:text-brand-deep focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dialog.type === "create-exam" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[36px] border border-white/80 bg-white/95 p-6 text-brand-ink shadow-[0_32px_64px_rgba(15,23,42,0.2)]">
            <ExamForm
              mode="create"
              defaultDate={dialog.defaultDate}
              onCancel={closeDialog}
              onCompleted={() => {
                closeDialog();
                refreshEvents();
              }}
            />
          </div>
        </div>
      )}

      {dialog.type === "create-activity" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[36px] border border-white/80 bg-white/95 p-6 text-brand-ink shadow-[0_32px_64px_rgba(15,23,42,0.2)]">
            <ActivityForm
              mode="create"
              defaultDate={dialog.defaultDate}
              onCancel={closeDialog}
              onCompleted={() => {
                closeDialog();
                refreshEvents();
              }}
            />
          </div>
        </div>
      )}

      {dialog.type === "view" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[36px] border border-white/80 bg-white/95 p-6 text-brand-ink shadow-[0_32px_64px_rgba(15,23,42,0.2)]">
            <EventDetail
              event={dialog.event}
              onClose={closeDialog}
              onEdit={() =>
                setDialog({
                  type: dialog.event.kind === "exam" ? "edit-exam" : "edit-activity",
                  event: dialog.event,
                })
              }
              onDelete={() => setDialog({ type: "delete", event: dialog.event })}
            />
          </div>
        </div>
      )}

      {dialog.type === "edit-exam" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[36px] border border-white/80 bg-white/95 p-6 text-brand-ink shadow-[0_32px_64px_rgba(15,23,42,0.2)]">
            <ExamForm
              mode="edit"
              event={dialog.event}
              onCancel={closeDialog}
              onCompleted={() => {
                closeDialog();
                refreshEvents();
              }}
            />
          </div>
        </div>
      )}

      {dialog.type === "edit-activity" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[36px] border border-white/80 bg-white/95 p-6 text-brand-ink shadow-[0_32px_64px_rgba(15,23,42,0.2)]">
            <ActivityForm
              mode="edit"
              event={dialog.event}
              onCancel={closeDialog}
              onCompleted={() => {
                closeDialog();
                refreshEvents();
              }}
            />
          </div>
        </div>
      )}

      {dialog.type === "delete" && pendingDeletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] border border-white/80 bg-white/95 p-6 text-brand-ink shadow-[0_32px_64px_rgba(15,23,42,0.2)]">
            <DeleteConfirmation
              event={pendingDeletion}
              onCancel={closeDialog}
              onConfirm={confirmDeletion}
              loading={deleting}
            />
          </div>
        </div>
      )}
    </div>
  );
}

