import Link from "next/link";

type ErrorStateProps = {
  title?: string;
  description?: string;
  retryHref: string;
};

export default function ErrorState({
  title = "Error al cargar datos.",
  description = "Intenta nuevamente en unos segundos.",
  retryHref,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-brand-orange/30 bg-white/90 px-6 py-10 text-center shadow-sm">
      <h3 className="text-lg font-semibold text-brand-deep">{title}</h3>
      <p className="max-w-md text-sm text-brand-ink-muted">{description}</p>
      <Link
        href={retryHref}
        className="inline-flex items-center justify-center rounded-full bg-brand-deep px-4 py-2 text-sm font-semibold text-white shadow-sm"
      >
        Reintentar
      </Link>
    </div>
  );
}
