import Image from "next/image";
import Link from "next/link";
import symbol from "@/assets/manta-symbol.svg";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-10 h-64 w-64 rotate-6 rounded-[44px] bg-[#ffe7d3]" />
        <div className="absolute -right-12 top-20 h-48 w-48 -rotate-12 rounded-[32px] bg-[#dff8f2]" />
        <div className="absolute bottom-16 left-12 h-24 w-40 -rotate-3 rounded-[28px] bg-[#ffe2f1]" />
        <div className="absolute bottom-10 right-16 h-36 w-36 rotate-12 rounded-full border-8 border-[#ff7a23]/30" />
        <div className="absolute bottom-[-120px] left-1/2 h-64 w-[120%] -translate-x-1/2 rounded-[90px] bg-gradient-to-r from-[#ffb85c]/80 via-white to-[#46c7c7]/70" />
      </div>
      <main className="flex flex-1 items-center justify-center px-6 py-10 text-center md:px-10">
        <section className="relative flex w-full max-w-5xl flex-col items-center gap-12 rounded-[48px] border border-[#ffe0c2] bg-white px-10 py-16 text-brand-deep shadow-2xl md:px-16">
          <div className="absolute inset-x-12 inset-y-10 -z-10 rounded-[40px] bg-gradient-to-br from-[#fff3e1] via-white to-[#e3faf4]" />
          <div className="absolute -left-16 top-8 hidden h-32 w-32 -rotate-6 rounded-[22px] bg-[#ff8a74]/60 blur-xl md:block" />
          <div className="absolute -right-12 bottom-12 hidden h-28 w-28 rotate-6 rounded-[22px] bg-[#2eb8ab]/55 blur-xl md:block" />
          <div className="relative flex w-full justify-center">
            <Image
              src={symbol}
              alt="South American Language Center Manta"
              priority
              className="w-full max-w-md drop-shadow-[0_18px_42px_rgba(0,0,0,0.12)]"
            />
          </div>
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-deep-soft">
              Inglés Rápido · Manta
            </p>
            <h1 className="text-4xl font-black leading-tight text-brand-deep sm:text-5xl">
              Bienvenidos a Inglés Rápido Manta
            </h1>
            <p className="max-w-2xl text-base text-brand-ink-muted sm:text-lg">
              Continúa para registrar tu asistencia y comenzar tu aventura con nosotros.
            </p>
          </div>
          <Link
            href="/registro"
            className="cta-ripple inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-16 py-7 text-xl font-semibold uppercase tracking-wide text-white shadow-[0_22px_36px_rgba(255,122,35,0.28)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
          >
            Haz clic aquí para continuar
          </Link>
        </section>
      </main>
    </div>
  );
}
