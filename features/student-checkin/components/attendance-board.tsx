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

  const formatter = useMemo(() => {
    return new Intl.DateTimeFormat("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

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
      <div className="flex flex-col items-center justify-center gap-4 rounded-[32px] border border-dashed border-white/70 bg-white/70 px-8 py-16 text-center text-brand-ink-muted shadow-inner">
        <span className="text-lg font-semibold text-brand-deep-soft">Por ahora no hay estudiantes en clase.</span>
        <span className="text-sm">
          Cuando alguien se registre aparecerá aquí para que pueda retirarse con un toque.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="rounded-3xl border border-brand-orange bg-white/82 px-5 py-3 text-sm font-medium text-brand-ink">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-4">
        {attendances.map((attendance) => {
          const accent = getLevelAccent(attendance.level);
          const initials = attendance.fullName
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("")
            .slice(0, 2);
          const checkInDate = attendance.checkInTime
            ? new Date(attendance.checkInTime)
            : null;
          const formattedTime = checkInDate ? formatter.format(checkInDate) : "";
          const isRecent = checkInDate
            ? Date.now() - checkInDate.getTime() < 15 * 60 * 1000
            : false;

          return (
            <article
              key={attendance.id}
              className="flex w-full flex-wrap items-center justify-between gap-4 rounded-[28px] border px-5 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur"
              style={{
                backgroundColor: `${accent.background}`,
                borderColor: `${accent.chipBackground}`,
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${accent.primary}, ${accent.primary}cc)`,
                  }}
                >
                  {initials || attendance.fullName.charAt(0).toUpperCase()}
                </span>
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-brand-deep">{attendance.fullName}</h3>
                    {isRecent && (
                      <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-teal">
                        Nuevo ingreso
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-brand-ink">
                    {attendance.level && (
                      <span
                        className="rounded-full px-3 py-1 font-semibold uppercase tracking-wide"
                        style={{
                          backgroundColor: accent.chipBackground,
                          color: accent.primary,
                        }}
                      >
                        {attendance.level}
                      </span>
                    )}
                    {attendance.lesson && (
                      <span className="rounded-full bg-white/70 px-3 py-1 font-medium text-brand-deep/80">
                        {attendance.lesson}
                      </span>
                    )}
                    {formattedTime && (
                      <span className="rounded-full bg-white/70 px-3 py-1 font-semibold text-brand-deep/80">
                        {`Ingreso: ${formattedTime}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCheckout(attendance)}
                disabled={loadingId === attendance.id}
                className="inline-flex items-center justify-center rounded-full bg-brand-deep px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow transition hover:bg-[#322d54] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loadingId === attendance.id ? "Registrando salida…" : "Salir de clase"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
