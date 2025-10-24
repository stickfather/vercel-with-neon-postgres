"use client";

import {
  useCallback,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

import { EphemeralToast } from "@/components/ui/ephemeral-toast";
import type { LevelLessons } from "@/features/student-checkin/data/queries";
import type { StudentAttendanceHistoryEntry } from "@/features/administration/data/student-profile";

type AttendanceHistoryPanelProps = {
  studentId: number;
  entries: StudentAttendanceHistoryEntry[];
  errorMessage?: string | null;
  lessonOptions: LevelLessons[];
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

export function AttendanceHistoryPanel({
  studentId,
  entries,
  errorMessage,
  lessonOptions,
}: AttendanceHistoryPanelProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [checkInValue, setCheckInValue] = useState("");
  const [checkOutValue, setCheckOutValue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sortedEntries = entries
    .slice()
    .sort((a, b) => Date.parse(b.checkInTime) - Date.parse(a.checkInTime));

  const totalSessions = sortedEntries.length;
  const trackedSessions = sortedEntries.filter((entry) => entry.durationMinutes != null).length;
  const totalMinutes = sortedEntries.reduce(
    (sum, entry) => sum + (entry.durationMinutes != null ? entry.durationMinutes : 0),
    0,
  );
  const averageMinutes = trackedSessions ? totalMinutes / trackedSessions : 0;
  const latestCheckIn = sortedEntries[0]?.checkInTime ?? null;

  const groupedLessons = useMemo(() => {
    return lessonOptions
      .map((level) => ({
        level: level.level,
        lessons: level.lessons.map((lesson) => ({
          id: lesson.id,
          label: lesson.lesson,
        })),
      }))
      .filter((group) => group.lessons.length);
  }, [lessonOptions]);

  const closeDialog = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    setIsDialogOpen(false);
    setFormError(null);
    setSelectedLessonId("");
    setCheckInValue("");
    setCheckOutValue("");
  }, [isSubmitting]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      if (!checkInValue.trim()) {
        setFormError("Ingresa la fecha y hora de ingreso.");
        return;
      }

      let lessonIdValue: number | null = null;
      if (selectedLessonId.trim().length) {
        const parsed = Number(selectedLessonId);
        if (!Number.isFinite(parsed)) {
          setFormError("Selecciona una lección válida.");
          return;
        }
        lessonIdValue = parsed;
      }

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/administracion/student-attendance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId,
            lessonId: lessonIdValue,
            checkIn: checkInValue,
            checkOut: checkOutValue.trim().length ? checkOutValue : null,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            payload?.error ?? "No se pudo crear el registro de asistencia.",
          );
        }

        setToast({
          tone: "success",
          message: "Se agregó una sesión de asistencia.",
        });
        setIsDialogOpen(false);
        setSelectedLessonId("");
        setCheckInValue("");
        setCheckOutValue("");
        setFormError(null);
        startTransition(() => {
          router.refresh();
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo crear el registro de asistencia.";
        setFormError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      checkInValue,
      checkOutValue,
      router,
      selectedLessonId,
      startTransition,
      studentId,
    ],
  );

  return (
    <section className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/92 px-6 py-6 text-brand-deep shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
      {toast ? (
        <EphemeralToast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
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
        <div className="flex flex-col items-end gap-3 text-right text-sm text-brand-ink-muted">
          <button
            type="button"
            onClick={() => {
              setIsDialogOpen(true);
              setFormError(null);
            }}
            className="inline-flex items-center justify-center rounded-full bg-brand-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-wait disabled:opacity-70"
            disabled={isSubmitting || isPending}
          >
            Agregar sesión manual
          </button>
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

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] px-4 py-6 backdrop-blur-sm">
          <form
            className="w-full max-w-xl rounded-[32px] border border-white/80 bg-white/95 px-6 py-6 text-left text-brand-ink shadow-[0_26px_60px_rgba(15,23,42,0.24)]"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-4">
              <header className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-ink-muted">
                  Registrar asistencia manual
                </span>
                <h3 className="text-2xl font-black text-brand-deep">Agregar sesión</h3>
                <p className="text-sm text-brand-ink-muted">
                  Completa los datos para registrar una asistencia manual. Puedes dejar la salida en blanco si todavía está en curso.
                </p>
              </header>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-brand-ink" htmlFor="manual-lesson">
                  Lección
                </label>
                <select
                  id="manual-lesson"
                  value={selectedLessonId}
                  onChange={(event) => setSelectedLessonId(event.target.value)}
                  className="w-full rounded-3xl border border-brand-ink-muted/30 bg-white px-4 py-3 text-sm text-brand-ink shadow-inner focus:border-brand-teal focus:outline-none"
                >
                  <option value="">Sin lección específica</option>
                  {groupedLessons.map((group) => (
                    <optgroup key={group.level} label={group.level}>
                      {group.lessons.map((lesson) => (
                        <option key={lesson.id} value={lesson.id}>
                          {lesson.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-brand-ink" htmlFor="manual-checkin">
                  Ingreso
                </label>
                <input
                  id="manual-checkin"
                  type="datetime-local"
                  value={checkInValue}
                  onChange={(event) => setCheckInValue(event.target.value)}
                  className="w-full rounded-3xl border border-brand-ink-muted/30 bg-white px-4 py-3 text-sm text-brand-ink shadow-inner focus:border-brand-teal focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-brand-ink" htmlFor="manual-checkout">
                  Salida (opcional)
                </label>
                <input
                  id="manual-checkout"
                  type="datetime-local"
                  value={checkOutValue}
                  onChange={(event) => setCheckOutValue(event.target.value)}
                  className="w-full rounded-3xl border border-brand-ink-muted/30 bg-white px-4 py-3 text-sm text-brand-ink shadow-inner focus:border-brand-teal focus:outline-none"
                />
              </div>

              {formError ? (
                <div className="rounded-3xl border border-brand-orange bg-white/85 px-4 py-3 text-sm font-medium text-brand-ink">
                  {formError}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-wait disabled:opacity-70"
                >
                  {isSubmitting ? "Guardando…" : "Guardar sesión"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
