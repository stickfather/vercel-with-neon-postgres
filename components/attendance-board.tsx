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

      await new Promise((resolve) => setTimeout(resolve, 650));
      router.push("/");
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {attendances.map((attendance) => {
          const accent = getLevelAccent(attendance.level);
          const formattedTime = formatTime(attendance.checkInTime, formatter);
          return (
            <button
              key={attendance.id}
              type="button"
              onClick={() => handleCheckout(attendance)}
              disabled={loadingId === attendance.id}
              className="group flex min-h-[126px] flex-col gap-3 rounded-3xl border-2 border-[#eef0ff] bg-gradient-to-br from-white via-[#fff5ec] to-[#e8fffa] px-5 py-5 text-left shadow-md transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-base font-semibold text-brand-deep">
                  {attendance.fullName}
                </span>
                <div className="flex flex-col items-end gap-2 text-right">
                  {formattedTime && (
                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                      {formattedTime}
                    </span>
                  )}
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
              </div>
              <div
                className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-3 py-2 text-xs font-medium uppercase tracking-wide text-brand-ink-muted sm:text-sm"
                style={{ border: `1px dashed ${accent.primary}` }}
              >
                <span className="flex items-center gap-2 text-brand-deep">
                  <span aria-hidden className="flex items-center gap-1 text-base text-brand-orange">
                    <span>⋯</span>
                    <span>➜</span>
                  </span>
                  <span className="truncate">{attendance.lesson ?? "Lección por confirmar"}</span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                  {loadingId === attendance.id ? "Registrando salida…" : "Finalizar"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
