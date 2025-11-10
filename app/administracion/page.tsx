import type { Metadata } from "next";
import Link from "next/link";

// Flat list of 7 tiles for centered stagger layout
const allTiles = [
  // Row 1 - 4 tiles (Daily Operations)
  {
    href: "/registro",
    title: "Check-in Estudiantes",
    subtitle: "Registro de asistencias de alumnos.",
    emoji: "🧍‍♂️",
  },
  {
    href: "/administracion/registro-personal",
    title: "Check-in Personal",
    subtitle: "Entradas y salidas del personal.",
    emoji: "🧑‍🏫",
  },
  {
    href: "/administracion/gestion-estudiantes",
    title: "Gestión de Estudiantes",
    subtitle: "Datos, progreso, historial y seguimiento completo del alumno.",
    emoji: "📚",
  },
  {
    href: "/administracion/calendario",
    title: "Calendario de Exámenes y Actividades",
    subtitle: "Programación de exámenes, actividades y registro de resultados.",
    emoji: "🗓️",
  },
  // Row 2 - 3 tiles (Management)
  {
    href: "/admin/reportes",
    title: "Reportes Gerenciales",
    subtitle: "Aprendizaje, Engagement, Finanzas, Exámenes y Personal.",
    emoji: "📊",
  },
  {
    href: "/administracion/reportes-nomina",
    title: "Reportes de Nómina",
    subtitle: "Consulta de ingresos del personal (mes a la fecha), aprobaciones de gerencia y bonos.",
    emoji: "💵",
  },
  {
    href: "/administracion/configuracion",
    title: "Configuración",
    subtitle: "Ajustes del centro, accesos y preferencias generales.",
    emoji: "⚙️",
  },
];

export const metadata: Metadata = {
  title: "Panel administrativo · Inglés Rápido Manta",
};

export default function AdministracionPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-teal-50">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-32 h-64 w-64 -rotate-[18deg] rounded-[38px] bg-gradient-to-br from-amber-100 to-orange-100 opacity-40 blur-2xl" />
        <div className="absolute -right-16 top-12 h-52 w-52 rotate-[12deg] rounded-[30px] bg-gradient-to-br from-blue-100 to-cyan-100 opacity-40 blur-2xl" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[120%] -translate-x-1/2 rounded-t-[160px] bg-gradient-to-r from-teal-50/50 via-white to-emerald-50/50" />
      </div>

      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-12 px-6 py-16 md:px-10 lg:px-14">
        {/* Header */}
        <header className="flex flex-col gap-4 text-center">
          <span className="mx-auto inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.38em] text-white">
            Centro operativo
          </span>
          <h1 className="text-4xl font-black text-slate-900 sm:text-5xl">
            Panel Administrativo
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-600 sm:text-lg">
            Accesos principales del centro para gestión diaria y estratégica
          </p>
        </header>

        {/* Thin divider */}
        <div className="mx-auto h-px w-32 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

        {/* Centered Stagger Grid */}
        <div className="flex flex-col items-center gap-6">
          {/* Row 1: 4 tiles */}
          <div className="grid w-full max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {allTiles.slice(0, 4).map((tile) => (
              <Link
                key={tile.href}
                href={tile.href}
                className="group relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
              >
                {/* Subtle gradient background */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-50/30 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                
                <div className="relative z-10 flex flex-col gap-4">
                  {/* Large emoji icon */}
                  <div className="text-4xl">{tile.emoji}</div>
                  
                  {/* Title */}
                  <h3 className="text-lg font-semibold leading-tight text-slate-900">
                    {tile.title}
                  </h3>
                  
                  {/* Subtitle */}
                  <p className="text-sm leading-relaxed text-slate-600">
                    {tile.subtitle}
                  </p>
                </div>

                {/* Hover arrow */}
                <div className="relative z-10 mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-teal-600 opacity-0 transition-opacity group-hover:opacity-100">
                  Abrir
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Row 2: 3 tiles (staggered/centered) */}
          <div className="grid w-full max-w-[900px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {allTiles.slice(4, 7).map((tile) => (
              <Link
                key={tile.href}
                href={tile.href}
                className="group relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
              >
                {/* Subtle gradient background */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-50/30 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                
                <div className="relative z-10 flex flex-col gap-4">
                  {/* Large emoji icon */}
                  <div className="text-4xl">{tile.emoji}</div>
                  
                  {/* Title */}
                  <h3 className="text-lg font-semibold leading-tight text-slate-900">
                    {tile.title}
                  </h3>
                  
                  {/* Subtitle */}
                  <p className="text-sm leading-relaxed text-slate-600">
                    {tile.subtitle}
                  </p>
                </div>

                {/* Hover arrow */}
                <div className="relative z-10 mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-teal-600 opacity-0 transition-opacity group-hover:opacity-100">
                  Abrir
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Back button */}
        <div className="flex justify-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:shadow-md focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
          >
            ← Volver a bienvenida
          </Link>
        </div>
      </main>
    </div>
  );
}
