import Link from "next/link";
import type { ReactNode } from "react";

type Action = {
  href: string;
  label: string;
  variant?: "primary" | "ghost";
};

type Props = {
  title: string;
  description: string;
  actions?: Action[];
  children?: ReactNode;
};

export function AdminPlaceholder({
  title,
  description,
  actions = [
    { href: "/administracion", label: "Volver al panel", variant: "ghost" },
  ],
  children,
}: Props) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-16 top-24 h-56 w-56 -rotate-[14deg] rounded-[36px] bg-[#ffe9d8] shadow-[0_26px_58px_rgba(15,23,42,0.1)]" />
        <div className="absolute right-10 top-14 h-48 w-48 rotate-[16deg] rounded-[34px] bg-[#e9f2ff] shadow-[0_22px_54px_rgba(15,23,42,0.12)]" />
        <div className="absolute bottom-0 left-1/2 h-[360px] w-[120%] -translate-x-1/2 rounded-t-[140px] bg-gradient-to-r from-[#fff5e9] via-white to-[#def6ef]" />
      </div>
      <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center md:px-10">
        <section className="flex w-full flex-col items-center gap-6 rounded-[44px] border border-white/60 bg-white/90 px-8 py-14 text-brand-deep shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur md:px-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#1e1b32] px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-white">
            Próximamente
          </span>
          <h1 className="text-3xl font-black sm:text-4xl">{title}</h1>
          <p className="max-w-2xl text-base text-brand-ink-muted sm:text-lg">{description}</p>
          {children}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={
                  action.variant === "primary"
                    ? "cta-ripple inline-flex items-center justify-center rounded-full bg-brand-orange px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                    : "inline-flex items-center justify-center rounded-full border border-transparent bg-white/80 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-brand-deep shadow-sm transition hover:border-brand-teal hover:text-brand-teal focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
