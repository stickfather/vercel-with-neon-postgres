"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActiveStaffAttendance } from "@/features/staff/data/queries";

type StatusState = { type: "error" | "success"; message: string } | null;

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

  const handleCheckout = async (attendance: ActiveStaffAttendance) => {
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
      const response = await fetch("/api/staff/check-out", {
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
        message: "¡Salida registrada, gracias por tu apoyo!",
      });

      await new Promise((resolve) => setTimeout(resolve, 600));
      router.refresh();
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No pudimos cerrar la asistencia. Inténtalo nuevamente.",
      });
    } finally {
      setLoadingId(null);
    }
  };

  if (!attendances.length) {
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
      {status && (
        <div
          className={`rounded-3xl border px-5 py-3 text-sm font-medium ${
            status.type === "success"
              ? "border-brand-teal bg-[#ddf4ef] text-brand-deep"
              : "border-brand-orange bg-[#ffe8d7] text-brand-ink"
          }`}
        >
          {status.message}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {attendances.map((attendance, index) => {
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
              onClick={() => handleCheckout(attendance)}
              disabled={loadingId === attendance.id}
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
    </div>
  );
}
