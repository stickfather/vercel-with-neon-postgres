"use client";

import { useEffect, useState } from "react";

type FarewellOverlayProps = {
  message?: string;
};

export function FarewellOverlay({
  message = "¡Gracias! ¡Nos vemos la próxima vez!",
}: FarewellOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm transition-opacity duration-200 ease-out">
      <div
        className={`mx-6 max-w-xl rounded-[40px] border border-white/60 bg-white/95 px-12 py-12 text-center shadow-[0_32px_80px_rgba(15,23,42,0.24)] transition-all duration-200 ease-out ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <p className="text-3xl font-black leading-tight text-brand-deep">
          {message}
        </p>
        <p className="mt-4 text-base font-semibold uppercase tracking-[0.28em] text-brand-ink-muted">
          Redirigiendo…
        </p>
      </div>
    </div>
  );
}
