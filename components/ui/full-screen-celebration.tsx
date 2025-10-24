"use client";

import { useEffect } from "react";

export type FullScreenCelebrationTone = "success" | "error";

export type FullScreenCelebrationAccent =
  | "party"
  | "sparkles"
  | "thumbs-up"
  | "warning";

type Props = {
  tone: FullScreenCelebrationTone;
  headline: string;
  body?: string;
  accent?: FullScreenCelebrationAccent;
  onDismiss?: () => void;
  autoDismissAfterMs?: number | null;
};

const ACCENT_CONTENT: Record<FullScreenCelebrationAccent, { emoji: string; label: string }> = {
  party: { emoji: "🎉", label: "Celebración" },
  sparkles: { emoji: "✨", label: "Brillo" },
  "thumbs-up": { emoji: "👍", label: "Confirmación" },
  warning: { emoji: "⚠️", label: "Aviso" },
};

export function FullScreenCelebration({
  tone,
  headline,
  body,
  accent = tone === "error" ? "warning" : "party",
  onDismiss,
  autoDismissAfterMs = null,
}: Props) {
  useEffect(() => {
    if (autoDismissAfterMs == null || !onDismiss) {
      return;
    }

    const timeout = setTimeout(onDismiss, autoDismissAfterMs);
    return () => clearTimeout(timeout);
  }, [autoDismissAfterMs, onDismiss]);

  const accentContent = ACCENT_CONTENT[accent] ?? ACCENT_CONTENT.party;
  const toneBackground =
    tone === "error"
      ? "from-[#ffd5cc] via-white/95 to-[#ffe9e2]"
      : "from-[#c7f8f0] via-white/96 to-[#fff4df]";
  const badgeClasses =
    tone === "error"
      ? "bg-[#ffe8df]/85 text-[#b94d2a]"
      : "bg-[#defaf3] text-[#007d6b]";
  const headlineClasses =
    tone === "error" ? "text-3xl font-semibold text-[#b94d2a]" : "text-3xl font-semibold text-brand-deep";
  const bodyClasses =
    tone === "error"
      ? "mt-3 text-sm font-medium text-[#7f3d23]"
      : "mt-3 text-base font-medium text-brand-ink-muted";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(15,23,42,0.55)] px-6 py-6 backdrop-blur-sm">
      <div className={`relative w-full max-w-xl overflow-hidden rounded-[44px] border border-white/85 bg-white/95 p-10 text-center shadow-[0_32px_74px_rgba(15,23,42,0.25)]`}>
        <div className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${toneBackground}`} />
        <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-[32px] bg-white/55 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-0 h-40 w-40 rounded-[40px] bg-white/35 blur-3xl" />
        <div className="relative flex flex-col items-center gap-4">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] ${badgeClasses}`}
            aria-label={accentContent.label}
          >
            <span aria-hidden>{accentContent.emoji}</span>
            {tone === "error" ? "Atención" : "Listo"}
          </span>
          <p className={`${headlineClasses} leading-snug sm:text-[2.1rem]`}>{headline}</p>
          {body ? <p className={`${bodyClasses} max-w-[420px]`}>{body}</p> : null}
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-white/80 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-brand-ink shadow transition hover:-translate-y-[1px] hover:border-brand-teal/70 hover:text-brand-teal focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
            >
              Entendido
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
