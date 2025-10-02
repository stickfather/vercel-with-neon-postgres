"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ActiveAttendance } from "@/app/db";

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
      <div className="flex flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-[rgba(0,191,166,0.4)] bg-white/70 px-8 py-14 text-center text-lg text-brand-ink-muted shadow-inner">
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
        <div className="rounded-3xl border border-brand-orange bg-[#fff4ec] px-5 py-3 text-sm font-medium text-brand-ink">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {attendances.map((attendance) => (
          <button
            key={attendance.id}
            type="button"
            onClick={() => handleCheckout(attendance)}
            disabled={loadingId === attendance.id}
            className="group inline-flex min-w-[180px] items-center justify-between gap-3 rounded-full bg-gradient-to-r from-[#5cd6ca33] via-[#ffc23a33] to-[#ff7a2333] px-6 py-3 text-left text-sm font-semibold text-brand-deep shadow transition hover:from-[#5cd6ca4d] hover:via-[#ffc23a4d] hover:to-[#ff7a234d] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span>{attendance.fullName}</span>
            <span className="rounded-full bg-brand-teal-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-teal">
              {loadingId === attendance.id ? "Saliendo…" : "Salir"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
