import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Panel administrativo · Inglés Rápido Manta",
};

export default function AdministracionPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center md:px-10">
        <div className="flex w-full flex-col items-center gap-6 rounded-[40px] bg-white/85 px-8 py-12 text-brand-deep shadow-2xl backdrop-blur md:px-12">
          <h1 className="text-3xl font-black sm:text-4xl">Panel administrativo</h1>
          <p className="max-w-2xl text-lg text-brand-ink-muted">
            Muy pronto encontrarás aquí las herramientas de gestión para el personal del centro. Mientras tanto, puedes regresar al registro de estudiantes.
          </p>
          <Link
            href="/registro"
            className="inline-flex items-center justify-center rounded-full bg-brand-orange px-8 py-3 text-base font-semibold uppercase tracking-wide text-white shadow transition hover:bg-[#ff6a00] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
          >
            Volver al registro
          </Link>
        </div>
      </main>
    </div>
  );
}
