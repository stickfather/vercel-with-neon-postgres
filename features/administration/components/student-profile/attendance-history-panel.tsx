"use client";

import type { StudentAttendanceHistoryEntry } from "@/features/administration/data/student-profile";

type AttendanceHistoryPanelProps = {
  entries: StudentAttendanceHistoryEntry[];
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

export function AttendanceHistoryPanel({ entries, errorMessage }: AttendanceHistoryPanelProps) {
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

  return (
    <section className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/92 px-6 py-6 text-brand-deep shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
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
    </section>
  );
}
