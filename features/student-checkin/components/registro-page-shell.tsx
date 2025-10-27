"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActiveAttendance } from "@/features/student-checkin/data/queries";
import { FarewellOverlay } from "@/components/ui/farewell-overlay";
import { AttendanceBoard } from "./attendance-board";
import { CheckInForm } from "./check-in-form";

type StudentRegistroPageShellProps = {
  attendances: ActiveAttendance[];
  attendanceError: string | null;
  formError: string | null;
  lessonsError: string | null;
};

const quickLinkBaseClass =
  "inline-flex items-center justify-center rounded-full border border-transparent px-5 py-2 text-xs font-semibold uppercase tracking-wide shadow transition hover:-translate-y-[1px] hover:opacity-90 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2";

export function StudentRegistroPageShell({
  attendances,
  attendanceError,
  formError,
  lessonsError,
}: StudentRegistroPageShellProps) {
  const router = useRouter();
  const [showFarewell, setShowFarewell] = useState(false);
  const farewellTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (farewellTimeoutRef.current) {
        clearTimeout(farewellTimeoutRef.current);
      }
    };
  }, []);

  const handleCheckoutComplete = useCallback(() => {
    setShowFarewell(true);
    if (farewellTimeoutRef.current) {
      clearTimeout(farewellTimeoutRef.current);
    }
    farewellTimeoutRef.current = setTimeout(() => {
      router.push("/");
    }, 500);
  }, [router]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {showFarewell ? (
        <FarewellOverlay
          message="¡Buen trabajo en clase!"
          subtitle="Sigue así, nos vemos pronto"
          emoji="🌟"
        />
      ) : null}

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-16 h-60 w-60 -rotate-[14deg] rounded-[42px] bg-[#ffe3cd] opacity-80" />
        <div className="absolute right-4 top-24 h-52 w-52 rotate-[18deg] rounded-[36px] bg-[#ccf6f0] opacity-80" />
        <div className="absolute bottom-0 left-1/2 h-[460px] w-[120%] -translate-x-1/2 rounded-t-[180px] bg-gradient-to-r from-[#ffe7d1] via-[#ffffffef] to-[#c9f5ed]" />
      </div>

      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <div className="flex flex-col gap-3 text-center sm:text-left">
          <span className="inline-flex w-fit items-center justify-center rounded-full bg-white/90 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-brand-deep shadow">
            Registro diario
          </span>
          <h1 className="text-3xl font-black text-brand-deep sm:text-[40px]">
            Check-in de estudiantes
          </h1>
          <p className="text-sm text-brand-ink-muted sm:text-base">
            Ingresa tus datos y toca tu burbuja para registrar la salida al final de la clase.
          </p>
        </div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.05fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)]">
          <CheckInForm
            disabled={Boolean(formError)}
            initialError={formError}
            lessonsError={lessonsError}
          />

          <aside className="flex flex-col gap-5 rounded-[36px] border border-white/70 bg-white/94 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col text-left">
                <h2 className="text-xl font-bold text-brand-deep">Estudiantes en clase</h2>
                <p className="text-xs uppercase tracking-wide text-brand-ink-muted">
                  Toca tu burbuja para salir
                </p>
              </div>
              <span className="rounded-full bg-brand-teal-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal">
                {attendances.length}
              </span>
            </div>

            {attendanceError ? (
              <p className="rounded-3xl border border-brand-orange bg-white/85 px-4 py-3 text-xs font-medium text-brand-ink">
                {attendanceError}
              </p>
            ) : (
              <AttendanceBoard
                attendances={attendances}
                onCheckoutComplete={handleCheckoutComplete}
              />
            )}
          </aside>
        </div>

        <div className="flex flex-col gap-3 rounded-[28px] border border-white/70 bg-white/92 px-5 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-brand-ink-muted">
            ¿Necesitas otra acción? Usa los accesos directos para navegar rápidamente.
          </p>
          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/administracion"
              className={`${quickLinkBaseClass} border border-brand-ink-muted/20 bg-white text-brand-deep focus-visible:outline-[#00bfa6]`}
            >
              Acceso administrativo
            </Link>
            <Link
              href="/"
              className={`${quickLinkBaseClass} bg-brand-deep text-white focus-visible:outline-[#00bfa6]`}
            >
              Volver a bienvenida
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

