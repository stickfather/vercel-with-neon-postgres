"use client";

import { useEffect } from "react";

type EphemeralToastProps = {
  message: string;
  tone?: "success" | "error";
  duration?: number;
  onDismiss?: () => void;
};

export function EphemeralToast({
  message,
  tone = "success",
  duration = 900,
  onDismiss,
}: EphemeralToastProps) {
  useEffect(() => {
    if (!duration) return undefined;
    const timeout = window.setTimeout(() => {
      onDismiss?.();
    }, duration);
    return () => window.clearTimeout(timeout);
  }, [duration, message, onDismiss]);

  const toneClasses =
    tone === "success"
      ? "bg-brand-teal text-white shadow-[0_18px_40px_rgba(0,191,166,0.35)]"
      : "bg-brand-orange text-white shadow-[0_18px_40px_rgba(255,122,35,0.35)]";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-[80] flex justify-center px-4">
      <div
        role="status"
        aria-live="assertive"
        className={`pointer-events-auto inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold tracking-wide transition ${toneClasses}`}
      >
        <span aria-hidden>{tone === "success" ? "✔" : "!"}</span>
        <span className="tracking-tight">{message}</span>
      </div>
    </div>
  );
}
