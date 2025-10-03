import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Inglés Rápido Manta · Bienvenida",
  description:
    "Kiosco de bienvenida para Inglés Rápido Manta: conoce la experiencia y pasa al registro de asistencia.",
};

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-brand-deep">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff_40%,#fff5eb_100%)]" />
        <div className="absolute -left-32 top-16 h-[420px] w-[220px] rotate-6 bg-[repeating-linear-gradient(150deg,#1e1b32, #1e1b32_14px,#ffffff_14px,#ffffff_32px,#ff7a23_32px,#ff7a23_46px,#ffffff_46px,#ffffff_64px)] opacity-70 shadow-[0_28px_60px_rgba(15,23,42,0.15)]" />
        <div className="absolute -right-36 bottom-0 h-[380px] w-[260px] -rotate-3 bg-[repeating-linear-gradient(210deg,#2e88c9,#2e88c9_16px,#ffffff_16px,#ffffff_36px,#ffb23f_36px,#ffb23f_52px,#ffffff_52px,#ffffff_72px)] opacity-60 shadow-[0_28px_60px_rgba(15,23,42,0.15)]" />
        <div className="absolute left-1/2 top-20 h-40 w-40 -translate-x-1/2 rounded-full bg-[#ffb85c]/35 blur-2xl" />
        <div className="absolute left-10 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full bg-[#5cd6ca]/40 blur-2xl" />
        <div className="absolute right-12 top-24 h-32 w-32 rounded-full bg-[#ff5c5c]/28 blur-2xl" />
      </div>

      <main className="flex flex-1 items-center justify-center px-6 py-12 md:px-12">
        <section className="relative flex w-full max-w-6xl flex-col items-center gap-10 rounded-[56px] border border-[#ffe0c2] bg-white px-10 py-16 text-center shadow-[0_32px_70px_rgba(15,23,42,0.18)] md:px-16">
          <div className="pointer-events-none absolute inset-6 -z-10 rounded-[48px] bg-[radial-gradient(circle_at_18%_20%,rgba(255,122,35,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(46,136,201,0.16),transparent_60%),radial-gradient(circle_at_60%_85%,rgba(92,214,202,0.18),transparent_60%)]" />
          <div className="pointer-events-none absolute -top-28 left-1/2 h-60 w-[92%] -translate-x-1/2 rounded-[48px] bg-[linear-gradient(90deg,rgba(30,27,50,0.04),rgba(255,122,35,0.08))]" />

          <div className="relative flex flex-col items-center gap-3 text-brand-deep-soft">
            <span className="rounded-full bg-[#1e1b32] px-5 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white">
              Llegamos a Manta
            </span>
            <h1 className="bg-gradient-to-r from-[#ff7a23] via-[#ffc23a] to-[#2e88c9] bg-clip-text text-4xl font-black uppercase tracking-tight text-transparent sm:text-5xl">
              Inglés Rápido Manta
            </h1>
            <p className="max-w-2xl text-base text-brand-ink-muted sm:text-lg">
              Vive la energía de Inglés Rápido con una bienvenida vibrante. Registra tu asistencia y forma parte de la comunidad que dice
              <span className="ml-1 font-semibold text-brand-orange">#YouCanDoIt</span> cada día.
            </p>
          </div>

          <div className="relative flex flex-wrap items-center justify-center gap-6 text-left text-brand-deep">
            <div className="flex flex-col gap-2 rounded-[32px] bg-[#fff4eb] px-6 py-4 shadow-[0_16px_36px_rgba(255,178,63,0.32)]">
              <span className="text-sm font-semibold uppercase tracking-wide text-brand-orange">Impulsa tu inglés</span>
              <span className="text-base font-medium text-brand-ink-muted">
                Lecciones dinámicas, progreso real y mucha motivación.
              </span>
            </div>
            <div className="flex flex-col gap-2 rounded-[32px] bg-[#e7faf5] px-6 py-4 shadow-[0_16px_36px_rgba(92,214,202,0.32)]">
              <span className="text-sm font-semibold uppercase tracking-wide text-brand-teal">Conecta con tu equipo</span>
              <span className="text-base font-medium text-brand-ink-muted">
                Saluda a tus compañeros y prepárate para aprender juntos.
              </span>
            </div>
            <div className="flex flex-col gap-2 rounded-[32px] bg-[#eef3ff] px-6 py-4 shadow-[0_16px_36px_rgba(46,136,201,0.28)]">
              <span className="text-sm font-semibold uppercase tracking-wide text-brand-ink">Charlas internacionales</span>
              <span className="text-base font-medium text-brand-ink-muted">
                Prepárate para conversar con extranjeros y practicar tus nuevas habilidades.
              </span>
            </div>
          </div>

          <Link
            href="/registro"
            className="cta-ripple inline-flex items-center justify-center rounded-full bg-brand-orange px-20 py-8 text-2xl font-semibold uppercase tracking-wide text-white shadow-[0_28px_48px_rgba(255,122,35,0.32)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
          >
            Haz clic aquí para continuar
          </Link>
        </section>
      </main>
    </div>
  );
}
