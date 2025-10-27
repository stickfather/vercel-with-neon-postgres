"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActiveStaffAttendance } from "@/features/staff/data/queries";
import { EphemeralToast } from "@/components/ui/ephemeral-toast";
import {
  exceedsSessionDurationLimit,
  isAfterBubbleHideTime,
} from "@/lib/time/check-in-window";
import { queueableFetch } from "@/lib/offline/fetch";
import { FullScreenModal } from "@/components/ui/full-screen-modal";
import { FarewellOverlay } from "@/components/ui/farewell-overlay";

type Props = {
  attendances: ActiveStaffAttendance[];
};

const accentPalette = [
  { border: "#ff7a23", background: "rgba(255, 122, 35, 0.18)" },
  { border: "#2e88c9", background: "rgba(46, 136, 201, 0.2)" },
  { border: "#2f9d6a", background: "rgba(47, 157, 106, 0.2)" },
  { border: "#f24ebc", background: "rgba(242, 78, 188, 0.2)" },
  { border: "#ab47bc", background: "rgba(171, 71, 188, 0.22)" },
];

function formatTime(value: string, formatter: Intl.DateTimeFormat) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return formatter.format(date);
}

export function StaffAttendanceBoard({ attendances }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<ActiveStaffAttendance | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [activeAttendances, setActiveAttendances] = useState(attendances);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null,
  );
  const [resolvingExpired, setResolvingExpired] = useState(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shouldHideBubbles, setShouldHideBubbles] = useState(() =>
    isAfterBubbleHideTime(),
  );
  const [checkoutPreview, setCheckoutPreview] = useState<Date | null>(null);
  const [showFarewell, setShowFarewell] = useState(false);
  const farewellTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActiveAttendances(attendances);
  }, [attendances]);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Guayaquil",
      }),
    [],
  );

  const fullDateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Guayaquil",
      }),
    [],
  );

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
      if (farewellTimeoutRef.current) {
        clearTimeout(farewellTimeoutRef.current);
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

  const requestCheckout = (attendance: ActiveStaffAttendance) => {
    setError(null);
    if (exceedsSessionDurationLimit(attendance.checkInTime)) {
      void resolveExpiredAttendances();
      return;
    }
    setPendingCheckout(attendance);
  };

  const closeConfirmation = () => {
    setPendingCheckout(null);
    setError(null);
    setCheckoutPreview(null);
  };

  const confirmCheckout = async () => {
    if (!pendingCheckout) return;

    const attendance = pendingCheckout;
    setError(null);
    setLoadingId(attendance.id);
    try {
      const response = await queueableFetch("/api/staff/check-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ attendanceId: attendance.id }),
        offlineLabel: "staff-check-out",
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        queued?: boolean;
        attendances?: ActiveStaffAttendance[];
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
          ? `${attendance.fullName.trim()} cerrará su jornada al volver la conexión.`
          : `${attendance.fullName.trim()} finalizó su jornada.`,
      });

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      setShowFarewell(true);
      if (farewellTimeoutRef.current) {
        clearTimeout(farewellTimeoutRef.current);
      }
      farewellTimeoutRef.current = setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "No pudimos cerrar la asistencia. Inténtalo nuevamente.",
      );
    } finally {
      setLoadingId(null);
    }
  };

  if (showFarewell) {
    return (
      <FarewellOverlay
        message="¡Excelente trabajo hoy!"
        subtitle="Gracias por tu dedicación"
        emoji="👏"
      />
    );
  }

  if (shouldHideBubbles) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-[#dde1ff] bg-white px-8 py-16 text-center text-lg text-brand-ink-muted shadow-inner">
        <span>Las asistencias del personal se ocultan después de las 20:30.</span>
        <span className="text-sm">Regresa mañana para ver quién está en la sede.</span>
      </div>
    );
  }

  if (!activeAttendances.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-[#dde1ff] bg-white px-8 py-16 text-center text-lg text-brand-ink-muted shadow-inner">
        <span>Por ahora no hay personal marcado como presente.</span>
        <span className="text-sm">
          Cuando alguien se registre aparecerá aquí para poder registrar su salida.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {toast ? (
        <EphemeralToast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      {error && !pendingCheckout && (
        <div className="rounded-3xl border border-brand-orange bg-[#ffe8d7] px-5 py-3 text-sm font-medium text-brand-ink">
          {error}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {activeAttendances.map((attendance, index) => {
          const accent = accentPalette[index % accentPalette.length];
          const formattedTime = formatTime(attendance.checkInTime, formatter);
          const wiggle = [
            "translate-y-0",
            "-translate-y-1.5",
            "translate-y-2",
            "-translate-y-2",
          ][index % 4];

          return (
            <button
              key={attendance.id}
              type="button"
              onClick={() => requestCheckout(attendance)}
              disabled={loadingId === attendance.id || resolvingExpired}
              className={`group flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-[18px] border-[3px] px-4 py-5 text-center shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition hover:-translate-y-1 hover:shadow-[0_20px_36px_rgba(15,23,42,0.18)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-65 ${wiggle}`}
              style={{
                borderColor: accent.border,
                background: `linear-gradient(150deg, ${accent.background} 0%, rgba(255,255,255,0.98) 55%, ${accent.background} 100%)`,
              }}
            >
              <span className="text-sm font-black leading-tight text-brand-deep">
                {attendance.fullName}
              </span>
              {formattedTime && (
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-ink">
                  {formattedTime}
                </span>
              )}
            </button>
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
                    Personal
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
