import Image from "next/image";
import Link from "next/link";
import symbol from "@/assets/manta-symbol.svg";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-white">
      <main className="flex flex-1 items-center justify-center px-6 py-10 text-center md:px-10">
        <section className="relative flex w-full max-w-4xl flex-col items-center gap-10 rounded-[44px] border border-[#ffe0c2] bg-white px-10 py-16 text-brand-deep shadow-xl md:px-16">
          <div className="absolute inset-0 -z-10 rounded-[44px] bg-gradient-to-br from-[#fff2e2] via-white to-[#e6fbf7]" />
          <div className="relative flex w-full justify-center">
            <Image
              src={symbol}
              alt="Símbolo de Inglés Rápido Manta"
              priority
              className="w-full max-w-sm drop-shadow-xl"
            />
          </div>
          <div className="flex flex-col items-center gap-3">
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
            className="cta-ripple inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-14 py-6 text-xl font-semibold uppercase tracking-wide text-white shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
          >
            Haz clic aquí para continuar
          </Link>
        </section>
      </main>
    </div>
  );
}
