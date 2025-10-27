"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActiveAttendance } from "@/features/student-checkin/data/queries";
import { getLevelAccent } from "../lib/level-colors";
import { EphemeralToast } from "@/components/ui/ephemeral-toast";
import {
  exceedsSessionDurationLimit,
  isAfterBubbleHideTime,
} from "@/lib/time/check-in-window";
import { queueableFetch } from "@/lib/offline/fetch";
import { FullScreenModal } from "@/components/ui/full-screen-modal";

type Props = {
  attendances: ActiveAttendance[];
};

function splitName(fullName: string): [string, string | null] {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return [fullName.trim(), null];
  }

  if (words.length >= 4) {
    const top = words.slice(0, 2).join(" ");
    const bottom = words.slice(2).join(" ");
    return [top, bottom || null];
  }

  const half = Math.ceil(words.length / 2);
  const top = words.slice(0, half).join(" ");
  const bottom = words.slice(half).join(" ");
  return [top, bottom || null];
}

export function AttendanceBoard({ attendances }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAttendances, setActiveAttendances] = useState(attendances);
  const [pendingCheckout, setPendingCheckout] = useState<ActiveAttendance | null>(
    null,
  );
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null,
  );
  const [resolvingExpired, setResolvingExpired] = useState(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shouldHideBubbles, setShouldHideBubbles] = useState(() =>
    isAfterBubbleHideTime(),
  );
  const [checkoutPreview, setCheckoutPreview] = useState<Date | null>(null);

  useEffect(() => {
    setActiveAttendances(attendances);
  }, [attendances]);

  const formatter = useMemo(() => {
    return new Intl.DateTimeFormat("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const fullDateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Guayaquil",
      }),
    [],
  );

  useEffect(() => {
    const updateVisibility = () => {
      setShouldHideBubbles(isAfterBubbleHideTime());
    };

    updateVisibility();
    const interval = setInterval(updateVisibility, 60_000);

    return () => {
      clearInterval(interval);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pendingCheckout) {
      setCheckoutPreview(null);
      return undefined;
    }
    setCheckoutPreview(new Date());
    const interval = setInterval(() => {
      setCheckoutPreview(new Date());
    }, 30_000);
    return () => {
      clearInterval(interval);
    };
  }, [pendingCheckout]);

  const groupedAttendances = useMemo(() => {
    const groups = new Map<string, ActiveAttendance[]>();
    activeAttendances.forEach((attendance) => {
      const levelKey = attendance.level?.trim() || "Sin nivel";
      if (!groups.has(levelKey)) {
        groups.set(levelKey, []);
      }
      groups.get(levelKey)!.push(attendance);
    });

    return Array.from(groups.entries()).sort(([levelA], [levelB]) =>
      levelA.localeCompare(levelB, "es", { sensitivity: "base" }),
    );
  }, [activeAttendances]);

  const checkoutSummary = useMemo(() => {
    if (!pendingCheckout) {
      return null;
    }

    const checkInDate = pendingCheckout.checkInTime
      ? new Date(pendingCheckout.checkInTime)
      : null;
    const checkOutDate = checkoutPreview;

    const validCheckIn =
      checkInDate && Number.isFinite(checkInDate.getTime()) ? checkInDate : null;
    const validCheckOut =
      checkOutDate && Number.isFinite(checkOutDate.getTime()) ? checkOutDate : null;

    const totalMinutes =
      validCheckIn && validCheckOut
        ? Math.max(
            0,
            Math.round(
              (validCheckOut.getTime() - validCheckIn.getTime()) / 60000,
            ),
          )
        : null;

    const totalLabel =
      totalMinutes != null
        ? `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(
            totalMinutes % 60,
          ).padStart(2, "0")}`
        : "—";

    return {
      checkInLabel: validCheckIn
        ? fullDateTimeFormatter.format(validCheckIn)
        : "—",
      checkOutLabel: validCheckOut
        ? fullDateTimeFormatter.format(validCheckOut)
        : "—",
      totalLabel,
    };
  }, [pendingCheckout, checkoutPreview, fullDateTimeFormatter]);

  const resolveExpiredAttendances = async () => {
    setError(null);
    setResolvingExpired(true);
    try {
      const response = await fetch("/api/attendance/resolve-stale", {
        method: "POST",
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "No pudimos actualizar las asistencias automáticamente.",
        );
      }

      const message =
        typeof payload?.message === "string"
          ? payload.message
          : "Actualizamos las asistencias vencidas automáticamente.";

      setToast({ tone: "success", message });

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        router.refresh();
      }, 320);
    } catch (resolveError) {
      console.error(resolveError);
      setToast({
        tone: "error",
        message:
          resolveError instanceof Error
            ? resolveError.message
            : "No pudimos actualizar las asistencias automáticamente.",
      });
    } finally {
      setResolvingExpired(false);
    }
  };

  const requestCheckout = (attendance: ActiveAttendance) => {
    setError(null);
    if (exceedsSessionDurationLimit(attendance.checkInTime)) {
      void resolveExpiredAttendances();
      return;
    }
    setPendingCheckout(attendance);
  };

  const confirmCheckout = async () => {
    if (!pendingCheckout) return;

    const attendance = pendingCheckout;
    setError(null);
    setLoadingId(attendance.id);
    try {
      const response = await queueableFetch("/api/check-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ attendanceId: attendance.id }),
        offlineLabel: "student-check-out",
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        queued?: boolean;
        attendances?: ActiveAttendance[];
      };

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo registrar la salida.");
      }

      if (Array.isArray(payload.attendances)) {
        setActiveAttendances(payload.attendances);
      } else {
        setActiveAttendances((previous) =>
          previous.filter((item) => item.id !== attendance.id),
        );
      }

      setPendingCheckout(null);
      setCheckoutPreview(null);
      setToast({
        tone: "success",
        message: payload?.queued
          ? `${attendance.fullName.trim()} saldrá registrado cuando vuelva la conexión.`
          : `${attendance.fullName.trim()} salió de clase. ¡Gracias!`,
      });

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        router.refresh();
      }, 320);
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
    setError(null);
    setCheckoutPreview(null);
  };

  if (shouldHideBubbles) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[32px] border border-dashed border-white/70 bg-white/80 px-6 py-12 text-center text-brand-ink-muted shadow-inner">
        <span className="text-base font-semibold text-brand-deep-soft">
          Las asistencias del día se ocultan después de las 20:30.
        </span>
        <span className="text-sm">
          Regresa mañana para ver quién está en clase.
        </span>
      </div>
    );
  }

  if (!activeAttendances.length) {
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
      {toast ? (
        <EphemeralToast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      ) : null}
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
              <div className="grid max-h-[70vh] grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-2 overflow-y-auto pr-2 sm:[grid-template-columns:repeat(auto-fit,minmax(68px,1fr))] lg:[grid-template-columns:repeat(auto-fit,minmax(72px,1fr))]">
                {levelAttendances.map((attendance) => {
                  const accentForStudent = getLevelAccent(attendance.level);
                  const checkInDate = attendance.checkInTime
                    ? new Date(attendance.checkInTime)
                    : null;
                  const formattedTime = checkInDate
                    ? formatter.format(checkInDate)
                    : "";
                  const isLoading =
                    resolvingExpired || loadingId === attendance.id;
                  const displayName = attendance.fullName.trim();
                  const bubbleLabel = formattedTime
                    ? `${displayName} • ${formattedTime}`
                    : displayName;
                  const [firstLine, secondLine] = splitName(displayName);

                  return (
                    <button
                      key={attendance.id}
                      type="button"
                      onClick={() => requestCheckout(attendance)}
                      disabled={isLoading}
                      className="group relative flex min-h-[46px] min-w-[60px] flex-col items-center justify-center gap-0.5 rounded-[16px] border px-2 py-2 text-center text-[10px] font-semibold leading-tight shadow-[0_6px_14px_rgba(15,23,42,0.12)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-wait disabled:opacity-70"
                      style={{
                        backgroundColor: accentForStudent.base,
                        borderColor: accentForStudent.border,
                        color: accentForStudent.primary,
                      }}
                      title={bubbleLabel}
                      aria-label={bubbleLabel}
                    >
                      <span className="w-full break-words text-[10px] font-semibold tracking-tight">
                        {firstLine}
                      </span>
                      {secondLine ? (
                        <span className="w-full break-words text-[10px] font-semibold tracking-tight">
                          {secondLine}
                        </span>
                      ) : null}
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

      <FullScreenModal
        open={Boolean(pendingCheckout)}
        onClose={closeConfirmation}
        title="Confirmar salida"
        description="Revisa los detalles antes de registrar la salida."
        footer={
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
              disabled={
                !pendingCheckout ||
                resolvingExpired ||
                loadingId === pendingCheckout.id
              }
              className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loadingId === pendingCheckout?.id ? "Confirmando…" : "Confirmar salida"}
            </button>
          </div>
        }
      >
        {pendingCheckout ? (
          <div className="flex flex-col gap-5">
            <p className="text-sm font-medium text-brand-ink-muted">
              ¿Confirmar salida?
            </p>
            {error ? (
              <div className="rounded-2xl border border-brand-orange bg-white/80 px-4 py-3 text-sm font-medium text-brand-ink">
                {error}
              </div>
            ) : null}
            <div className="rounded-[28px] border border-brand-ink-muted/10 bg-white/95 p-5 shadow-inner">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-ink-muted">
                    Estudiante
                  </dt>
                  <dd className="text-base font-semibold text-brand-deep">
                    {pendingCheckout.fullName.trim()}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-ink-muted">
                    Ingreso
                  </dt>
                  <dd className="text-sm font-semibold text-brand-deep">
                    {checkoutSummary?.checkInLabel ?? "—"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-ink-muted">
                    Salida estimada
                  </dt>
                  <dd className="text-sm font-semibold text-brand-deep">
                    {checkoutSummary?.checkOutLabel ?? "—"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-ink-muted">
                    Tiempo total
                  </dt>
                  <dd className="flex flex-col text-sm font-semibold text-brand-deep">
                    <span>{checkoutSummary?.totalLabel ?? "—"}</span>
                    <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-brand-ink-muted">
                      Horas:minutos
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        ) : null}
      </FullScreenModal>

    </div>
  );
}
