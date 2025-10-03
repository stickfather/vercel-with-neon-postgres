"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ActiveAttendance } from "@/app/db";

const timeFormatter = new Intl.DateTimeFormat("es-EC", {
  hour: "2-digit",
  minute: "2-digit",
});

function formatCheckInTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return timeFormatter.format(date);
}

type Props = {
  attendances: ActiveAttendance[];
};

export function AttendanceBoard({ attendances }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (attendance: ActiveAttendance) => {
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

      const nameParam = encodeURIComponent(attendance.fullName);
      router.push(`/?despedida=1&nombre=${nameParam}`);
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

  if (!attendances.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-[rgba(0,191,166,0.3)] bg-white/75 px-8 py-14 text-center text-lg text-brand-ink-muted shadow-inner">
        <span>Por ahora no hay estudiantes en clase.</span>
        <span className="text-sm">
          Cuando alguien se registre aparecerá aquí para poder retirarse con un toque.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-3xl border border-brand-orange bg-white/80 px-5 py-3 text-sm font-medium text-brand-ink">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {attendances.map((attendance) => {
          const formattedTime = formatCheckInTime(attendance.checkInTime);
          const isLoading = loadingId === attendance.id;
          return (
            <button
              key={attendance.id}
              type="button"
              onClick={() => handleCheckout(attendance)}
              disabled={isLoading}
              className="group flex h-full w-full flex-col items-start gap-3 rounded-[28px] border border-[rgba(0,191,166,0.24)] bg-white/85 p-5 text-left text-brand-deep shadow-sm transition hover:-translate-y-1 hover:border-[#00bfa6] hover:shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="flex w-full items-start justify-between gap-3">
                <span className="text-lg font-semibold leading-tight">
                  {attendance.fullName}
                </span>
                <span className="rounded-full bg-brand-teal px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow">
                  {isLoading ? "Saliendo…" : "Marcar salida"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                {attendance.level ? (
                  <span className="rounded-full bg-[rgba(0,191,166,0.12)] px-2.5 py-1 text-brand-teal">
                    Nivel {attendance.level}
                  </span>
                ) : null}
                {attendance.lesson ? (
                  <span className="rounded-full border border-[rgba(0,191,166,0.25)] px-2.5 py-1 text-brand-deep-soft">
                    {attendance.lesson}
                  </span>
                ) : null}
                {formattedTime ? (
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-brand-ink-soft shadow-inner">
                    Ingreso {formattedTime}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
