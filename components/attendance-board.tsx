"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActiveAttendance } from "@/app/db";
import { getLevelAccent } from "@/components/level-colors";

type StatusState = { type: "error" | "success"; message: string } | null;

type Props = {
  attendances: ActiveAttendance[];
};

function formatTime(value: string, formatter: Intl.DateTimeFormat) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return formatter.format(date);
}

export function AttendanceBoard({ attendances }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [status, setStatus] = useState<StatusState>(null);

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

  const handleCheckout = async (attendance: ActiveAttendance) => {
    if (
      !window.confirm(
        `¿Quieres registrar tu salida, ${attendance.fullName}?`,
      )
    ) {
      return;
    }

    setStatus(null);
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

      setStatus({
        type: "success",
        message: "¡Salida registrada, gracias por asistir!",
      });

      const nameParam = encodeURIComponent(attendance.fullName);
      await new Promise((resolve) => setTimeout(resolve, 650));
      router.push(`/?despedida=1&nombre=${nameParam}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "No pudimos cerrar la asistencia. Inténtalo nuevamente.",
      });
    } finally {
      setLoadingId(null);
    }
  };

  if (!attendances.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-[#dde1ff] bg-white px-8 py-16 text-center text-lg text-brand-ink-muted shadow-inner">
        <span>Por ahora no hay estudiantes en clase.</span>
        <span className="text-sm">
          Cuando alguien se registre aparecerá aquí para poder retirarse con un toque.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {status && (
        <div
          className={`rounded-3xl border px-5 py-3 text-sm font-medium ${
            status.type === "success"
              ? "border-brand-teal bg-[#ddf4ef] text-brand-deep"
              : "border-brand-orange bg-[#ffe8d7] text-brand-ink"
          }`}
        >
          <span className="flex items-center gap-3">
            {status.type === "success" && (
              <span className="checkmark-pop flex h-7 w-7 items-center justify-center rounded-full bg-brand-teal text-white">
                ✓
              </span>
            )}
            {status.message}
          </span>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {attendances.map((attendance) => {
          const accent = getLevelAccent(attendance.level);
          const formattedTime = formatTime(attendance.checkInTime, formatter);
          return (
            <button
              key={attendance.id}
              type="button"
              onClick={() => handleCheckout(attendance)}
              disabled={loadingId === attendance.id}
              className="group flex min-h-[112px] flex-col justify-between rounded-3xl border border-[#f1f2f8] bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-base font-semibold text-brand-deep">
                  {attendance.fullName}
                </span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                  style={{
                    backgroundColor: accent.chipBackground,
                    color: accent.primary,
                  }}
                >
                  {attendance.level ?? "Nivel"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-brand-ink-muted sm:text-sm">
                <span className="truncate">
                  {attendance.lesson ?? "Lección por confirmar"}
                </span>
                {formattedTime && <span>{formattedTime}</span>}
              </div>
              <span
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-brand-teal-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal"
              >
                {loadingId === attendance.id ? "Registrando salida…" : "Toca para salir"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
