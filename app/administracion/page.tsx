import type { Metadata } from "next";
import Link from "next/link";

const tiles = [
  {
    href: "/administracion/registro-personal",
    title: "Registro del personal",
    description: "Controla las entradas y salidas del equipo académico y administrativo.",
    emoji: "🕒",
  },
  {
    href: "/administracion/reportes-nomina",
    title: "Reportes de nómina",
    description: "Consulta nóminas, bonos y ausencias del personal para cierres semanales.",
    emoji: "📊",
  },
  {
    href: "/administracion/gestion-estudiantes",
    title: "Gestión de estudiantes",
    description: "Actualiza datos, progreso y seguimientos personalizados de cada alumno.",
    emoji: "🎓",
  },
  {
    href: "/administracion/calendario",
    title: "Calendario",
    description: "Coordina eventos, evaluaciones y actividades especiales de la sede.",
    emoji: "🗓️",
  },
  {
    href: "/administracion/configuracion",
    title: "Configuración",
    description: "Ajusta horarios, accesos y preferencias generales del centro.",
    emoji: "🛠️",
  },
  {
    href: "/admin/reportes",
    title: "Reportes gerenciales",
    description: "Indicadores clave del centro para aprendizaje, engagement y finanzas.",
    emoji: "📈",
  },
];

const tileTheme = {
  container: "border-[#009688]/55 bg-[#E0F2F1] text-[#004D40]",
  badge: "bg-[#009688]/15 text-[#004D40]",
  description: "text-[#004D40]/80",
  arrow: "text-[#00796B]",
  orb: "bg-[#009688]/30",
};

const actionButtonBaseClass =
  "inline-flex items-center justify-center rounded-full border border-transparent px-5 py-2 text-xs font-semibold uppercase tracking-wide shadow transition hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2";

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
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/"
              className={`${actionButtonBaseClass} bg-white text-brand-deep hover:border-brand-teal hover:bg-brand-teal-soft/70 focus-visible:outline-[#00bfa6]`}
            >
              ← Volver a bienvenida
            </Link>
            <Link
              href="/registro"
              className={`${actionButtonBaseClass} border border-brand-ink-muted/20 bg-white text-brand-deep focus-visible:outline-[#00bfa6]`}
            >
              Abrir check-in de estudiantes
            </Link>
          </div>
        </header>
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {tiles.map((tile) => {
            return (
              <Link
                key={tile.href}
                href={tile.href}
                className={`group relative overflow-hidden flex min-h-[200px] flex-col gap-5 rounded-[32px] border-2 p-6 text-left shadow-[0_24px_52px_rgba(15,23,42,0.12)] transition hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.16)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] ${tileTheme.container}`}
              >
                <span
                  aria-hidden
                  className={`pointer-events-none absolute -right-12 top-10 h-32 w-32 rounded-full opacity-50 blur-2xl ${tileTheme.orb}`}
                />
                <div className="relative z-10 flex flex-col gap-4">
                  <span className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-1 text-[11px] font-semibold uppercase tracking-wide ${tileTheme.badge}`}>
                    {tile.emoji} Abrir
                  </span>
                  <h2 className="text-xl font-black leading-snug">{tile.title}</h2>
                  <p className={`text-sm leading-relaxed ${tileTheme.description}`}>{tile.description}</p>
                </div>
                <span className={`relative z-10 mt-auto inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${tileTheme.arrow}`}>
                  Explorar
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}
