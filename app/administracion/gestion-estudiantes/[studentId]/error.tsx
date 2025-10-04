"use client";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function StudentProfileError({ error, reset }: ErrorProps) {
  console.error("Student profile route error", error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-20 text-center text-brand-deep">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-[32px] border border-brand-orange/30 bg-white/95 p-8 shadow-[0_24px_58px_rgba(15,23,42,0.12)]">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange/10 text-2xl font-black text-brand-orange">
          !
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black">No pudimos cargar el perfil</h1>
          <p className="text-sm text-brand-ink-muted">
            Hubo un problema al consultar la base de datos. Intenta recargar la página o regresa más tarde.
          </p>
        </div>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
