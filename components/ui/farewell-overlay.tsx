"use client";

import { useEffect, useState } from "react";

type FarewellOverlayProps = {
  message?: string;
  subtitle?: string;
  emoji?: string;
};

export function FarewellOverlay({
  message = "¡Gran trabajo!",
  subtitle = "Nos vemos la próxima vez",
  emoji = "🎉",
}: FarewellOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f172a]/90 backdrop-blur transition-opacity duration-200 ease-out">
      <div
        className={`mx-6 flex max-w-xl flex-col items-center gap-6 rounded-[44px] border border-white/60 bg-white/95 px-12 py-14 text-center shadow-[0_36px_120px_rgba(15,23,42,0.32)] transition-all duration-200 ease-out ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#4ade80] via-[#22d3ee] to-[#6366f1] text-5xl shadow-[0_18px_40px_rgba(37,99,235,0.35)]">
          {emoji}
        </span>
        <div className="space-y-3">
          <p className="text-3xl font-black leading-tight text-brand-deep">
            {message}
          </p>
          <p className="text-base font-semibold uppercase tracking-[0.32em] text-brand-ink-muted">
            {subtitle}
          </p>
        </div>
        <div className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-ink-muted/70">
          Redirigiendo…
        </div>
      </div>
    </div>
  );
}
