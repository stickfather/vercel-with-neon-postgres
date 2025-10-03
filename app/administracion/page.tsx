import type { Metadata } from "next";
import Link from "next/link";

const tiles = [
  {
    href: "/registro",
    title: "Registro de estudiantes",
    description: "Gestiona la experiencia de check-in y verifica la asistencia activa.",
  },
  {
    href: "/administracion/registro-personal",
    title: "Registro del personal",
    description: "Anota las entradas y salidas del equipo académico y administrativo.",
  },
  {
    href: "/administracion/reportes-nomina",
    title: "Reportes de nómina",
    description: "Consulta resúmenes de pagos, bonos y asistencia del personal.",
  },
  {
    href: "/administracion/gestion-estudiantes",
    title: "Gestión de estudiantes",
    description: "Administra perfiles, progresos y observaciones de cada alumno.",
  },
  {
    href: "/administracion/panel-gerencial",
    title: "Panel gerencial",
    description: "Obtén métricas clave para la toma de decisiones del centro.",
  },
  {
    href: "/administracion/calendario",
    title: "Calendario",
    description: "Coordina eventos, evaluaciones y actividades especiales.",
  },
  {
    href: "/administracion/configuracion",
    title: "Configuración",
    description: "Ajusta parámetros del kiosco, horarios y preferencias de la sede.",
  },
  {
    href: "/administracion/ayuda",
    title: "Ayuda",
    description: "Accede a guías rápidas y soporte para resolver dudas del equipo.",
  },
];

export const metadata: Metadata = {
  title: "Panel administrativo · Inglés Rápido Manta",
};

export default function AdministracionPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-32 h-64 w-64 -rotate-[18deg] rounded-[38px] bg-[#ffe7d4] shadow-[0_32px_70px_rgba(15,23,42,0.1)]" />
        <div className="absolute -right-16 top-12 h-52 w-52 rotate-[12deg] rounded-[30px] bg-[#e8f1ff] shadow-[0_28px_64px_rgba(15,23,42,0.1)]" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[120%] -translate-x-1/2 rounded-t-[160px] bg-gradient-to-r from-[#fff3e4] via-white to-[#dcf9f1]" />
      </div>
      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-14 px-6 py-16 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4 text-left text-brand-deep">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#1e1b32] px-4 py-1 text-xs font-semibold uppercase tracking-[0.38em] text-white">
            Centro operativo
          </span>
          <h1 className="text-4xl font-black sm:text-5xl">Panel administrativo</h1>
          <p className="max-w-3xl text-base text-brand-ink-muted sm:text-lg">
            Esta es la base del equipo de Inglés Rápido Manta. Explora los paneles y herramientas internas para coordinar asistencias, reportes y comunicación.
          </p>
        </header>
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className={`group relative flex min-h-[180px] flex-col gap-4 rounded-[32px] border-2 border-white/70 bg-gradient-to-br from-[#e5f0ff] via-white to-[#c2d8ff] p-6 text-left shadow-[0_20px_48px_rgba(15,23,42,0.12)] transition hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.16)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]`}
            >
              <span className="inline-flex w-fit items-center rounded-full bg-white/80 px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-ink">
                Abrir
              </span>
              <h2 className="text-xl font-black text-brand-deep">{tile.title}</h2>
              <p className="text-sm text-brand-ink-muted">{tile.description}</p>
              <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
                Explorar
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
