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
      {error && (
        <div className="rounded-3xl border border-brand-orange bg-white/82 px-5 py-3 text-sm font-medium text-brand-ink">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {attendances.map((attendance) => {
          const accent = getLevelAccent(attendance.level);
          const checkInDate = attendance.checkInTime
            ? new Date(attendance.checkInTime)
            : null;
          const formattedTime = checkInDate ? formatter.format(checkInDate) : "";
          const lessonAbbreviation = attendance.lesson
            ? attendance.lesson.replace(/lecci[óo]n\s*/i, "L").replace(/\s+/g, "")
            : null;
          const labelParts = [attendance.fullName.trim()];
          if (lessonAbbreviation) labelParts.push(lessonAbbreviation);
          if (formattedTime) labelParts.push(formattedTime);
          const label = labelParts.filter(Boolean).join(" • ");
          const isLoading = loadingId === attendance.id;

          return (
            <button
              key={attendance.id}
              type="button"
              onClick={() => handleCheckout(attendance)}
              disabled={isLoading}
              className="group relative flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-3xl border px-3 py-3 text-center text-sm font-semibold text-brand-deep shadow-[0_14px_32px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-wait disabled:opacity-70"
              style={{
                backgroundColor: `${accent.background}`,
                borderColor: `${accent.chipBackground}`,
              }}
            >
              <span className="line-clamp-2 w-full break-words text-[13px] font-semibold tracking-tight text-brand-deep">
                {label}
              </span>
              {isLoading && (
                <span className="text-[11px] font-medium uppercase tracking-wide text-brand-ink-muted">
                  Registrando salida…
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
