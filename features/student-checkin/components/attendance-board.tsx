"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActiveAttendance } from "@/features/student-checkin/data/queries";
import { getLevelAccent } from "../lib/level-colors";

type Props = {
  attendances: ActiveAttendance[];
};

export function AttendanceBoard({ attendances }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<ActiveAttendance | null>(
    null,
  );
  const [checkoutSuccess, setCheckoutSuccess] = useState<{
    name: string;
  } | null>(null);

  const formatter = useMemo(() => {
    return new Intl.DateTimeFormat("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const groupedAttendances = useMemo(() => {
    const groups = new Map<string, ActiveAttendance[]>();
    attendances.forEach((attendance) => {
      const levelKey = attendance.level?.trim() || "Sin nivel";
      if (!groups.has(levelKey)) {
        groups.set(levelKey, []);
      }
      groups.get(levelKey)!.push(attendance);
    });

    return Array.from(groups.entries()).sort(([levelA], [levelB]) =>
      levelA.localeCompare(levelB, "es", { sensitivity: "base" }),
    );
  }, [attendances]);

  const requestCheckout = (attendance: ActiveAttendance) => {
    setError(null);
    setPendingCheckout(attendance);
  };

  const confirmCheckout = async () => {
    if (!pendingCheckout) return;

    const attendance = pendingCheckout;
    setError(null);
    setLoadingId(attendance.id);
    try {
      const response = await fetch("/api/check-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ attendanceId: attendance.id }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo registrar la salida.");
      }

      setCheckoutSuccess({
        name: attendance.fullName.trim(),
      });
      setPendingCheckout(null);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos cerrar la asistencia. Inténtalo nuevamente.",
      );
    } finally {
      setLoadingId(null);
    }
  };

  const closeConfirmation = () => {
    setPendingCheckout(null);
  };

  const closeSuccessMessage = () => {
    setCheckoutSuccess(null);
  };

  if (!attendances.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[32px] border border-dashed border-white/70 bg-white/70 px-6 py-12 text-center text-brand-ink-muted shadow-inner">
        <span className="text-base font-semibold text-brand-deep-soft">
          Por ahora no hay estudiantes en clase.
        </span>
        <span className="text-sm">
          Cuando alguien se registre aparecerá aquí para que pueda retirarse con un toque.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && !pendingCheckout && (
        <div className="rounded-3xl border border-brand-orange bg-white/82 px-5 py-3 text-sm font-medium text-brand-ink">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-4">
        {groupedAttendances.map(([level, levelAttendances]) => {
          const accent = getLevelAccent(level);

          return (
            <section
              key={level}
              className="rounded-[28px] border border-white/60 bg-white/80 px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
            >
              <header className="mb-3 flex items-center justify-between gap-3 px-1">
                <span
                  className="inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: accent.background,
                    color: accent.primary,
                  }}
                >
                  Nivel {level}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-ink-muted">
                  {levelAttendances.length} en clase
                </span>
              </header>
              <div className="grid max-h-[70vh] grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2 overflow-y-auto pr-1 sm:[grid-template-columns:repeat(auto-fill,minmax(96px,1fr))] lg:[grid-template-columns:repeat(auto-fill,minmax(104px,1fr))]">
                {levelAttendances.map((attendance) => {
                  const accentForStudent = getLevelAccent(attendance.level);
                  const checkInDate = attendance.checkInTime
                    ? new Date(attendance.checkInTime)
                    : null;
                  const formattedTime = checkInDate
                    ? formatter.format(checkInDate)
                    : "";
                  const isLoading = loadingId === attendance.id;
                  const displayName = attendance.fullName.trim();
                  const bubbleLabel = formattedTime
                    ? `${displayName} • ${formattedTime}`
                    : displayName;

                  return (
                    <button
                      key={attendance.id}
                      type="button"
                      onClick={() => requestCheckout(attendance)}
                      disabled={isLoading}
                      className="group relative flex min-h-[52px] min-w-[88px] flex-col items-center justify-center rounded-2xl border px-2 py-2 text-center text-[11px] font-semibold leading-tight shadow-[0_10px_18px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-wait disabled:opacity-70"
                      style={{
                        backgroundColor: accentForStudent.base,
                        borderColor: accentForStudent.border,
                        color: accentForStudent.primary,
                      }}
                      title={bubbleLabel}
                      aria-label={bubbleLabel}
                    >
                      <span className="line-clamp-3 w-full break-words text-[11px] font-semibold tracking-tight">
                        {displayName}
                      </span>
                      {isLoading && (
                        <span className="text-[10px] font-medium uppercase tracking-wide opacity-90">
                          Registrando salida…
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {pendingCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.35)] px-4 py-6 backdrop-blur-sm">
          <div className="max-w-md rounded-[32px] border border-white/70 bg-white/95 p-6 text-brand-ink shadow-[0_24px_58px_rgba(15,23,42,0.18)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-ink-muted">
                  Confirmar salida
                </span>
                <p className="text-base font-semibold text-brand-deep">
                  ¿Estás seguro de que deseas registrar la salida de {pendingCheckout.fullName.trim()}?
                </p>
                <p className="text-sm text-brand-ink-muted">
                  Una vez confirmada, la asistencia se cerrará y el estudiante deberá registrarse nuevamente para la próxima clase.
                </p>
              </div>
              {error && (
                <div className="rounded-2xl border border-brand-orange bg-white/80 px-4 py-3 text-sm font-medium text-brand-ink">
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeConfirmation}
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmCheckout}
                  disabled={loadingId === pendingCheckout.id}
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-wait disabled:opacity-70"
                >
                  {loadingId === pendingCheckout.id ? "Registrando…" : "Sí, registrar salida"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {checkoutSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.35)] px-4 py-6 backdrop-blur-sm">
          <div className="max-w-md rounded-[32px] border border-white/70 bg-white/95 p-6 text-brand-ink shadow-[0_24px_58px_rgba(15,23,42,0.18)]">
            <div className="flex flex-col gap-4 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal text-white shadow-md">
                👋
              </span>
              <p className="text-lg font-semibold text-brand-deep">
                ¡Hasta pronto, {checkoutSuccess.name || "estudiante"}! Gracias por compartir esta sesión con nosotros.
              </p>
              <button
                type="button"
                onClick={closeSuccessMessage}
                className="inline-flex items-center justify-center self-center rounded-full border border-transparent bg-brand-deep px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#322d54] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
