import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Paneles gerenciales · Inglés Rápido Manta",
};

export default function AdminManagementReportsPlaceholder() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-white px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold text-brand-ink">Paneles gerenciales</h1>
      <p className="max-w-2xl text-base text-brand-ink/70">
        Estamos rediseñando esta experiencia. Mientras tanto, puedes volver al
        panel principal para continuar con tus tareas.
      </p>
      <Link
        href="/administracion"
        className="inline-flex items-center justify-center rounded-full bg-brand-deep px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep/90"
      >
        Volver a Administración
      </Link>
    </main>
  );
}
