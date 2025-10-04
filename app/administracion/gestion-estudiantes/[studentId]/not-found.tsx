import Link from "next/link";

export default function StudentProfileNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-20 text-center text-brand-deep">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-[32px] border border-white/70 bg-white/95 p-10 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-teal-soft text-2xl font-black text-brand-teal">
          ?
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black">Estudiante no encontrado</h1>
          <p className="text-sm text-brand-ink-muted">
            No encontramos un perfil con ese identificador. Verifica el enlace o selecciona un estudiante desde la vista de gestión.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/administracion/gestion-estudiantes"
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
          >
            Ir a gestión de estudiantes
          </Link>
          <Link
            href="/administracion"
            className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:opacity-90 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
          >
            Ir al panel principal
          </Link>
        </div>
      </div>
    </div>
  );
}
