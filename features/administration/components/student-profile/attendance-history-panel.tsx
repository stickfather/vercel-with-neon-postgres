"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { StudentAttendanceHistoryEntry } from "@/features/administration/data/student-profile";
import type { LevelLessons } from "@/features/student-checkin/data/queries";
import { EphemeralToast } from "@/components/ui/ephemeral-toast";
import { queueableFetch } from "@/lib/offline/fetch";

type AttendanceHistoryPanelProps = {
  studentId: number;
  entries: StudentAttendanceHistoryEntry[];
  lessonCatalog: LevelLessons[];
  errorMessage?: string | null;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("es-EC", {
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return DATE_FORMATTER.format(parsed);
}

function formatTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "—";
  }
  return TIME_FORMATTER.format(parsed);
}

function formatDuration(minutes: number | null): string {
  if (minutes == null || !Number.isFinite(minutes)) {
    return "—";
  }
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const remainingMinutes = rounded % 60;
  if (hours && remainingMinutes) {
    return `${hours} h ${remainingMinutes} min`;
  }
  if (hours) {
    return `${hours} h`;
  }
  return `${remainingMinutes} min`;
}

function toLocalInputValue(date: Date): string {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function buildLessonLabel(entry: StudentAttendanceHistoryEntry): string {
  const parts: string[] = [];
  if (entry.levelCode?.trim()) {
    parts.push(entry.levelCode.trim());
  }
  if (entry.lessonLabel?.trim()) {
    parts.push(entry.lessonLabel.trim());
  } else if (entry.lessonSequence != null && Number.isFinite(entry.lessonSequence)) {
    parts.push(`Lección ${entry.lessonSequence}`);
  }
  if (!parts.length) {
    return "Sin dato";
  }
  return parts.join(" · ");
}

type ManagedAttendance = StudentAttendanceHistoryEntry & {
  isPending?: boolean;
};

export function AttendanceHistoryPanel({ studentId, entries, lessonCatalog, errorMessage }: AttendanceHistoryPanelProps) {
  const [history, setHistory] = useState<ManagedAttendance[]>(() => entries.slice());
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [checkInValue, setCheckInValue] = useState("");
  const [checkOutValue, setCheckOutValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entryPendingDeletion, setEntryPendingDeletion] = useState<ManagedAttendance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const lessonsByLevel = useMemo(() => {
    const map = new Map<string, LevelLessons["lessons"]>();
    lessonCatalog.forEach((entry) => {
      map.set(entry.level, entry.lessons);
    });
    return map;
  }, [lessonCatalog]);

  const lessonsForSelectedLevel = useMemo(() => {
    if (!selectedLevel) {
      return [] as LevelLessons["lessons"];
    }
    return lessonsByLevel.get(selectedLevel) ?? [];
  }, [lessonsByLevel, selectedLevel]);

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }
    if (!lessonsForSelectedLevel.length) {
      setSelectedLessonId(null);
      return;
    }
    setSelectedLessonId((previous) => {
      if (
        previous != null &&
        lessonsForSelectedLevel.some((lesson) => lesson.id === previous)
      ) {
        return previous;
      }
      return lessonsForSelectedLevel[0]?.id ?? null;
    });
  }, [isDialogOpen, lessonsForSelectedLevel]);

  useEffect(() => {
    setHistory((previous) => {
      const pending = previous.filter((entry) => entry.isPending);
      const incomingIds = new Set(entries.map((entry) => entry.id));
      const incomingCheckIns = new Set(
        entries
          .map((entry) => Date.parse(entry.checkInTime))
          .filter((value): value is number => Number.isFinite(value)),
      );
      const remainingPending = pending.filter((entry) => {
        if (incomingIds.has(entry.id)) {
          return false;
        }
        const timestamp = Date.parse(entry.checkInTime);
        if (Number.isFinite(timestamp) && incomingCheckIns.has(timestamp)) {
          return false;
        }
        return true;
      });
      return [...entries, ...remainingPending];
    });
  }, [entries]);

  const handleOpenDialog = useCallback(() => {
    const initialLevel = selectedLevel || lessonCatalog[0]?.level || "";
    const lessons = lessonsByLevel.get(initialLevel) ?? [];
    setSelectedLevel(initialLevel);
    setSelectedLessonId(lessons[0]?.id ?? null);
    setCheckInValue(toLocalInputValue(new Date()));
    setCheckOutValue("");
    setToast(null);
    setIsDialogOpen(true);
  }, [lessonCatalog, lessonsByLevel, selectedLevel]);

  const handleCreateAttendance = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedLessonId) {
        setToast({ tone: "error", message: "Selecciona una lección antes de guardar." });
        return;
      }

      const checkInIso = checkInValue.trim();
      if (!checkInIso) {
        setToast({ tone: "error", message: "Indica la fecha y hora de ingreso." });
        return;
      }

      const checkInDate = new Date(checkInIso);
      if (Number.isNaN(checkInDate.getTime())) {
        setToast({ tone: "error", message: "La fecha de ingreso no es válida." });
        return;
      }

      let checkoutIso: string | null = null;
      if (checkOutValue.trim()) {
        const checkOutDate = new Date(checkOutValue.trim());
        if (Number.isNaN(checkOutDate.getTime())) {
          setToast({ tone: "error", message: "La fecha de salida no es válida." });
          return;
        }
        if (checkOutDate <= checkInDate) {
          setToast({ tone: "error", message: "La salida debe ser posterior al ingreso." });
          return;
        }
        checkoutIso = checkOutDate.toISOString();
      }

      setIsSubmitting(true);
      try {
        const response = await queueableFetch(
          `/api/students/${studentId}/attendance`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lessonId: selectedLessonId,
              checkIn: checkInDate.toISOString(),
              checkOut: checkoutIso,
            }),
            offlineLabel: "attendance-create",
          },
        );

        const payload = (await response.json().catch(() => ({}))) as {
          attendance?: StudentAttendanceHistoryEntry;
          queued?: boolean;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload?.error ?? "No pudimos registrar la asistencia manual.");
        }

        if (payload.attendance) {
          setHistory((previous) => {
            const filtered = previous.filter(
              (entry) => entry.id !== payload.attendance!.id,
            );
            return [payload.attendance!, ...filtered];
          });
          setToast({ tone: "success", message: "Asistencia agregada correctamente." });
        } else {
          const lessonInfo = lessonsForSelectedLevel.find(
            (lesson) => lesson.id === selectedLessonId,
          );
          const pendingEntry: ManagedAttendance = {
            id: -Date.now(),
            checkInTime: checkInDate.toISOString(),
            checkOutTime: checkoutIso,
            levelCode: selectedLevel || lessonInfo?.level || null,
            lessonLabel: lessonInfo?.lesson ?? null,
            lessonSequence: lessonInfo?.sequence ?? null,
            durationMinutes:
              checkoutIso != null
                ? (new Date(checkoutIso).getTime() - checkInDate.getTime()) / 60000
                : null,
            isPending: true,
          };
          setHistory((previous) => [pendingEntry, ...previous]);
          setToast({
            tone: "success",
            message: "Asistencia guardada sin conexión. Se sincronizará automáticamente.",
          });
        }

        setIsDialogOpen(false);
        setCheckInValue("");
        setCheckOutValue("");
      } catch (error) {
        console.error(error);
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo registrar la asistencia manual.";
        setToast({ tone: "error", message });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      checkInValue,
      checkOutValue,
      lessonsForSelectedLevel,
      selectedLessonId,
      selectedLevel,
      studentId,
    ],
  );

  const handleCloseDialog = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    setIsDialogOpen(false);
    setCheckInValue("");
    setCheckOutValue("");
  }, [isSubmitting]);

  const handleRequestDelete = useCallback(
    (entry: ManagedAttendance) => {
      if (isDeleting || entry.isPending || !Number.isFinite(entry.id) || entry.id <= 0) {
        return;
      }
      setToast(null);
      setEntryPendingDeletion(entry);
    },
    [isDeleting],
  );

  const handleCancelDelete = useCallback(() => {
    if (isDeleting) {
      return;
    }
    setEntryPendingDeletion(null);
  }, [isDeleting]);

  const handleConfirmDelete = useCallback(async () => {
    if (!entryPendingDeletion) {
      return;
    }

    if (entryPendingDeletion.isPending || !Number.isFinite(entryPendingDeletion.id) || entryPendingDeletion.id <= 0) {
      setHistory((previous) => previous.filter((entry) => entry.id !== entryPendingDeletion.id));
      setToast({ tone: "success", message: "Registro de asistencia eliminado." });
      setEntryPendingDeletion(null);
      return;
    }

    setIsDeleting(true);
    try {
      const response = await queueableFetch(
        `/api/students/${studentId}/attendance/${entryPendingDeletion.id}`,
        {
          method: "DELETE",
          offlineLabel: "attendance-delete",
        },
      );

      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && payload != null && "error" in payload
            ? String((payload as { error?: unknown }).error ?? "")
            : "";
        throw new Error(message || "No se pudo eliminar el registro de asistencia.");
      }

      const isQueued =
        payload &&
        typeof payload === "object" &&
        payload != null &&
        "queued" in payload &&
        Boolean((payload as { queued?: unknown }).queued);

      setHistory((previous) => previous.filter((entry) => entry.id !== entryPendingDeletion.id));
      setToast({
        tone: "success",
        message: isQueued
          ? "Registro pendiente de eliminar. Se sincronizará al reconectar."
          : "Registro de asistencia eliminado.",
      });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el registro de asistencia.";
      setToast({ tone: "error", message });
    } finally {
      setIsDeleting(false);
      setEntryPendingDeletion(null);
    }
  }, [entryPendingDeletion, setHistory, studentId]);

  const sortedEntries = useMemo(
    () =>
      history
        .slice()
        .sort((a, b) => Date.parse(b.checkInTime) - Date.parse(a.checkInTime)),
    [history],
  );

  const totalSessions = sortedEntries.length;
  const trackedSessions = sortedEntries.filter((entry) => entry.durationMinutes != null).length;
  const totalMinutes = sortedEntries.reduce(
    (sum, entry) => sum + (entry.durationMinutes != null ? entry.durationMinutes : 0),
    0,
  );
  const averageMinutes = trackedSessions ? totalMinutes / trackedSessions : 0;
  const latestCheckIn = sortedEntries[0]?.checkInTime ?? null;
  const canCreateAttendance = lessonCatalog.length > 0;

  return (
    <section className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/92 px-6 py-6 text-brand-deep shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
      {toast ? (
        <EphemeralToast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-2xl font-bold text-brand-deep">Historial de asistencia</h2>
          <p className="text-sm text-brand-ink-muted">
            Registros recientes de ingreso y salida por lección para este estudiante.
          </p>
          <span className="text-xs uppercase tracking-wide text-brand-ink-muted">
            Último registro: {formatDate(latestCheckIn)} · {formatTime(latestCheckIn)}
          </span>
          {errorMessage ? (
            <p className="text-sm font-medium text-rose-600">{errorMessage}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex flex-wrap items-center justify-end gap-3 text-right text-sm text-brand-ink-muted">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide">Sesiones registradas</span>
              <span className="text-lg font-semibold text-brand-deep">{totalSessions}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide">Horas registradas</span>
              <span className="text-lg font-semibold text-brand-deep">
                {formatDuration(totalMinutes)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide">Duración promedio</span>
              <span className="text-lg font-semibold text-brand-deep">
                {formatDuration(averageMinutes)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenDialog}
            disabled={!canCreateAttendance}
            title={
              canCreateAttendance
                ? undefined
                : "No hay lecciones registradas para asignar a la asistencia."
            }
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Registrar asistencia manual
          </button>
        </div>
      </div>

      {sortedEntries.length ? (
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-sm">
            <table className="min-w-full divide-y divide-brand-deep-soft/40 text-sm">
              <thead className="bg-brand-deep-soft/20 text-xs uppercase tracking-wide text-brand-ink-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Nivel y lección</th>
                  <th className="px-4 py-3 text-left">Ingreso</th>
                  <th className="px-4 py-3 text-left">Salida</th>
                  <th className="px-4 py-3 text-left">Duración</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-deep-soft/30">
                {sortedEntries.map((entry) => {
                  const lessonLabel = buildLessonLabel(entry);
                  const checkoutLabel = entry.checkOutTime ? formatTime(entry.checkOutTime) : "En curso";
                  return (
                    <tr key={entry.id} className="odd:bg-white even:bg-brand-deep-soft/10">
                      <td className="px-4 py-3 font-medium text-brand-deep">{formatDate(entry.checkInTime)}</td>
                      <td className="px-4 py-3 text-brand-ink-muted">{lessonLabel}</td>
                      <td className="px-4 py-3 text-brand-ink-muted">{formatTime(entry.checkInTime)}</td>
                      <td className="px-4 py-3 text-brand-ink-muted">{checkoutLabel}</td>
                      <td className="px-4 py-3 text-brand-ink-muted">{formatDuration(entry.durationMinutes)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          title="Eliminar registro"
                          aria-label="Eliminar registro"
                          onClick={() => handleRequestDelete(entry)}
                          disabled={Boolean(entry.isPending) || isDeleting}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white text-brand-ink-muted shadow-sm transition hover:-translate-y-[1px] hover:border-brand-orange hover:bg-brand-orange/10 hover:text-brand-orange focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                            className="h-4 w-4"
                          >
                            <path d="M7.5 3a1 1 0 0 1 .89-.55h3.22a1 1 0 0 1 .89.55l.28.55H15a1 1 0 1 1 0 2h-.4l-.76 9.14A2 2 0 0 1 11.85 16h-3.7a2 2 0 0 1-1.99-1.81L5.4 5.55H5a1 1 0 1 1 0-2h1.32l.28-.55Zm1.62.45-.1.2H11l-.11-.2h-1.77ZM6.42 5.55l.72 8.57a.5.5 0 0 0 .5.45h3.72a.5.5 0 0 0 .5-.45l.72-8.57H6.42Z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-brand-ink-muted">
            Cada fila representa una asistencia registrada con su duración estimada. Se muestran hasta las últimas 60
            asistencias.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-brand-ink-muted/30 bg-white/80 px-6 py-12 text-center">
          <span className="text-lg font-semibold text-brand-deep">Sin registros de asistencia recientes</span>
          <p className="max-w-md text-sm text-brand-ink-muted">
            Aún no contamos con asistencias cerradas para este estudiante. Cuando registre ingresos y salidas, aparecerán
            aquí con sus detalles.
          </p>
        </div>
      )}
      {entryPendingDeletion ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white px-6 py-6 text-brand-deep shadow-[0_26px_60px_rgba(15,23,42,0.2)]">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold text-brand-deep">Eliminar registro de asistencia</h3>
              <p className="text-sm text-brand-ink-muted">¿Estás seguro? Esta acción no se puede deshacer.</p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/30 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow-sm transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-orange px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#e06820] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#f97316] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm">
          <form
            onSubmit={handleCreateAttendance}
            className="w-full max-w-xl rounded-[28px] border border-white/70 bg-white px-6 py-7 text-brand-deep shadow-[0_26px_60px_rgba(15,23,42,0.2)]"
          >
            <header className="mb-4 flex flex-col gap-1 text-left">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-teal">
                Registrar asistencia manual
              </span>
              <h3 className="text-xl font-black text-brand-deep">Agregar sesión al historial</h3>
              <p className="text-sm text-brand-ink-muted">
                Selecciona la lección y las horas correspondientes. Esta acción se sincronizará automáticamente si estás sin conexión.
              </p>
            </header>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
                Nivel
                <select
                  value={selectedLevel}
                  onChange={(event) => {
                    const level = event.target.value;
                    setSelectedLevel(level);
                    const lessons = lessonsByLevel.get(level) ?? [];
                    setSelectedLessonId(lessons[0]?.id ?? null);
                  }}
                  className="rounded-2xl border border-brand-deep-soft bg-white px-4 py-2 text-base shadow-inner focus:border-brand-teal"
                  required
                >
                  <option value="" disabled>
                    Selecciona un nivel
                  </option>
                  {lessonCatalog.map((entry) => (
                    <option key={entry.level} value={entry.level}>
                      {entry.level}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
                Lección
                {lessonsForSelectedLevel.length ? (
                  <select
                    value={selectedLessonId != null ? String(selectedLessonId) : ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSelectedLessonId(value ? Number(value) : null);
                    }}
                    className="rounded-2xl border border-brand-deep-soft bg-white px-4 py-2 text-base shadow-inner focus:border-brand-teal"
                    required
                  >
                    <option value="" disabled>
                      Selecciona una lección
                    </option>
                    {lessonsForSelectedLevel.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.lesson}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm font-normal text-brand-ink-muted">
                    No hay lecciones disponibles para este nivel.
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
                Ingreso
                <input
                  type="datetime-local"
                  value={checkInValue}
                  onChange={(event) => setCheckInValue(event.target.value)}
                  className="rounded-2xl border border-brand-deep-soft bg-white px-4 py-2 text-base shadow-inner focus:border-brand-teal"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
                Salida (opcional)
                <input
                  type="datetime-local"
                  value={checkOutValue}
                  onChange={(event) => setCheckOutValue(event.target.value)}
                  className="rounded-2xl border border-brand-deep-soft bg-white px-4 py-2 text-base shadow-inner focus:border-brand-teal"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCloseDialog}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/30 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow-sm transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedLessonId || !selectedLevel}
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Guardando…" : "Guardar asistencia"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
