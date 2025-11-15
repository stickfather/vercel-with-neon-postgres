import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bienvenida · Inglés Rápido Manta",
  description: "Sistema de gestión y registro de estudiantes para Inglés Rápido en Manta.",
};

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-teal-50">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-32 h-64 w-64 -rotate-[18deg] rounded-[38px] bg-gradient-to-br from-amber-100 to-orange-100 opacity-40 blur-2xl" />
        <div className="absolute -right-16 top-12 h-52 w-52 rotate-[12deg] rounded-[30px] bg-gradient-to-br from-blue-100 to-cyan-100 opacity-40 blur-2xl" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[120%] -translate-x-1/2 rounded-t-[160px] bg-gradient-to-r from-teal-50/50 via-white to-emerald-50/50" />
      </div>

      <main className="relative flex flex-col items-center gap-10 px-6 py-16 text-center">
        {/* Logo/Brand area */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-6xl">🎓</div>
          <h1 className="text-5xl font-black text-slate-900 sm:text-6xl">
            Inglés Rápido
          </h1>
          <p className="text-xl text-slate-600 sm:text-2xl">Manta</p>
        </div>

        {/* Welcome message */}
        <div className="flex max-w-2xl flex-col gap-4">
          <h2 className="text-2xl font-bold text-slate-800 sm:text-3xl">
            ¡Bienvenido!
          </h2>
          <p className="text-lg text-slate-600">
            Haz clic en el botón para continuar al panel administrativo.
          </p>
        </div>

        {/* Main CTA */}
        <Link
          href="/administracion"
          className="group relative inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 px-10 py-5 text-lg font-semibold uppercase tracking-wide text-white shadow-[0_20px_40px_rgba(0,191,166,0.35)] transition hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(0,191,166,0.45)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-teal-500"
        >
          <span>Haz clic aquí para continuar</span>
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </Link>

        {/* Quick access links */}
        <div className="mt-8 flex flex-col gap-4 text-sm">
          <p className="font-medium text-slate-600">Accesos rápidos:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:shadow-md focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
            >
              🧍‍♂️ Check-in Estudiantes
            </Link>
            <Link
              href="/administracion/registro-personal"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:shadow-md focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
            >
              🧑‍🏫 Check-in Personal
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
